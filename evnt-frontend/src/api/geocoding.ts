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
const cityOsmValues = new Set(["city", "town", "village", "hamlet", "municipality"]);

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

async function searchPhoton(query: string, limit: number, origin?: Coordinates) {
  const params = new URLSearchParams({
    lang: "en",
    limit: String(limit),
    q: query
  });

  if (origin) {
    params.set("lat", String(origin.latitude));
    params.set("lon", String(origin.longitude));
  }

  const response = await fetch(`${photonEndpoint}?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Geocoding request failed");
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
    province: unique(compact([props.state, props.country])).join(", ") || "Mondo"
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
  const city = props.city ?? props.county ?? props.state ?? props.country ?? "";
  const addressParts = unique(compact([streetLine, props.postcode, city, props.state, props.country]));

  return {
    address: addressParts.join(", ") || name,
    city,
    coordinates,
    distanceKm: origin ? distanceBetweenKm(origin, coordinates) : 0,
    name
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
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const features = await searchPhoton(normalized, 12);
  const cityLike = features.filter(isCityLike).map(cityFromFeature).filter((item): item is CitySuggestion => item !== null);
  const fallback = features.map(cityFromFeature).filter((item): item is CitySuggestion => item !== null);

  return dedupeByKey([...cityLike, ...fallback], (item) => `${item.name}-${item.province}`).slice(0, 6);
}

export async function searchPlacesWorldwide(query: string, origin?: Coordinates): Promise<PlaceSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const features = await searchPhoton(normalized, 8, origin);
  return dedupeByKey(
    features.map((feature) => placeFromFeature(feature, origin)).filter((item): item is PlaceSuggestion => item !== null),
    (item) => `${item.name}-${item.address}`
  ).slice(0, 6);
}
