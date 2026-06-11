import { cityMatches, findCitySuggestion } from "../../data/cities";
import { distanceBetweenKm } from "../../domain/geo/distance";
import { Coordinates, EventFilterState, EvntEvent, LocationStatus, UserProfile } from "../../types";

export const defaultEventFilters: EventFilterState = {
  categories: [],
  price: "tutti",
  query: "",
  radiusKm: 10
};

export const eventRadiusOptions = [0, 1, 3, 5, 10, 25, 50, 100] as const;

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
  outsideRadiusEvents: EvntEvent[];
  radiusFilterEnabled: boolean;
  radiusCenter: Coordinates;
  showLocationFallbackNotice: boolean;
  usesCityFallback: boolean;
};

export function getFallbackCoordinates(user: UserProfile): Coordinates {
  return user.cityCoordinates ?? findCitySuggestion(user.city)?.coordinates ?? defaultMapCoordinates;
}

export function getActiveEventFilterCount(filters: EventFilterState, radiusFilterEnabled = true) {
  const selectedCategories = filters.categories ?? [];
  return (
    (selectedCategories.length === 0 ? 0 : 1) +
    (filters.price === "tutti" ? 0 : 1) +
    (filters.query.trim() ? 1 : 0) +
    (!radiusFilterEnabled || filters.radiusKm === defaultEventFilters.radiusKm ? 0 : 1)
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
  const radiusFilterEnabled = hasDeviceLocation;
  const radiusCenter = hasDeviceLocation && userCoordinates ? userCoordinates : getFallbackCoordinates(user);
  const normalizedQuery = filters.query.trim().toLowerCase();

  const eventDistances = events.reduce<Record<string, number>>((distances, event) => {
    distances[event.id] = distanceBetweenKm(radiusCenter, event.coordinates);
    return distances;
  }, {});
  const categoryFilter = new Set(filters.categories ?? []);

  const eventsMatchingFilters = events
    .filter((event) => {
      const matchesCategory = categoryFilter.size === 0 || categoryFilter.has(event.category);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.place.toLowerCase().includes(normalizedQuery) ||
        event.address.toLowerCase().includes(normalizedQuery) ||
        event.city.toLowerCase().includes(normalizedQuery) ||
        event.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesPrice =
        filters.price === "tutti" ||
        (filters.price === "gratis" && event.price === 0) ||
        (filters.price === "pagamento" && event.price > 0);
      const matchesFallbackCity = !usesCityFallback || cityMatches(event.city, user.city);

      return matchesCategory && matchesQuery && matchesPrice && matchesFallbackCity;
    });

  const sortEvents = (items: EvntEvent[]) =>
    [...items].sort((a, b) => {
      const distanceDelta = (eventDistances[a.id] ?? a.distanceKm) - (eventDistances[b.id] ?? b.distanceKm);
      if (sort !== "feed") {
        return distanceDelta;
      }

      return b.affinity - a.affinity || distanceDelta;
    });

  const radiusLimited = radiusFilterEnabled && filters.radiusKm > 0;
  const filteredEvents = sortEvents(
    eventsMatchingFilters.filter((event) => {
      const distanceKm = eventDistances[event.id] ?? event.distanceKm;
      return !radiusLimited || distanceKm <= filters.radiusKm;
    })
  );
  const outsideRadiusEvents = radiusLimited
    ? sortEvents(eventsMatchingFilters.filter((event) => (eventDistances[event.id] ?? event.distanceKm) > filters.radiusKm))
    : [];

  return {
    activeFilterCount: getActiveEventFilterCount(filters, radiusFilterEnabled),
    eventDistances,
    filteredEvents,
    hasDeviceLocation,
    outsideRadiusEvents,
    radiusFilterEnabled,
    radiusCenter,
    showLocationFallbackNotice: usesCityFallback && locationStatus !== "loading",
    usesCityFallback
  };
}
