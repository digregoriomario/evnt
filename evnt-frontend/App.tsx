import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "./src/components/BottomNav";
import { ToastBanner, type ToastTone } from "./src/components/ToastBanner";
import { GluestackUIProvider } from "./src/components/ui";
import { AuthScreen, type AuthResult } from "./src/screens/AuthScreen";
import { CreateEventScreen } from "./src/screens/CreateEventScreen";
import { EventDetailScreen } from "./src/screens/EventDetailScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { useEventFilters } from "./src/presentation/hooks/useEventFilters";
import {
  addPushNotificationResponseListener,
  addPushTokenRefreshListener,
  registerForPushNotificationsAsync,
  type PushNotificationData
} from "./src/pushNotifications";
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
  type CreateEventPayload,
  type Notification,
  type NotificationType
} from "./src/api";
import { searchItalianCities } from "./src/api/geocoding";

const mainScreens: ScreenKey[] = ["home", "map", "create", "inbox", "profile"];
const chatNotificationTypes = new Set<NotificationType>(["CHAT_MESSAGE", "ORGANIZER_ANNOUNCEMENT"]);
const closedEventDelayMs = 3 * 24 * 60 * 60 * 1000;

function isClosedEvent(event: EvntEvent, now = Date.now()) {
  if (!event.dateTimeIso) {
    return false;
  }

  const eventTime = Date.parse(event.dateTimeIso);
  return Number.isFinite(eventTime) && eventTime + closedEventDelayMs <= now;
}

