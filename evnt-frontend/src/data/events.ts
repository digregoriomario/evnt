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

export const subcategoryDefaultImages: Partial<Record<Category, Record<string, string>>> = {
  Arte: {
    Mostra: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80",
    Museo: "https://images.unsplash.com/photo-1545989253-02cc26577f88?auto=format&fit=crop&w=1200&q=80",
    Teatro: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
    Workshop: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80"
  },
  Benessere: {
    Meditazione: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    Mindfulness: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    Pilates: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    Spa: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    "Trekking leggero": "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
    Yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80"
  },
  Cinema: {
    Anteprima: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    "Cinema all'aperto": "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1200&q=80",
    Cineforum: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1200&q=80",
    Documentario: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
    "Maratona film": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80",
    "Serie TV": "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80"
  },
  Concerto: {
    Acustico: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80",
    "DJ set": "https://images.unsplash.com/photo-1571266028243-d220c9c3b5c5?auto=format&fit=crop&w=1200&q=80",
    "Jam session": "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80",
    "Live band": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"
  },
  Food: {
    Cena: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
    Degustazione: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
    "Street food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    Tour: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
  },
  Gaming: {
    Arcade: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
    "E-sport": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    GDR: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    "Giochi da tavolo": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    "LAN party": "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=80",
    "Torneo console": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80"
  },
  Serata: {
    Aperitivo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    Club: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    Dopocena: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
    Karaoke: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80"
  },
  Social: {
    Boardgame: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    Networking: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    "Nuove amicizie": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    Passeggiata: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
  },
  Sport: {
    Basket: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
    "Calcio a 11": "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
    "Calcetto 5v5": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80",
    "Calcetto 8v8": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80",
    Running: "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=1200&q=80"
  },
  Tech: {
    Hackathon: "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=80",
    Meetup: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    "Studio group": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    Workshop: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"
  },
  Viaggi: {
    Escursione: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
    "Gita fuori porta": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    "Road trip": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    "Scambio lingua": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    "Tour citta": "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80",
    Weekend: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80"
  }
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

export function getDefaultEventImage(category: Category, subcategory?: string) {
  return (subcategory ? subcategoryDefaultImages[category]?.[subcategory] : undefined) ?? categoryDefaultImages[category];
}

export function getEventImage(
  event: Pick<EvntEvent, "category" | "description" | "image" | "subcategory" | "tags" | "title">
) {
  return event.image || getDefaultEventImage(event.category, getEventSubcategoryLabel(event));
}
