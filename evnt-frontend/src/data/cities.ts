import { type Coordinates } from "../types";
import { placeSuggestions } from "./places";

export type CitySuggestion = {
  coordinates: Coordinates;
  name: string;
  province: string;
};

const seededCities: CitySuggestion[] = [
  {
    coordinates: { latitude: 40.6815, longitude: 14.761 },
    name: "Salerno",
    province: "Campania"
  },
  {
    coordinates: { latitude: 40.7485, longitude: 14.7711 },
    name: "Baronissi",
    province: "Campania"
  },
  {
    coordinates: { latitude: 44.4161, longitude: 8.9525 },
    name: "Genova",
    province: "Liguria"
  },
  {
    coordinates: { latitude: 40.8518, longitude: 14.2681 },
    name: "Napoli",
    province: "Campania"
  },
  {
    coordinates: { latitude: 41.9028, longitude: 12.4964 },
    name: "Roma",
    province: "Lazio"
  },
  {
    coordinates: { latitude: 45.4642, longitude: 9.19 },
    name: "Milano",
    province: "Lombardia"
  }
];

function sameCity(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const citiesFromPlaces = placeSuggestions.reduce<CitySuggestion[]>((acc, place) => {
  if (acc.some((city) => sameCity(city.name, place.city))) {
    return acc;
  }

  acc.push({
    coordinates: place.coordinates,
    name: place.city,
    province: "Italia"
  });
  return acc;
}, []);

export const citySuggestions = [...seededCities, ...citiesFromPlaces]
  .filter((city, index, all) => all.findIndex((item) => sameCity(item.name, city.name)) === index)
  .sort((a, b) => a.name.localeCompare(b.name));

export function findCitySuggestion(city: string): CitySuggestion | undefined {
  return citySuggestions.find((suggestion) => sameCity(suggestion.name, city));
}

export function cityMatches(a: string, b: string) {
  return sameCity(a, b);
}