function activeEvents<T extends EvntEvent>(events: T[]) {
  const now = Date.now();
  return events.filter((event) => !isClosedEvent(event, now));
}

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  message?: string;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { message: error.message || "Errore imprevisto." };
  }

  render() {
    if (this.state.message) {
      return (
        <SafeAreaProvider>
          <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.safeArea}>
            <StatusBar style="dark" />
            <View style={styles.errorScreen}>
              <Text style={styles.errorLogo}>Evnt</Text>
              <Text style={styles.errorTitle}>Qualcosa non e partito bene</Text>
              <Text style={styles.errorText}>{this.state.message}</Text>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [events, setEvents] = useState<EvntEvent[]>([]);
  const [screen, setScreen] = useState<ScreenKey>("auth");
  const [previousScreen, setPreviousScreen] = useState<ScreenKey>("home");
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const {
    filters: eventFilters,
    resetFilters: resetEventFilters,
    updateFilters: updateEventFilters
  } = useEventFilters();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [initialChatEventId, setInitialChatEventId] = useState<string | undefined>();
  const [editingEventId, setEditingEventId] = useState<string | undefined>();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushRegistrationAttemptRef = useRef<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );

  const activeMainScreen = mainScreens.includes(screen) ? screen : previousScreen;
  const showBottomNav = !sessionLoading && user !== null && mainScreens.includes(screen);
  const unreadChatNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.isRead && chatNotificationTypes.has(notification.type)
      ).length,
    [notifications]
  );

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

  const refreshNotifications = useCallback(async () => {
    if (!user || !online) {
      return;
    }

    try {
      setNotifications(await api.notifications());
    } catch {
      // Notification polling should never interrupt the active screen.
    }
  }, [online, user?.email]);

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

  const openEventById = useCallback(
    async (eventId: string) => {
      const localEvent = events.find((event) => event.id === eventId);
      if (localEvent) {
        openEvent(localEvent);
        return;
      }

      if (!online) {
        showToast("Evento non disponibile offline.", "warning");
        return;
      }

      try {
        const remoteEvent = await api.getEvent(eventId);
        setEvents((current) =>
          current.some((event) => event.id === remoteEvent.id) ? current : [remoteEvent, ...current]
        );
        openEvent(remoteEvent);
      } catch {
        showToast("Evento non piu disponibile.", "warning");
      }
    },
    [events, online, screen, showToast]
  );

  const markNotificationRead = useCallback(
    (notificationId: number) => {
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
      );
      if (online) {
        void api.markRead(notificationId).catch(() => undefined);
      }
    },
    [online]
  );

  const openPushNotificationData = useCallback(
    async (data: PushNotificationData) => {
      if (typeof data.notificationId === "number") {
        markNotificationRead(data.notificationId);
      }
      if (data.eventId) {
        await openEventById(data.eventId);
      }
    },
    [markNotificationRead, openEventById]
  );

  const openNotification = async (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }

    if (notification.eventId) {
      await openEventById(notification.eventId);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    if (online) {
      void api.markAllRead().catch(() => undefined);
    }
  };

  const deleteNotification = useCallback(
    (notificationId: number) => {
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      if (online) {
        void api.deleteNotification(notificationId).catch(() => {
          showToast("Non sono riuscito a cancellare la notifica.", "warning");
          void refreshNotifications();
        });
      }
    },
    [online, refreshNotifications, showToast]
  );

  const deleteAllNotifications = useCallback(() => {
    setNotifications([]);
    if (online) {
      void api.deleteAllNotifications().catch(() => {
        showToast("Non sono riuscito a cancellare tutte le notifiche.", "warning");
        void refreshNotifications();
      });
    }
  }, [online, refreshNotifications, showToast]);

  const syncPushToken = useCallback(
    async (token: string) => {
      if (!user || !online) {
        return;
      }

      setPushToken(token);
      await api.registerPushToken({
        platform: Platform.OS,
        token
      });
    },
    [online, user?.email]
  );

  const isOwnEvent = useCallback(
    (event: EvntEvent) => user?.name.trim().toLowerCase() === event.organizer.trim().toLowerCase(),
    [user?.name]
  );

  const closeDetail = () => {
    setEditingEventId(undefined);
    setScreen(mainScreens.includes(previousScreen) ? previousScreen : "home");
  };

  const editEvent = (event: EvntEvent) => {
    setSelectedEventId(event.id);
    setEditingEventId(event.id);
    setPreviousScreen("detail");
    setScreen("create");
  };

  const deleteEvent = (event: EvntEvent) => {
    const isRemoteEvent = /^\d+$/.test(event.id);
    if (isRemoteEvent && !online) {
      showToast("Backend non raggiungibile: non posso eliminare l'evento ora.", "warning");
      return;
    }

    const previousEvents = events;
    const previousFavorites = favorites;
    const previousRegistrations = registrations;
    setEvents((current) => current.filter((item) => item.id !== event.id));
    setFavorites((current) => {
      const next = new Set(current);
      next.delete(event.id);
      return next;
    });
    setRegistrations((current) => {
      const next = new Set(current);
      next.delete(event.id);
      return next;
    });
    setInitialChatEventId((current) => (current === event.id ? undefined : current));
    setEditingEventId(undefined);
    setSelectedEventId((current) => (current === event.id ? undefined : current));
    setScreen(mainScreens.includes(previousScreen) ? previousScreen : "home");
    showToast("Evento eliminato.", "success");

    if (isRemoteEvent) {
      api
        .deleteEvent(event.id)
        .then(() => {
          void hydrateFromApi();
          void refreshNotifications();
        })
        .catch(() => {
          setEvents(previousEvents);
          setFavorites(previousFavorites);
          setRegistrations(previousRegistrations);
          setSelectedEventId(event.id);
          setScreen("detail");
          showToast("Eliminazione non riuscita. Riprova tra poco.", "warning");
        });
    }
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
    searchItalianCities(user.city)
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

  useEffect(() => {
    const pruneClosedEvents = () => {
      setEvents((current) => {
        const nextEvents = activeEvents(current);
        return nextEvents.length === current.length ? current : nextEvents;
      });
    };

    pruneClosedEvents();
    const timer = setInterval(pruneClosedEvents, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const eventIds = new Set(events.map((event) => event.id));
    setFavorites((current) => new Set([...current].filter((eventId) => eventIds.has(eventId))));
    setRegistrations((current) => new Set([...current].filter((eventId) => eventIds.has(eventId))));

    if (initialChatEventId && !eventIds.has(initialChatEventId)) {
      setInitialChatEventId(undefined);
    }

    if (selectedEventId && !eventIds.has(selectedEventId)) {
      setSelectedEventId(events[0]?.id);
      if (screen === "detail") {
        setScreen(mainScreens.includes(previousScreen) ? previousScreen : "home");
      }
    }
  }, [events, initialChatEventId, previousScreen, screen, selectedEventId]);

  const toggleFavorite = (eventId: string) => {
    if (!online || !/^\d+$/.test(eventId)) {
      showToast("Preferiti disponibili quando il backend e raggiungibile.", "warning");
      return;
    }

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
    (willFavorite ? api.bookmark(eventId) : api.unbookmark(eventId)).catch(() => {
      setFavorites((current) => {
        const next = new Set(current);
        if (willFavorite) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
      showToast("Non sono riuscito ad aggiornare i preferiti.", "warning");
    });
    showToast(willFavorite ? "Evento salvato nei preferiti." : "Evento rimosso dai preferiti.", "success");
  };

  const toggleRegistration = (eventId: string) => {
    if (!online || !/^\d+$/.test(eventId)) {
      showToast("Iscrizioni disponibili quando il backend e raggiungibile.", "warning");
      return;
    }

    const joining = !registrations.has(eventId);
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return;
    }

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
    (joining ? api.join(eventId) : api.leave(eventId))
      .then((response) => {
        setRegistrations((current) => {
          const next = new Set(current);
          if (response.registered) {
            next.add(eventId);
          } else {
            next.delete(eventId);
          }
          return next;
        });
        setEvents((current) =>
          current.map((item) =>
            item.id === eventId ? { ...item, participants: response.participants } : item
          )
        );
        if (joining) {
          setInitialChatEventId(eventId);
        }
        void hydrateFromApi();
      })
      .catch(() => {
        setRegistrations((current) => {
          const next = new Set(current);
          if (joining) {
            next.delete(eventId);
          } else {
            next.add(eventId);
          }
          return next;
        });
        setEvents((current) =>
          current.map((item) => (item.id === eventId ? { ...item, participants: event.participants } : item))
        );
        showToast(
          joining ? "Iscrizione non riuscita. Controlla posti e connessione." : "Annullamento non riuscito.",
          "warning"
        );
      });
    showToast(
      joining
        ? `Iscrizione confermata${event ? `: ${event.title}` : ""}.`
        : "Iscrizione annullata.",
      joining ? "success" : "warning"
    );
  };

  const eventToPayload = (event: EvntEvent): CreateEventPayload => ({
    title: event.title,
    description: event.description,
    dateHour: event.dateTimeIso ?? new Date().toISOString(),
    place: event.place || event.address,
    address: event.address || event.place,
    city: event.city,
    province: event.province,
    region: event.region,
    postcode: event.postcode,
    countryCode: event.countryCode ?? "IT",
    latitude: event.coordinates.latitude,
    longitude: event.coordinates.longitude,
    price: event.price,
    maxSeats: event.capacity ?? null,
    category: event.category,
    chatMode: event.chatMode,
    countCreator: event.creatorCountsAsParticipant,
    image: event.image || undefined,
    tags: event.tags,
    subcategory: event.subcategory
  });

  const createEvent = (event: EvntEvent) => {
    if (!online) {
      showToast("Backend non raggiungibile: non posso creare l'evento ora.", "warning");
      return false;
    }

    const shouldRegisterCreator = event.creatorCountsAsParticipant !== false;
    setEvents((current) => [event, ...current]);
    setRegistrations((current) => {
      const next = new Set(current);
      if (shouldRegisterCreator) {
        next.add(event.id);
      } else {
        next.delete(event.id);
      }
      return next;
    });
    setSelectedEventId(event.id);
    setPreviousScreen("create");
    setScreen("detail");
    showToast("Evento creato.", "success");
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
          if (eventWithSubcategory.registered || shouldRegisterCreator) {
            next.add(eventWithSubcategory.id);
          }
          return next;
        });
        setSelectedEventId((current) => (current === event.id ? eventWithSubcategory.id : current));
        setInitialChatEventId(eventWithSubcategory.id);
        void hydrateFromApi();
        void refreshNotifications();
      })
      .catch(() => {
        setEvents((current) => current.filter((item) => item.id !== event.id));
        setRegistrations((current) => {
          const next = new Set(current);
          next.delete(event.id);
          return next;
        });
        setSelectedEventId(undefined);
        setScreen("create");
        showToast("Creazione non riuscita. Controlla i campi e riprova.", "warning");
      });
    return true;
  };

  const updateEvent = (event: EvntEvent) => {
    const isRemoteEvent = /^\d+$/.test(event.id);
    if (isRemoteEvent && !online) {
      showToast("Backend non raggiungibile: non posso salvare le modifiche ora.", "warning");
      return false;
    }

    const previousEvent = events.find((item) => item.id === event.id);
    setEvents((current) => current.map((item) => (item.id === event.id ? event : item)));
    setSelectedEventId(event.id);
    setEditingEventId(undefined);
    setPreviousScreen("detail");
    setScreen("detail");
    showToast("Evento aggiornato.", "success");

    if (isRemoteEvent) {
      api
        .updateEvent(event.id, eventToPayload(event))
        .then(({ event: remoteEvent }) => {
          const eventWithSubcategory = { ...remoteEvent, subcategory: event.subcategory };
          setEvents((current) =>
            current.map((item) => (item.id === event.id ? eventWithSubcategory : item))
          );
          setSelectedEventId((current) => (current === event.id ? eventWithSubcategory.id : current));
          void hydrateFromApi();
        })
        .catch(() => {
          if (previousEvent) {
            setEvents((current) => current.map((item) => (item.id === event.id ? previousEvent : item)));
          }
          showToast("Aggiornamento non riuscito. Ho ripristinato l'evento.", "warning");
        });
    }
    return true;
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
      const savedProfile = {
        ...nextProfile,
        ...remoteUser,
        cityCoordinates: remoteUser.cityCoordinates ?? nextProfile.cityCoordinates
      };
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
    if (pushToken) {
      void api.unregisterPushToken(pushToken).catch(() => undefined);
    }
    api.logout();
    void clearStoredSession();
    setOnline(false);
    setLocationStatus("loading");
    setUserCoordinates(null);
    setNotifications([]);
    setPushToken(null);
    pushRegistrationAttemptRef.current = null;
    setUser(null);
    setScreen("auth");
    setPreviousScreen("home");
  };

  // Loads live events from the backend and derives favorites/registrations.
  const hydrateFromApi = useCallback(async () => {
    try {
      const remote: ApiEvent[] = await api.listEvents();
      const liveEvents = activeEvents(remote);
      setEvents(liveEvents);
      setSelectedEventId((current) =>
        current && liveEvents.some((event) => event.id === current) ? current : liveEvents[0]?.id
      );
      setFavorites(new Set(liveEvents.filter((e) => e.favorite).map((e) => e.id)));
      setRegistrations(new Set(liveEvents.filter((e) => e.registered).map((e) => e.id)));
    } catch {
      // Keep the current live state visible if refresh fails.
    }
  }, []);

  const refreshAppData = useCallback(async () => {
    if (!user) {
      return;
    }

    const reachable = await isBackendReachable();
    setOnline(reachable);
    if (!reachable) {
      showToast(`Backend non raggiungibile da ${getActiveApiBaseUrl()}.`, "warning");
      return;
    }

    await Promise.all([hydrateFromApi(), api.notifications().then(setNotifications).catch(() => undefined)]);
  }, [hydrateFromApi, showToast, user]);

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
  }, [hydrateFromApi]);

  useEffect(() => {
    const token = getAuthToken();
    if (!user || !token) {
      return;
    }

    void saveStoredSession({ token, user });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    if (!online) {
      return;
    }

    void refreshNotifications();
    const timer = setInterval(() => {
      void refreshNotifications();
    }, 45 * 1000);

    return () => clearInterval(timer);
  }, [online, refreshNotifications, user]);

  useEffect(() => {
    if (!user || !online) {
      return;
    }

    const refreshEvents = () => {
      void hydrateFromApi();
    };

    refreshEvents();
    const timer = setInterval(refreshEvents, 15 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void hydrateFromApi();
        void refreshNotifications();
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [hydrateFromApi, online, refreshNotifications, user]);

  useEffect(() => {
    if (!user || !online) {
      return;
    }

    let cancelled = false;

    const registerPushToken = async () => {
      const attemptKey = user.email;
      if (pushRegistrationAttemptRef.current === attemptKey) {
        return;
      }
      pushRegistrationAttemptRef.current = attemptKey;

      const result = await registerForPushNotificationsAsync();
      if (cancelled) {
        return;
      }

      if (result.status === "registered") {
        await syncPushToken(result.token).catch(() => undefined);
      }
    };

    void registerPushToken();

    const tokenSubscription = addPushTokenRefreshListener((token) => {
      void syncPushToken(token).catch(() => undefined);
    });
    const responseSubscription = addPushNotificationResponseListener((data) => {
      void openPushNotificationData(data);
    });

    return () => {
      cancelled = true;
      tokenSubscription.remove();
      responseSubscription.remove();
    };
  }, [online, openPushNotificationData, syncPushToken, user?.email]);

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
          onBack={closeDetail}
          onDelete={() => deleteEvent(selectedEvent)}
          onEdit={() => editEvent(selectedEvent)}
          onOpenChat={registrations.has(selectedEvent.id) ? () => openInbox(selectedEvent.id) : undefined}
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
          onInitialEventHandled={() => setInitialChatEventId(undefined)}
          onRefresh={refreshAppData}
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
          filters={eventFilters}
          locationStatus={locationStatus}
          onFiltersChange={updateEventFilters}
          onOpenEvent={openEvent}
          onRequestLocation={requestUserLocation}
          onResetFilters={resetEventFilters}
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
        filters={eventFilters}
        locationStatus={locationStatus}
        notifications={notifications}
        onDeleteAllNotifications={deleteAllNotifications}
        onDeleteNotification={deleteNotification}
        onFiltersChange={updateEventFilters}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onOpenEvent={openEvent}
        onOpenNotification={(notification) => {
          void openNotification(notification);
        }}
        onRefresh={refreshAppData}
        onRequestLocation={requestUserLocation}
        onResetFilters={resetEventFilters}
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
            {showBottomNav && (
              <BottomNav
                active={activeMainScreen}
                badgeCounts={{ inbox: unreadChatNotifications }}
                onChange={navigate}
              />
            )}
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

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
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
  errorScreen: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl
  },
  errorLogo: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900"
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  errorText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center"
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
