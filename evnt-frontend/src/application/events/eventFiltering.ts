import { cityMatches, findCitySuggestion } from "../../data/cities";
import { distanceBetweenKm } from "../../domain/geo/distance";
import { Coordinates, EventFilterState, EvntEvent, LocationStatus, UserProfile } from "../../types";

export const defaultEventFilters: EventFilterState = {
  category: "Tutti",
  price: "tutti",
  query: "",
  radiusKm: 10
};

export const eventRadiusOptions = [1, 3, 5, 10, 25] as const;

export const defaultMapCoordinates: Coordinates = {
  latitude: 40.6815,
  longitude: 14.761
};

type EventFilterSort = "feed" | "none";

type BuildEventFilterResultArgs = {
  events: EvntEvent[];
  filters: EventFilterState;
  locationStatus: LocationStatus;
  sort?: EventFilterSort;
  user: UserProfile;
  userCoordinates: Coordinates | null;
};

export type EventFilterResult = {
  activeFilterCount: number;
  eventDistances: Record<string, number>;
  filteredEvents: EvntEvent[];
  hasDeviceLocation: boolean;
  radiusCenter: Coordinates;
  showLocationFallbackNotice: boolean;
  usesCityFallback: boolean;
};

export function getFallbackCoordinates(user: UserProfile): Coordinates {
  return user.cityCoordinates ?? findCitySuggestion(user.city)?.coordinates ?? defaultMapCoordinates;
}

export function getActiveEventFilterCount(filters: EventFilterState) {
  return (
    (filters.category === "Tutti" ? 0 : 1) +
    (filters.price === "tutti" ? 0 : 1) +
    (filters.query.trim() ? 1 : 0) +
    (filters.radiusKm === defaultEventFilters.radiusKm ? 0 : 1)
  );
}

export function buildEventFilterResult({
  events,
  filters,
  locationStatus,
  sort = "none",
  user,
  userCoordinates
}: BuildEventFilterResultArgs): EventFilterResult {
  const hasDeviceLocation = locationStatus === "granted" && userCoordinates !== null;
  const usesCityFallback = !hasDeviceLocation;
  const radiusCenter = hasDeviceLocation && userCoordinates ? userCoordinates : getFallbackCoordinates(user);
  const normalizedQuery = filters.query.trim().toLowerCase();

  const eventDistances = events.reduce<Record<string, number>>((distances, event) => {
    distances[event.id] = distanceBetweenKm(radiusCenter, event.coordinates);
    return distances;
  }, {});

  const filteredEvents = events
    .filter((event) => {
      const matchesFallbackCity = !usesCityFallback || cityMatches(event.city, user.city);
      const matchesCategory = filters.category === "Tutti" || event.category === filters.category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.place.toLowerCase().includes(normalizedQuery) ||
        event.city.toLowerCase().includes(normalizedQuery);
      const matchesPrice =
        filters.price === "tutti" ||
        (filters.price === "gratis" && event.price === 0) ||
        (filters.price === "pagamento" && event.price > 0);
      const distanceKm = eventDistances[event.id] ?? event.distanceKm;

      return (
        matchesFallbackCity &&
        matchesCategory &&
        matchesQuery &&
        matchesPrice &&
        distanceKm <= filters.radiusKm
      );
    })
    .sort((a, b) => {
      if (sort !== "feed") {
        return 0;
      }

      return b.affinity - a.affinity || (eventDistances[a.id] ?? a.distanceKm) - (eventDistances[b.id] ?? b.distanceKm);
    });

  return {
    activeFilterCount: getActiveEventFilterCount(filters),
    eventDistances,
    filteredEvents,
    hasDeviceLocation,
    radiusCenter,
    showLocationFallbackNotice: usesCityFallback && locationStatus !== "loading",
    usesCityFallback
  };
}
