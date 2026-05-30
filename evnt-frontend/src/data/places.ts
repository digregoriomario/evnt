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

export const placeSuggestions: PlaceSuggestion[] = [
  {
    address: "Via Molo Manfredi, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6715, longitude: 14.7537 },
    distanceKm: 1.4,
    name: "Molo Manfredi"
  },
  {
    address: "Via Raffaele Mauri, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6882, longitude: 14.7709 },
    distanceKm: 2.2,
    name: "Campo Europa"
  },
  {
    address: "Largo Campo, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6782, longitude: 14.7589 },
    distanceKm: 0.8,
    name: "Centro storico"
  },
  {
    address: "Piazza Matteo Luciani, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6766, longitude: 14.7531 },
    distanceKm: 1.1,
    name: "Caffe Verdi"
  },
  {
    address: "Via Mercanti 63, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6787, longitude: 14.7562 },
    distanceKm: 0.6,
    name: "Pinacoteca Provinciale"
  },
  {
    address: "Piazza Matteo Luciani 1, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6762, longitude: 14.7515 },
    distanceKm: 1.2,
    name: "Teatro Municipale Giuseppe Verdi"
  },
  {
    address: "Lungomare Trieste, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6743, longitude: 14.7595 },
    distanceKm: 0.9,
    name: "Lungomare Trieste"
  },
  {
    address: "Piazza della Liberta, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6734, longitude: 14.7564 },
    distanceKm: 1.0,
    name: "Piazza della Liberta"
  },
  {
    address: "Via Salvador Allende, Salerno",
    city: "Salerno",
    coordinates: { latitude: 40.6516, longitude: 14.8067 },
    distanceKm: 5.1,
    name: "Stadio Arechi"
  },
  {
    address: "Via Allende, Baronissi",
    city: "Baronissi",
    coordinates: { latitude: 40.7485, longitude: 14.7711 },
    distanceKm: 8.7,
    name: "Fablab Baronissi"
  },
  {
    address: "Via Giovanni de Pra, Genova",
    city: "Genova",
    coordinates: { latitude: 44.4161, longitude: 8.9525 },
    distanceKm: 680,
    name: "Campi Marassi"
  }
];
