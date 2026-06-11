export type Category =
  | "Serata"
  | "Sport"
  | "Concerto"
  | "Food"
  | "Social"
  | "Arte"
  | "Tech"
  | "Benessere"
  | "Viaggi"
  | "Gaming"
  | "Cinema";

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
  province?: string;
  region?: string;
  postcode?: string;
  countryCode?: string;
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
  dateTimeIso?: string;
  creatorCountsAsParticipant?: boolean;
  status?: "live" | "trending" | "cancelled";
  subcategory?: string;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationStatus = "loading" | "granted" | "denied" | "unavailable";

export type PriceFilter = "tutti" | "gratis" | "pagamento";

export type EventFilterState = {
  category: Category | "Tutti";
  price: PriceFilter;
  query: string;
  radiusKm: number;
};

export type UserProfile = {
  id?: number;
  avatar?: string;
  name: string;
  email: string;
  city: string;
  cityCoordinates?: Coordinates;
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
