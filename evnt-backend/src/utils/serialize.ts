import { ChatType } from "@prisma/client";

const ITALIAN_MONTHS = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic"
];
const ITALIAN_DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export const chatTypeToLabel = (t: ChatType) =>
  t === "OPEN_GROUP" ? "Gruppo aperto" : "Solo annunci";

export const labelToChatType = (label?: string): ChatType =>
  label === "Solo annunci" ? "ANNOUNCEMENTS" : "OPEN_GROUP";

const formatDateLabel = (d: Date) => {
  const today = new Date();
  const isSameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isSameDay) return "Oggi";
  return `${ITALIAN_DAYS[d.getDay()]} ${d.getDate()} ${ITALIAN_MONTHS[d.getMonth()]}`;
};

const formatTimeLabel = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const subcategoryTagPrefix = "subcategory:";
export const cityTagPrefix = "city:";

export const subcategoryFromTags = (tags: string[]) =>
  tags.find((tag) => tag.startsWith(subcategoryTagPrefix))?.slice(subcategoryTagPrefix.length).trim();

export const cityFromTags = (tags: string[]) =>
  tags.find((tag) => tag.startsWith(cityTagPrefix))?.slice(cityTagPrefix.length).trim();

export const publicEventTags = (tags: string[]) =>
  tags.filter((tag) => !tag.startsWith(subcategoryTagPrefix) && !tag.startsWith(cityTagPrefix));

const cityFromPlace = (place: string) => {
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) return parts[parts.length - 3];
  if (parts.length === 3) return parts[parts.length - 2];
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

export type EventRecord = {
  id: number;
  title: string;
  description: string;
  dateHour: Date;
  place: string;
  latitude: number;
  longitude: number;
  price: unknown; // Prisma.Decimal
  maxSeats: number | null;
  chatType: ChatType;
  isLive: boolean;
  image: string | null;
  tags: string[];
  category: { name: string };
  creator: { name: string };
  _count?: { participations: number };
};

export type SerializeContext = {
  participantCount?: number;
  distanceKm?: number | null;
  favorite?: boolean;
  registered?: boolean;
  affinity?: number;
};

// Maps a DB event into the shape the Expo app expects (EvntEvent).
export const serializeEvent = (e: EventRecord, ctx: SerializeContext = {}) => {
  const participants = ctx.participantCount ?? e._count?.participations ?? 0;
  const capacity = e.maxSeats ?? null;
  const fillRatio = capacity ? participants / capacity : participants / 100;
  const popularity = Math.min(99, Math.round(40 + fillRatio * 59));
  const subcategory = subcategoryFromTags(e.tags);
  const city = cityFromTags(e.tags) ?? cityFromPlace(e.place);

  return {
    id: String(e.id),
    title: e.title,
    category: e.category.name,
    date: formatDateLabel(e.dateHour),
    time: formatTimeLabel(e.dateHour),
    place: e.place,
    city,
    address: e.place,
    price: Number(e.price),
    distanceKm: ctx.distanceKm ?? 0,
    affinity: ctx.affinity ?? 80,
    popularity,
    participants,
    capacity,
    image: e.image ?? "",
    description: e.description,
    organizer: e.creator.name,
    chatMode: chatTypeToLabel(e.chatType),
    tags: publicEventTags(e.tags),
    coordinates: { latitude: e.latitude, longitude: e.longitude },
    dateTimeIso: e.dateHour.toISOString(),
    subcategory: subcategory || undefined,
    favorite: ctx.favorite ?? false,
    registered: ctx.registered ?? false,
    status: e.isLive ? "live" : popularity >= 85 ? "trending" : undefined
  };
};

export const publicUser = (u: {
  id: number;
  email: string;
  name: string;
  bio: string | null;
  city: string | null;
  image: string | null;
  birthday: Date;
  interests?: { interest: { name: string; categories?: { name: string }[] } }[];
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  bio: u.bio ?? "",
  city: u.city ?? "",
  avatar: u.image ?? undefined,
  birthDate: u.birthday.toISOString().slice(0, 10),
  interests:
    u.interests?.flatMap((i) =>
      i.interest.categories?.length
        ? i.interest.categories.map((category) => category.name)
        : [i.interest.name]
    ) ?? []
});
