import { Category, EvntEvent } from "../types";

export const categories: Category[] = [
  "Serata",
  "Sport",
  "Concerto",
  "Food",
  "Social",
  "Arte",
  "Tech"
];

export const categoryColors: Record<Category, string> = {
  Serata: "#7C3AED",
  Sport: "#16A34A",
  Concerto: "#DC2626",
  Food: "#EA580C",
  Social: "#0891B2",
  Arte: "#C026D3",
  Tech: "#2563EB"
};

export const categorySoftColors: Record<Category, string> = {
  Serata: "#F5EDFF",
  Sport: "#ECFDF3",
  Concerto: "#FFF0F0",
  Food: "#FFF4E8",
  Social: "#EAFBFF",
  Arte: "#FDF0FF",
  Tech: "#EEF5FF"
};

export const categoryEmojis: Record<Category, string> = {
  Serata: "🌙",
  Sport: "⚽",
  Concerto: "🎸",
  Food: "🍔",
  Social: "🤝",
  Arte: "🎨",
  Tech: "💻"
};

export const initialEvents: EvntEvent[] = [
  {
    id: "sunset-jam",
    title: "Sunset Jam al Molo",
    category: "Concerto",
    date: "Ven 29 mag",
    time: "20:30",
    place: "Molo Manfredi",
    city: "Salerno",
    address: "Via Molo Manfredi, Salerno",
    price: 8,
    distanceKm: 1.4,
    affinity: 96,
    popularity: 88,
    participants: 74,
    capacity: 120,
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    description:
      "Una jam session vista mare con band emergenti, area relax e canale chat per organizzarsi prima dell'ingresso.",
    organizer: "Officina Sonora",
    chatMode: "Gruppo aperto",
    tags: ["live", "mare", "indie"],
    coordinates: { latitude: 40.6715, longitude: 14.7537 },
    status: "trending"
  },
  {
    id: "calcetto-lampo",
    title: "Calcetto lampo 5vs5",
    category: "Sport",
    date: "Oggi",
    time: "19:00",
    place: "Campo Europa",
    city: "Salerno",
    address: "Via Raffaele Mauri, Salerno",
    price: 6,
    distanceKm: 2.2,
    affinity: 90,
    popularity: 72,
    participants: 8,
    capacity: 10,
    image:
      "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Partita veloce per completare due squadre equilibrate. La quota campo si divide in app al momento dell'adesione.",
    organizer: "Antonio R.",
    chatMode: "Gruppo aperto",
    tags: ["5vs5", "sera", "amatoriale"],
    coordinates: { latitude: 40.6882, longitude: 14.7709 },
    status: "live"
  },
  {
    id: "street-food",
    title: "Street Food Tour",
    category: "Food",
    date: "Sab 30 mag",
    time: "18:15",
    place: "Centro storico",
    city: "Salerno",
    address: "Largo Campo, Salerno",
    price: 0,
    distanceKm: 0.8,
    affinity: 87,
    popularity: 93,
    participants: 31,
    capacity: 45,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    description:
      "Passeggiata tra locali indipendenti, assaggi liberi e tappe consigliate dalla community.",
    organizer: "Food Walk Salerno",
    chatMode: "Solo annunci",
    tags: ["gratis", "local", "tour"],
    coordinates: { latitude: 40.6782, longitude: 14.7589 }
  },
  {
    id: "boardgame-cafe",
    title: "Boardgame Night",
    category: "Social",
    date: "Dom 31 mag",
    time: "21:00",
    place: "Caffe Verdi",
    city: "Salerno",
    address: "Piazza Matteo Luciani, Salerno",
    price: 4,
    distanceKm: 1.1,
    affinity: 79,
    popularity: 65,
    participants: 18,
    capacity: 24,
    image:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    description:
      "Tavoli misti, giochi rapidi e una chat aperta per scegliere il primo titolo prima di arrivare.",
    organizer: "Community Evnt",
    chatMode: "Gruppo aperto",
    tags: ["boardgame", "nuove amicizie"],
    coordinates: { latitude: 40.6766, longitude: 14.7531 }
  },
  {
    id: "notte-museo",
    title: "Notte al Museo",
    category: "Arte",
    date: "Mar 2 giu",
    time: "20:00",
    place: "Pinacoteca Provinciale",
    city: "Salerno",
    address: "Via Mercanti 63, Salerno",
    price: 5,
    distanceKm: 0.6,
    affinity: 73,
    popularity: 77,
    participants: 42,
    capacity: 60,
    image:
      "https://images.unsplash.com/photo-1545989253-02cc26577f88?auto=format&fit=crop&w=1200&q=80",
    description:
      "Percorso serale con guida breve, gruppo ristretto e reminder automatico un'ora prima.",
    organizer: "Musei in Rete",
    chatMode: "Solo annunci",
    tags: ["cultura", "sera"],
    coordinates: { latitude: 40.6787, longitude: 14.7562 }
  },
  {
    id: "hack-casual",
    title: "Hack Casual: app utili",
    category: "Tech",
    date: "Gio 4 giu",
    time: "17:30",
    place: "Fablab Baronissi",
    city: "Baronissi",
    address: "Via Allende, Baronissi",
    price: 0,
    distanceKm: 8.7,
    affinity: 68,
    popularity: 54,
    participants: 16,
    capacity: 30,
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    description:
      "Mini laboratorio pratico per prototipare strumenti digitali utili al territorio.",
    organizer: "Fablab UniSA",
    chatMode: "Gruppo aperto",
    tags: ["workshop", "gratis"],
    coordinates: { latitude: 40.7485, longitude: 14.7711 }
  }
];
