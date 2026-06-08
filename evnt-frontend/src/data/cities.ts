import { type Coordinates } from "../types";

export type CitySuggestion = {
  coordinates: Coordinates;
  name: string;
  province: string;
};

function sameCity(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export const citySuggestions: CitySuggestion[] = [];

export function findCitySuggestion(city: string): CitySuggestion | undefined {
  return citySuggestions.find((suggestion) => sameCity(suggestion.name, city));
}

export function cityMatches(a: string, b: string) {
  return sameCity(a, b);
}
