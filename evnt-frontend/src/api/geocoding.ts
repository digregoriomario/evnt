import type { CitySuggestion } from "../data/cities";
import type { PlaceSuggestion } from "../data/places";
import type { Coordinates } from "../types";
import { distanceBetweenKm } from "../domain/geo/distance";

export { distanceBetweenKm };

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    city?: string;
    country?: string;
    countrycode?: string;
    county?: string;
    district?: string;
    housenumber?: string;
    name?: string;
    osm_key?: string;
    osm_value?: string;
    postcode?: string;
    state?: string;
    street?: string;
    type?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

const photonEndpoint = "https://photon.komoot.io/api/";
const photonReverseEndpoint = "https://photon.komoot.io/reverse";
const cityOsmValues = new Set(["city", "town", "village", "hamlet", "municipality"]);
const cityOsmTags = [...cityOsmValues].map((value) => `place:${value}`);
const italyBoundingBox = {
  maxLatitude: 47.1,
  maxLongitude: 18.99,
  minLatitude: 35.49,
  minLongitude: 6.62
};

function compact(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
}

function unique(parts: string[]) {
  return parts.filter((part, index) => parts.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index);
}

function coordinatesFromFeature(feature: PhotonFeature): Coordinates | null {
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

function isWithinItalyBounds(coordinates: Coordinates) {
  return (
    coordinates.latitude >= italyBoundingBox.minLatitude &&
    coordinates.latitude <= italyBoundingBox.maxLatitude &&
    coordinates.longitude >= italyBoundingBox.minLongitude &&
    coordinates.longitude <= italyBoundingBox.maxLongitude
  );
}

function isItalyCountry(country?: string) {
  const normalized = country?.trim().toLowerCase();
  return normalized === "italia" || normalized === "italy";
}

function isItalyCountryCode(countryCode?: string) {
  return countryCode?.trim().toUpperCase() === "IT";
}

function isFeatureInItaly(feature: PhotonFeature) {
  const props = feature.properties ?? {};
  const coordinates = coordinatesFromFeature(feature);
  return Boolean(
    coordinates &&
      isWithinItalyBounds(coordinates) &&
      (isItalyCountryCode(props.countrycode) || isItalyCountry(props.country))
  );
}

type PhotonSearchOptions = {
  origin?: Coordinates;
  osmTags?: string[];
};

async function searchPhoton(query: string, limit: number, options: PhotonSearchOptions = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    q: query
  });

  params.set(
    "bbox",
    [
      italyBoundingBox.minLongitude,
      italyBoundingBox.minLatitude,
      italyBoundingBox.maxLongitude,
      italyBoundingBox.maxLatitude
    ].join(",")
  );

  if (options.origin && isWithinItalyBounds(options.origin)) {
    params.set("lat", String(options.origin.latitude));
    params.set("lon", String(options.origin.longitude));
  }

  options.osmTags?.forEach((tag) => params.append("osm_tag", tag));

  const response = await fetch(`${photonEndpoint}?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Geocoding request failed");
  }

  const payload = (await response.json()) as PhotonResponse;
  return payload.features ?? [];
}

async function reversePhoton(coordinates: Coordinates, limit = 5) {
  const params = new URLSearchParams({
    lat: String(coordinates.latitude),
    limit: String(limit),
    lon: String(coordinates.longitude)
  });

  const response = await fetch(`${photonReverseEndpoint}?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding request failed");
  }

  const payload = (await response.json()) as PhotonResponse;
  return payload.features ?? [];
}

function cityFromFeature(feature: PhotonFeature): CitySuggestion | null {
  const props = feature.properties ?? {};
  const coordinates = coordinatesFromFeature(feature);
  const name = props.name ?? props.city ?? props.county ?? props.state;
  if (!coordinates || !name) {
    return null;
  }

  return {
    coordinates,
    name,
    province: unique(compact([props.county, props.state, props.country])).join(", ") || "Italia"
  };
}

function placeFromFeature(feature: PhotonFeature, origin?: Coordinates): PlaceSuggestion | null {
  const props = feature.properties ?? {};
  const coordinates = coordinatesFromFeature(feature);
  const name = props.name ?? props.street ?? props.city ?? props.county;
  if (!coordinates || !name) {
    return null;
  }

  const streetLine = compact([props.street, props.housenumber]).join(" ");
  const primaryAddressLine = streetLine || props.name;
  const city = props.city ?? props.county ?? props.state ?? "";
  const province = props.county;
  const region = props.state;
  const countryCode = props.countrycode?.toUpperCase() ?? "IT";
  const addressParts = unique(compact([primaryAddressLine, props.postcode, city, province, region, props.country]));

  return {
    address: addressParts.join(", ") || name,
    city,
    countryCode,
    coordinates,
    distanceKm: origin ? distanceBetweenKm(origin, coordinates) : 0,
    name,
    postcode: props.postcode,
    province,
    region
  };
}

function dedupeByKey<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFor(item).toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isCityLike(feature: PhotonFeature) {
  const props = feature.properties ?? {};
  return props.osm_key === "place" && Boolean(props.osm_value && cityOsmValues.has(props.osm_value));
}

export async function searchCitiesWorldwide(query: string): Promise<CitySuggestion[]> {
  return searchItalianCities(query);
}

export async function searchItalianCities(query: string): Promise<CitySuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const features = await searchPhoton(normalized, 24, { osmTags: cityOsmTags });
  const cityLike = features
    .filter((feature) => isFeatureInItaly(feature) && isCityLike(feature))
    .map(cityFromFeature)
    .filter((item): item is CitySuggestion => item !== null);

  return dedupeByKey(cityLike, (item) => `${item.name}-${item.province}`).slice(0, 8);
}

export async function searchPlacesWorldwide(query: string, origin?: Coordinates): Promise<PlaceSuggestion[]> {
  return searchItalianPlaces(query, origin);
}

export async function searchItalianPlaces(query: string, origin?: Coordinates): Promise<PlaceSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const features = await searchPhoton(normalized, 24, { origin });
  return dedupeByKey(
    features
      .filter(isFeatureInItaly)
      .map((feature) => placeFromFeature(feature, origin))
      .filter((item): item is PlaceSuggestion => item !== null),
    (item) => `${item.name}-${item.address}`
  ).slice(0, 8);
}

export async function reverseGeocodeItalianPlace(
  coordinates: Coordinates,
  origin?: Coordinates
): Promise<PlaceSuggestion | null> {
  if (!isWithinItalyBounds(coordinates)) {
    return null;
  }

  const features = await reversePhoton(coordinates, 5);
  const [place] = features
    .filter(isFeatureInItaly)
    .map((feature) => placeFromFeature(feature, origin))
    .filter((item): item is PlaceSuggestion => item !== null);

  return place ?? null;
}
