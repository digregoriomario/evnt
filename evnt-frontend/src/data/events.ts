import { Category, EvntEvent } from "../types";

export const categories: Category[] = [
  "Serata",
  "Sport",
  "Concerto",
  "Food",
  "Social",
  "Arte",
  "Tech",
  "Benessere",
  "Viaggi",
  "Gaming",
  "Cinema"
];

export const categoryColors: Record<Category, string> = {
  Serata: "#7C3AED",
  Sport: "#16A34A",
  Concerto: "#DC2626",
  Food: "#EA580C",
  Social: "#0891B2",
  Arte: "#C026D3",
  Tech: "#2563EB",
  Benessere: "#0D9488",
  Viaggi: "#0284C7",
  Gaming: "#4F46E5",
  Cinema: "#BE123C"
};

export const categorySoftColors: Record<Category, string> = {
  Serata: "#F5EDFF",
  Sport: "#ECFDF3",
  Concerto: "#FFF0F0",
  Food: "#FFF4E8",
  Social: "#EAFBFF",
  Arte: "#FDF0FF",
  Tech: "#EEF5FF",
  Benessere: "#ECFEFF",
  Viaggi: "#E0F2FE",
  Gaming: "#EEF2FF",
  Cinema: "#FFF1F2"
};

export const categoryEmojis: Record<Category, string> = {
  Serata: "🌙",
  Sport: "⚽",
  Concerto: "🎸",
  Food: "🍔",
  Social: "🤝",
  Arte: "🎨",
  Tech: "💻",
  Benessere: "🧘",
  Viaggi: "🧳",
  Gaming: "🎮",
  Cinema: "🎬"
};

export const categoryDefaultImages: Record<Category, string> = {
  Serata: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  Sport: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
  Concerto: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
  Food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  Social: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
  Arte: "https://images.unsplash.com/photo-1545989253-02cc26577f88?auto=format&fit=crop&w=1200&q=80",
  Tech: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
  Benessere: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
  Viaggi: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  Gaming: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  Cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80"
};

export const eventSubcategories: Record<Category, string[]> = {
  Serata: ["Aperitivo", "Dopocena", "Club", "Karaoke"],
  Sport: ["Calcetto 5v5", "Calcetto 8v8", "Calcio a 11", "Basket", "Running"],
  Concerto: ["Live band", "DJ set", "Jam session", "Acustico"],
  Food: ["Street food", "Cena", "Degustazione", "Tour"],
  Social: ["Boardgame", "Networking", "Passeggiata", "Nuove amicizie"],
  Arte: ["Museo", "Mostra", "Teatro", "Workshop"],
  Tech: ["Hackathon", "Workshop", "Meetup", "Studio group"],
  Benessere: ["Yoga", "Pilates", "Meditazione", "Mindfulness", "Spa", "Trekking leggero"],
  Viaggi: ["Gita fuori porta", "Weekend", "Road trip", "Tour citta", "Escursione", "Scambio lingua"],
  Gaming: ["Torneo console", "LAN party", "GDR", "E-sport", "Arcade", "Giochi da tavolo"],
  Cinema: ["Cineforum", "Anteprima", "Maratona film", "Cinema all'aperto", "Documentario", "Serie TV"]
};

const subcategoryAliases: Partial<Record<Category, Record<string, string[]>>> = {
  Arte: {
    Museo: ["museo", "pinacoteca"]
  },
  Concerto: {
    "Live band": ["live", "band", "jam"],
    "DJ set": ["dj"]
  },
  Food: {
    "Street food": ["street food", "food tour"]
  },
  Gaming: {
    "Giochi da tavolo": ["boardgame", "giochi tavolo"],
    "Torneo console": ["torneo console", "playstation", "xbox", "switch"]
  },
  Sport: {
    "Calcetto 5v5": ["5v5", "5vs5"],
    "Calcetto 8v8": ["8v8", "8vs8"],
    "Calcio a 11": ["calcio a 11", "11v11", "11vs11"]
  },
  Tech: {
    Workshop: ["workshop", "lab", "laboratorio"]
  },
  Viaggi: {
    "Gita fuori porta": ["gita", "fuori porta"],
    "Scambio lingua": ["language exchange", "scambio lingua"]
  }
};

function normalizeSubcategoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/vs/g, "v")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getEventSubcategoryLabel(
  event: Pick<EvntEvent, "category" | "description" | "subcategory" | "tags" | "title">
) {
  if (event.subcategory) {
    return event.subcategory;
  }

  const source = normalizeSubcategoryText(`${event.title} ${event.description} ${event.tags.join(" ")}`);
  const candidates = eventSubcategories[event.category];

  return (
    candidates.find((label) => {
      const normalizedLabel = normalizeSubcategoryText(label);
      const aliases = [
        normalizedLabel,
        ...(subcategoryAliases[event.category]?.[label] ?? []).map(normalizeSubcategoryText)
      ];

      return aliases.some((alias) => {
        const tokens = alias.split(" ").filter((token) => token.length > 1);
        return source.includes(alias) || tokens.every((token) => source.includes(token));
      });
    }) ?? event.category
  );
}

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
    subcategory: "Live band",
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
    subcategory: "Calcetto 5v5",
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
    coordinates: { latitude: 40.6782, longitude: 14.7589 },
    subcategory: "Street food"
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
    coordinates: { latitude: 40.6766, longitude: 14.7531 },
    subcategory: "Boardgame"
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
    coordinates: { latitude: 40.6787, longitude: 14.7562 },
    subcategory: "Museo"
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
    coordinates: { latitude: 40.7485, longitude: 14.7711 },
    subcategory: "Workshop"
  }
];
