export type PlaceSuggestion = {
  address: string;
  city: string;
  countryCode?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distanceKm: number;
  name: string;
  postcode?: string;
  province?: string;
  region?: string;
};

export const placeSuggestions: PlaceSuggestion[] = [];
