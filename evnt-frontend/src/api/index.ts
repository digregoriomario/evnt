import { EvntEvent, UserProfile } from "../types";
import { apiRequest, setAuthToken } from "./client";

export * from "./client";
export * from "./config";

// The backend serializes events directly into the EvntEvent shape and adds
// per-user flags. We extend EvntEvent with those flags.
export type ApiEvent = EvntEvent & { favorite?: boolean; registered?: boolean };

export type AuthResponse = { token: string; user: UserProfile & { id: number } };

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  city: string;
  bio?: string;
  image?: string;
  interests?: string[];
};

export type EventFilters = {
  category?: string;
  q?: string;
  maxPrice?: number;
  sort?: "affinity" | "distance" | "price" | "popularity" | "date";
  lat?: number;
  lng?: number;
};

export type CreateEventPayload = {
  title: string;
  description: string;
  dateHour: string; // ISO
  place: string;
  latitude: number;
  longitude: number;
  price: number;
  maxSeats?: number | null;
  category: string;
  chatMode?: string;
  countCreator?: boolean;
  image?: string;
  tags?: string[];
  isLive?: boolean;
  subcategory?: string;
};

export type ChatMessage = {
  id: number;
  eventId: number;
  text: string;
  sentAt: string;
  sender: { id: number; email?: string; name: string; image?: string };
};

export type UserSearchResult = {
  id: number;
  email: string;
  name: string;
  city: string;
  avatar?: string;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function toQuery(filters?: EventFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // ---- Auth ----
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false
    });
    setAuthToken(res.token);
    return res;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false
    });
    setAuthToken(res.token);
    return res;
  },
  async emailAvailable(email: string): Promise<boolean> {
    const params = new URLSearchParams({ email });
    const { available } = await apiRequest<{ available: boolean }>(
      `/auth/email-available?${params.toString()}`,
      { auth: false }
    );
    return available;
  },
  async me(): Promise<UserProfile & { id: number }> {
    const { user } = await apiRequest<{ user: UserProfile & { id: number } }>("/auth/me");
    return user;
  },
  logout() {
    setAuthToken(null);
  },

  // ---- Catalog ----
  async interests(): Promise<{ id: number; name: string }[]> {
    const { interests } = await apiRequest<{ interests: { id: number; name: string }[] }>(
      "/catalog/interests",
      { auth: false }
    );
    return interests;
  },
  async categories(): Promise<{ id: number; name: string; icon: string; interest: string }[]> {
    const { categories } = await apiRequest<{
      categories: { id: number; name: string; icon: string; interest: string }[];
    }>("/catalog/categories", { auth: false });
    return categories;
  },

  // ---- Events ----
  async listEvents(filters?: EventFilters): Promise<ApiEvent[]> {
    const { events } = await apiRequest<{ events: ApiEvent[] }>(`/events${toQuery(filters)}`);
    return events;
  },
  async getEvent(id: string): Promise<ApiEvent> {
    const { event } = await apiRequest<{ event: ApiEvent }>(`/events/${id}`);
    return event;
  },
  async createEvent(payload: CreateEventPayload): Promise<ApiEvent> {
    const { event } = await apiRequest<{ event: ApiEvent }>("/events", {
      method: "POST",
      body: payload
    });
    return event;
  },
  updateEvent(id: string, payload: Partial<CreateEventPayload>) {
    return apiRequest<{ event: ApiEvent }>(`/events/${id}`, { method: "PUT", body: payload });
  },
  deleteEvent(id: string) {
    return apiRequest<void>(`/events/${id}`, { method: "DELETE" });
  },
  join(id: string) {
    return apiRequest<{ registered: boolean; participants: number }>(`/events/${id}/join`, {
      method: "POST"
    });
  },
  leave(id: string) {
    return apiRequest<{ registered: boolean; participants: number }>(`/events/${id}/join`, {
      method: "DELETE"
    });
  },
  bookmark(id: string) {
    return apiRequest<{ favorite: boolean }>(`/events/${id}/bookmark`, { method: "POST" });
  },
  unbookmark(id: string) {
    return apiRequest<{ favorite: boolean }>(`/events/${id}/bookmark`, { method: "DELETE" });
  },

  // ---- Chat ----
  async messages(eventId: string): Promise<ChatMessage[]> {
    const { messages } = await apiRequest<{ messages: ChatMessage[] }>(`/events/${eventId}/messages`);
    return messages;
  },
  async sendMessage(eventId: string, text: string): Promise<ChatMessage> {
    const { message } = await apiRequest<{ message: ChatMessage }>(`/events/${eventId}/messages`, {
      method: "POST",
      body: { text }
    });
    return message;
  },

  // ---- Me ----
  myEvents: () => apiRequest<{ events: ApiEvent[] }>("/me/events").then((r) => r.events),
  myBookmarks: () => apiRequest<{ events: ApiEvent[] }>("/me/bookmarks").then((r) => r.events),
  myParticipations: () =>
    apiRequest<{ events: ApiEvent[] }>("/me/participations").then((r) => r.events),
  updateProfile: (payload: Partial<RegisterPayload>) =>
    apiRequest<{ user: UserProfile & { id: number } }>("/me", { method: "PUT", body: payload }).then(
      (r) => r.user
    ),

  searchUserByEmail: (email: string) => {
    const params = new URLSearchParams({ email });
    return apiRequest<{ user: UserSearchResult | null }>(`/users/search?${params.toString()}`).then(
      (r) => r.user
    );
  },

  // ---- Notifications ----
  notifications: () =>
    apiRequest<{ notifications: Notification[] }>("/notifications").then((r) => r.notifications),
  markRead: (id: number) => apiRequest<void>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => apiRequest<void>("/notifications/read-all", { method: "POST" })
};
