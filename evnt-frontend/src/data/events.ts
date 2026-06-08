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
