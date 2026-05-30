export type Category =
  | "Serata"
  | "Sport"
  | "Concerto"
  | "Food"
  | "Social"
  | "Arte"
  | "Tech";

export type ChatMode = "Gruppo aperto" | "Solo annunci";

export type EvntEvent = {
  id: string;
  title: string;
  category: Category;
  date: string;
  time: string;
  place: string;
  city: string;
  address: string;
  price: number;
  distanceKm: number;
  affinity: number;
  popularity: number;
  participants: number;
  capacity: number | null;
  image: string;
  description: string;
  organizer: string;
  chatMode: ChatMode;
  tags: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status?: "live" | "trending";
};

export type UserProfile = {
  avatar?: string;
  name: string;
  email: string;
  city: string;
  birthDate: string;
  bio: string;
  interests: Category[];
};

export type ScreenKey =
  | "auth"
  | "home"
  | "map"
  | "create"
  | "inbox"
  | "profile"
  | "detail";
