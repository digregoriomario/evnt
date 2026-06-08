export type PlaceSuggestion = {
  address: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distanceKm: number;
  name: string;
};

export const placeSuggestions: PlaceSuggestion[] = [];
