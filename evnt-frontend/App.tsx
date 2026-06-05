import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "./src/components/BottomNav";
import { ToastBanner, type ToastTone } from "./src/components/ToastBanner";
import { GluestackUIProvider } from "./src/components/ui";
import { initialEvents } from "./src/data/events";
import { AuthScreen, type AuthResult } from "./src/screens/AuthScreen";
import { CreateEventScreen } from "./src/screens/CreateEventScreen";
import { EventDetailScreen } from "./src/screens/EventDetailScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "./src/session";
import { colors, spacing } from "./src/theme";
import { Coordinates, EvntEvent, LocationStatus, ScreenKey, UserProfile } from "./src/types";
import {
  api,
  ApiError,
  getActiveApiBaseUrl,
  getAuthToken,
  isBackendReachable,
  setAuthToken,
  type ApiEvent,
  type CreateEventPayload
} from "./src/api";
import { searchCitiesWorldwide } from "./src/api/geocoding";

const mainScreens: ScreenKey[] = ["home", "map", "create", "inbox", "profile"];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [events, setEvents] = useState<EvntEvent[]>(initialEvents);
  const [screen, setScreen] = useState<ScreenKey>("auth");
  const [previousScreen, setPreviousScreen] = useState<ScreenKey>("home");
  const [selectedEventId, setSelectedEventId] = useState(initialEvents[0]?.id);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["sunset-jam", "street-food"]));
  const [registrations, setRegistrations] = useState<Set<string>>(new Set(["calcetto-lampo"]));
  const [online, setOnline] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [initialChatEventId, setInitialChatEventId] = useState<string | undefined>();
  const [editingEventId, setEditingEventId] = useState<string | undefined>();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );

  const activeMainScreen = mainScreens.includes(screen) ? screen : previousScreen;
  const showBottomNav = !sessionLoading && user !== null && mainScreens.includes(screen);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const navigate = (nextScreen: ScreenKey) => {
    if (mainScreens.includes(nextScreen)) {
      setPreviousScreen(nextScreen);
    }
    if (nextScreen === "inbox") {
      setInitialChatEventId(undefined);
    }
    setScreen(nextScreen);
  };

  const openEvent = (event: EvntEvent) => {
    setEditingEventId(undefined);
    setSelectedEventId(event.id);
    if (mainScreens.includes(screen)) {
      setPreviousScreen(screen);
    }
    setScreen("detail");
  };

  const openInbox = (eventId?: string) => {
    setEditingEventId(undefined);
    setInitialChatEventId(eventId);
    if (mainScreens.includes(screen)) {
      setPreviousScreen(screen);
    }
    setScreen("inbox");
  };

  const isOwnEvent = useCallback(
    (event: EvntEvent) => user?.name.trim().toLowerCase() === event.organizer.trim().toLowerCase(),
    [user?.name]
  );

  const editEvent = (event: EvntEvent) => {
    setSelectedEventId(event.id);
    setEditingEventId(event.id);
    setPreviousScreen("detail");
    setScreen("create");
  };

  const requestUserLocation = useCallback(async (): Promise<Coordinates | null> => {
    setLocationStatus("loading");

    try {
      if (Platform.OS !== "web") {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setUserCoordinates(null);
          setLocationStatus("unavailable");
          return null;
        }
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setUserCoordinates(null);
        setLocationStatus("denied");
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude
        };
        setUserCoordinates(coords);
        setLocationStatus("granted");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      };
      setUserCoordinates(coords);
      setLocationStatus("granted");
      return coords;
    } catch {
      setUserCoordinates(null);
      setLocationStatus("unavailable");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserCoordinates(null);
      setLocationStatus("loading");
      return;
    }

    void requestUserLocation();
  }, [requestUserLocation, user?.email]);

  useEffect(() => {
    if (!user || user.cityCoordinates || user.city.trim().length < 2) {
      return;
    }

    let cancelled = false;
    searchCitiesWorldwide(user.city)
      .then((suggestions) => {
        const [match] = suggestions;
        if (cancelled || !match) {
          return;
        }

        setUser((current) =>
          current && current.email === user.email && !current.cityCoordinates
            ? { ...current, cityCoordinates: match.coordinates }
            : current
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?.city, user?.cityCoordinates, user?.email]);

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
    showToast(willFavorite ? "Evento salvato nei preferiti." : "Evento rimosso dai preferiti.", "success");
  };

  const toggleRegistration = (eventId: string) => {
    const joining = !registrations.has(eventId);
    const event = events.find((item) => item.id === eventId);
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
    showToast(
      joining
        ? `Iscrizione confermata${event ? `: ${event.title}` : ""}. Chat evento aggiunta.`
        : "Iscrizione annullata.",
      joining ? "success" : "warning"
    );
  };

  const eventToPayload = (event: EvntEvent): CreateEventPayload => ({
    title: event.title,
    description: event.description,
    dateHour: event.dateTimeIso ?? new Date().toISOString(),
    place: event.address || event.place,
    latitude: event.coordinates.latitude,
    longitude: event.coordinates.longitude,
    price: event.price,
    maxSeats: event.capacity ?? null,
    category: event.category,
    chatMode: event.chatMode,
    image: event.image || undefined,
    tags: event.tags,
    subcategory: event.subcategory
  });

  const createEvent = (event: EvntEvent) => {
    setEvents((current) => [event, ...current]);
    setRegistrations((current) => new Set(current).add(event.id));
    setSelectedEventId(event.id);
    setPreviousScreen("create");
    setScreen("detail");
    showToast("Evento creato e chat evento pronta.", "success");
    if (online) {
      api
        .createEvent(eventToPayload(event))
        .then((createdEvent) => {
          const eventWithSubcategory = { ...createdEvent, subcategory: event.subcategory };
          setEvents((current) =>
            current.map((currentEvent) =>
              currentEvent.id === event.id ? eventWithSubcategory : currentEvent
            )
          );
          setRegistrations((current) => {
            const next = new Set(current);
            next.delete(event.id);
            next.add(eventWithSubcategory.id);
            return next;
          });
          setSelectedEventId((current) => (current === event.id ? eventWithSubcategory.id : current));
        })
        .catch(() => undefined);
    }
  };

  const updateEvent = (event: EvntEvent) => {
    setEvents((current) => current.map((item) => (item.id === event.id ? event : item)));
    setSelectedEventId(event.id);
    setEditingEventId(undefined);
    setPreviousScreen("detail");
    setScreen("detail");
    showToast("Evento aggiornato.", "success");

    if (online && /^\d+$/.test(event.id)) {
      api
        .updateEvent(event.id, eventToPayload(event))
        .then(({ event: remoteEvent }) => {
          const eventWithSubcategory = { ...remoteEvent, subcategory: event.subcategory };
          setEvents((current) =>
            current.map((item) => (item.id === event.id ? eventWithSubcategory : item))
          );
          setSelectedEventId((current) => (current === event.id ? eventWithSubcategory.id : current));
        })
        .catch(() => showToast("Evento salvato localmente, ma non sincronizzato.", "warning"));
    }
  };

  const updateProfile = async (profile: UserProfile): Promise<AuthResult> => {
    if (!user) {
      return { ok: false, message: "Sessione non disponibile." };
    }

    const previousUser = user;
    const nextProfile = {
      ...profile,
      cityCoordinates: profile.city === previousUser.city ? profile.cityCoordinates : undefined
    };

    const applyProfile = (savedProfile: UserProfile) => {
      setUser(savedProfile);
      setEvents((current) =>
        current.map((event) =>
          event.organizer.trim().toLowerCase() === previousUser.name.trim().toLowerCase()
            ? { ...event, organizer: savedProfile.name }
            : event
        )
      );
    };

    if (!online) {
      applyProfile(nextProfile);
      showToast("Profilo aggiornato localmente.", "success");
      return { ok: true };
    }

    try {
      const remoteUser = await api.updateProfile({
        name: nextProfile.name,
        city: nextProfile.city,
        bio: nextProfile.bio,
        image: nextProfile.avatar,
        interests: nextProfile.interests
      });
      const savedProfile = { ...nextProfile, ...remoteUser };
      applyProfile(savedProfile);
      const token = getAuthToken();
      if (token) {
        await saveStoredSession({ token, user: savedProfile });
      }
      showToast("Profilo aggiornato.", "success");
      return { ok: true };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Non riesco ad aggiornare il profilo.";
      return { ok: false, message };
    }
  };

  const logout = () => {
    api.logout();
    void clearStoredSession();
    setOnline(false);
    setLocationStatus("loading");
    setUserCoordinates(null);
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

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const session = await loadStoredSession();
        if (!session) {
          return;
        }

        setAuthToken(session.token);
        if (cancelled) {
          return;
        }

        setUser(session.user);
        setScreen("home");
        setPreviousScreen("home");

        const reachable = await isBackendReachable();
        if (cancelled) {
          return;
        }

        setOnline(reachable);
        if (!reachable) {
          return;
        }

        try {
          const currentUser = await api.me();
          if (cancelled) {
            return;
          }

          const restoredUser = { ...session.user, ...currentUser };
          setUser(restoredUser);
          await saveStoredSession({ token: session.token, user: restoredUser });
          await hydrateFromApi();
        } catch {
          await clearStoredSession();
          api.logout();
          if (!cancelled) {
            setOnline(false);
            setUser(null);
            setScreen("auth");
            setPreviousScreen("home");
          }
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!user || !token) {
      return;
    }

    void saveStoredSession({ token, user });
  }, [user]);

  // Real auth against the backend: failed login/register keeps the user on auth.
  const handleAuthComplete = async (
    profile: UserProfile,
    credentials?: { mode: "login" | "signup"; password: string }
  ): Promise<AuthResult> => {
    if (!credentials) {
      setUser(profile);
      setScreen("home");
      setPreviousScreen("home");
      showToast(`Benvenuto, ${profile.name}.`, "success");
      return { ok: true };
    }

    const reachable = await isBackendReachable();
    if (!reachable) {
      setOnline(false);
      return {
        ok: false,
        message: `Backend non raggiungibile da ${getActiveApiBaseUrl()}. Avvia il server e riprova.`
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
      const authenticatedUser = { ...profile, ...res.user };
      setUser(authenticatedUser);
      setOnline(true);
      setScreen("home");
      setPreviousScreen("home");
      await saveStoredSession({ token: res.token, user: authenticatedUser });
      await hydrateFromApi();
      showToast(credentials.mode === "signup" ? "Account creato. Benvenuto in Evnt." : "Bentornato su Evnt.", "success");
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
    const editingEvent = editingEventId ? events.find((event) => event.id === editingEventId) : undefined;

    if (sessionLoading) {
      return (
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingLogo}>Evnt</Text>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      );
    }

    if (!user) {
      return (
        <AuthScreen onComplete={handleAuthComplete} />
      );
    }

    if (screen === "detail" && selectedEvent) {
      return (
        <EventDetailScreen
          canEdit={isOwnEvent(selectedEvent)}
          event={selectedEvent}
          favorite={favorites.has(selectedEvent.id)}
          onBack={() => setScreen(previousScreen)}
          onEdit={() => editEvent(selectedEvent)}
          onOpenInbox={() => openInbox(selectedEvent.id)}
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
          initialEventId={initialChatEventId}
          online={online}
          onOpenEvent={openEvent}
          registrations={registrations}
          user={user}
        />
      );
    }

    if (screen === "map") {
      return (
        <MapScreen
          events={events}
          favorites={favorites}
          locationStatus={locationStatus}
          onOpenEvent={openEvent}
          onRequestLocation={requestUserLocation}
          onToggleFavorite={toggleFavorite}
          registrations={registrations}
          user={user}
          userCoordinates={userCoordinates}
        />
      );
    }

    if (screen === "create") {
      return (
        <CreateEventScreen
          initialEvent={editingEvent}
          onCancel={editingEvent ? () => {
            setEditingEventId(undefined);
            setScreen("detail");
          } : undefined}
          onCreate={createEvent}
          onUpdate={updateEvent}
          user={user}
        />
      );
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
          onUpdateProfile={updateProfile}
          registrations={registrations}
          user={user}
        />
      );
    }

    return (
      <HomeScreen
        events={events}
        favorites={favorites}
        locationStatus={locationStatus}
        onOpenEvent={openEvent}
        onRequestLocation={requestUserLocation}
        onToggleFavorite={toggleFavorite}
        registrations={registrations}
        user={user}
        userCoordinates={userCoordinates}
      />
    );
  };

  return (
    <GluestackUIProvider>
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.appFrame}>
            <View style={styles.content}>{renderScreen()}</View>
            {showBottomNav && <BottomNav active={activeMainScreen} onChange={navigate} />}
            {toast && (
              <View pointerEvents="none" style={[styles.toastLayer, showBottomNav && styles.toastLayerWithNav]}>
                <ToastBanner message={toast.message} tone={toast.tone} />
              </View>
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
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
    position: "relative",
    width: "100%"
  },
  content: {
    flex: 1
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center"
  },
  loadingLogo: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  toastLayer: {
    bottom: spacing.lg,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    zIndex: 40
  },
  toastLayerWithNav: {
    bottom: 86
  }
});
