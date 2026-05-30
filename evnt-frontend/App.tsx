import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, View } from "react-native";

import { BottomNav } from "./src/components/BottomNav";
import { GluestackUIProvider } from "./src/components/ui";
import { initialEvents } from "./src/data/events";
import { AuthScreen, type AuthResult } from "./src/screens/AuthScreen";
import { CreateEventScreen } from "./src/screens/CreateEventScreen";
import { EventDetailScreen } from "./src/screens/EventDetailScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme";
import { EvntEvent, ScreenKey, UserProfile } from "./src/types";
import { api, ApiError, isBackendReachable, type ApiEvent } from "./src/api";

const mainScreens: ScreenKey[] = ["home", "map", "create", "inbox", "profile"];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EvntEvent[]>(initialEvents);
  const [screen, setScreen] = useState<ScreenKey>("auth");
  const [previousScreen, setPreviousScreen] = useState<ScreenKey>("home");
  const [selectedEventId, setSelectedEventId] = useState(initialEvents[0]?.id);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["sunset-jam", "street-food"]));
  const [registrations, setRegistrations] = useState<Set<string>>(new Set(["calcetto-lampo"]));
  const [online, setOnline] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );

  const activeMainScreen = mainScreens.includes(screen) ? screen : previousScreen;
  const showBottomNav = user !== null && mainScreens.includes(screen);

  const navigate = (nextScreen: ScreenKey) => {
    if (mainScreens.includes(nextScreen)) {
      setPreviousScreen(nextScreen);
    }
    setScreen(nextScreen);
  };

  const openEvent = (event: EvntEvent) => {
    setSelectedEventId(event.id);
    if (mainScreens.includes(screen)) {
      setPreviousScreen(screen);
    }
    setScreen("detail");
  };

  const openInbox = () => {
    if (mainScreens.includes(screen)) {
      setPreviousScreen(screen);
    }
    setScreen("inbox");
  };

  const toggleFavorite = (eventId: string) => {
    const willFavorite = !favorites.has(eventId);
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
    if (online) {
      (willFavorite ? api.bookmark(eventId) : api.unbookmark(eventId)).catch(() => undefined);
    }
  };

  const toggleRegistration = (eventId: string) => {
    const joining = !registrations.has(eventId);
    setRegistrations((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? { ...event, participants: Math.max(0, event.participants + (joining ? 1 : -1)) }
          : event
      )
    );
    if (online) {
      (joining ? api.join(eventId) : api.leave(eventId)).catch(() => undefined);
    }
  };

  const createEvent = (event: EvntEvent) => {
    setEvents((current) => [event, ...current]);
    setRegistrations((current) => new Set(current).add(event.id));
    setSelectedEventId(event.id);
    setPreviousScreen("create");
    setScreen("detail");
    if (online) {
      api
        .createEvent({
          title: event.title,
          description: event.description,
          dateHour: new Date().toISOString(),
          place: event.address || event.place,
          latitude: event.coordinates.latitude,
          longitude: event.coordinates.longitude,
          price: event.price,
          maxSeats: event.capacity ?? null,
          category: event.category,
          chatMode: event.chatMode,
          image: event.image || undefined,
          tags: event.tags
        })
        .catch(() => undefined);
    }
  };

  const logout = () => {
    api.logout();
    setOnline(false);
    setUser(null);
    setScreen("auth");
    setPreviousScreen("home");
  };

  // Loads live events from the backend and derives favorites/registrations.
  const hydrateFromApi = async () => {
    try {
      const remote: ApiEvent[] = await api.listEvents();
      if (remote.length) {
        setEvents(remote);
        setSelectedEventId(remote[0].id);
        setFavorites(new Set(remote.filter((e) => e.favorite).map((e) => e.id)));
        setRegistrations(new Set(remote.filter((e) => e.registered).map((e) => e.id)));
      }
    } catch {
      // keep mock data already in state
    }
  };

  // Real auth against the backend: failed login/register keeps the user on auth.
  const handleAuthComplete = async (
    profile: UserProfile,
    credentials?: { mode: "login" | "signup"; password: string }
  ): Promise<AuthResult> => {
    if (!credentials) {
      setUser(profile);
      setScreen("home");
      setPreviousScreen("home");
      return { ok: true };
    }

    const reachable = await isBackendReachable();
    if (!reachable) {
      setOnline(false);
      return {
        ok: false,
        message: "Backend non raggiungibile. Avvia il server e riprova."
      };
    }

    try {
      const res =
        credentials.mode === "signup"
          ? await api.register({
              email: profile.email,
              password: credentials.password,
              name: profile.name,
              birthDate: profile.birthDate,
              city: profile.city,
              bio: profile.bio,
              image: profile.avatar,
              interests: profile.interests
            })
          : await api.login(profile.email, credentials.password);
      setUser({ ...profile, ...res.user });
      setOnline(true);
      setScreen("home");
      setPreviousScreen("home");
      await hydrateFromApi();
      return { ok: true };
    } catch (error) {
      setOnline(false);
      const message =
        error instanceof ApiError
          ? error.message
          : "Credenziali non valide o registrazione non completata.";
      return { ok: false, message };
    }
  };

  const renderScreen = () => {
    if (!user) {
      return (
        <AuthScreen onComplete={handleAuthComplete} />
      );
    }

    if (screen === "detail" && selectedEvent) {
      return (
        <EventDetailScreen
          event={selectedEvent}
          favorite={favorites.has(selectedEvent.id)}
          onBack={() => setScreen(previousScreen)}
          onOpenInbox={openInbox}
          onToggleFavorite={() => toggleFavorite(selectedEvent.id)}
          onToggleRegistration={() => toggleRegistration(selectedEvent.id)}
          registered={registrations.has(selectedEvent.id)}
        />
      );
    }

    if (screen === "inbox") {
      return (
        <InboxScreen
          events={events}
          onOpenEvent={openEvent}
        />
      );
    }

    if (screen === "map") {
      return (
        <MapScreen
          events={events}
          favorites={favorites}
          onOpenEvent={openEvent}
          onToggleFavorite={toggleFavorite}
          registrations={registrations}
        />
      );
    }

    if (screen === "create") {
      return <CreateEventScreen onCreate={createEvent} user={user} />;
    }

    if (screen === "profile") {
      return (
        <ProfileScreen
          createdCount={events.filter((event) => event.organizer === user.name).length}
          events={events}
          favorites={favorites}
          onLogout={logout}
          onOpenEvent={openEvent}
          onToggleFavorite={toggleFavorite}
          registrations={registrations}
          user={user}
        />
      );
    }

    return (
      <HomeScreen
        events={events}
        favorites={favorites}
        onOpenEvent={openEvent}
        onToggleFavorite={toggleFavorite}
        registrations={registrations}
        user={user}
      />
    );
  };

  return (
    <GluestackUIProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.appFrame}>
          <View style={styles.content}>{renderScreen()}</View>
          {showBottomNav && <BottomNav active={activeMainScreen} onChange={navigate} />}
        </View>
      </SafeAreaView>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  appFrame: {
    alignSelf: "center",
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    width: "100%"
  },
  content: {
    flex: 1
  }
});
