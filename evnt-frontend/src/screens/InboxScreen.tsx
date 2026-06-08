import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  api,
  getRealtimeWebSocketUrl,
  type ChatMessage,
  type DirectConversation,
  type DirectMessage,
  type RealtimeDirectMessageEvent,
  type RealtimeEventMessageEvent,
  type UserSearchResult
} from "../api";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { PillButton } from "../components/PillButton";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent, UserProfile } from "../types";

type InboxScreenProps = {
  events: EvntEvent[];
  initialEventId?: string;
  onRefresh: () => Promise<void>;
  online: boolean;
  onInitialEventHandled?: () => void;
  registrations: Set<string>;
  user: UserProfile;
  onOpenEvent: (event: EvntEvent) => void;
};

type ChatTarget =
  | { type: "event"; id: string }
  | { type: "direct"; id: string };

type DisplayMessage = {
  id: string;
  text: string;
  sentAt: string;
  senderEmail?: string;
  senderId?: string;
  senderName: string;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
};

type DirectChat = {
  id: string;
  email: string;
  name: string;
  status: string;
  accent: string;
  soft: string;
  city: string;
  interests: string[];
  userId?: number;
};

type ChatRowProps = {
  accent: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconText?: string;
  onPress: () => void;
  preview: string;
  soft: string;
  subtitle: string;
  time?: string;
  title: string;
  unread?: number;
};

const isBackendEventId = (id: string) => /^\d+$/.test(id);

const normalizedEmail = (value: string) => value.trim().toLowerCase();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function profileFromUser(user: UserSearchResult): DirectChat {
  return {
    id: `user-${user.id}`,
    email: normalizedEmail(user.email),
    name: user.name,
    status: "Conversazione privata",
    accent: colors.primary,
    soft: colors.surfaceMuted,
    city: user.city || "Citta non indicata",
    interests: [],
    userId: user.id
  };
}

function mapApiMessage(message: ChatMessage, user: UserProfile): DisplayMessage {
  return {
    id: `api-${message.id}`,
    text: message.text,
    sentAt: message.sentAt,
    senderEmail: message.sender.email,
    senderId: String(message.sender.id),
    senderName: message.sender.name,
    mine: user.id ? message.sender.id === user.id : message.sender.name === user.name
  };
}

function directChatFromConversation(conversation: DirectConversation): DirectChat {
  return {
    id: String(conversation.id),
    email: normalizedEmail(conversation.participant.email),
    name: conversation.participant.name,
    status: "Conversazione privata",
    accent: colors.primary,
    soft: colors.surfaceMuted,
    city: conversation.participant.city || "Citta non indicata",
    interests: [],
    userId: conversation.participant.id
  };
}

function mapApiDirectMessage(message: DirectMessage, user: UserProfile): DisplayMessage {
  return {
    id: `direct-${message.id}`,
    text: message.text,
    sentAt: message.sentAt,
    senderEmail: message.sender.email,
    senderId: String(message.sender.id),
    senderName: message.sender.name,
    mine: user.id ? message.sender.id === user.id : message.sender.email === user.email
  };
}

function formatChatTime(iso?: string) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startMessageDay) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }

  if (dayDiff === 1) {
    return "Ieri";
  }

  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function lastPreview(messages: DisplayMessage[], fallback: string) {
  const last = messages[messages.length - 1];
  if (!last) {
    return fallback;
  }

  return `${last.mine ? "Tu: " : ""}${last.text}`;
}

export function InboxScreen({
  events,
  initialEventId,
  onRefresh,
  online,
  onInitialEventHandled,
  registrations,
  user,
  onOpenEvent
}: InboxScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ChatTarget | null>(null);
  const [eventMessageMap, setEventMessageMap] = useState<Record<string, DisplayMessage[]>>({});
  const [directMessageMap, setDirectMessageMap] = useState<Record<string, DisplayMessage[]>>({});
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [loadingDirectId, setLoadingDirectId] = useState<string | null>(null);
  const [sendingEventId, setSendingEventId] = useState<string | null>(null);
  const [sendingDirectId, setSendingDirectId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [peopleSearchError, setPeopleSearchError] = useState("");
  const [peopleSearchResult, setPeopleSearchResult] = useState<DirectChat | null>(null);
  const [directProfiles, setDirectProfiles] = useState<Record<string, DirectChat>>({});
  const [directChatIds, setDirectChatIds] = useState<Set<string>>(new Set());

  const selectedEvent =
    selectedTarget?.type === "event"
      ? events.find((event) => event.id === selectedTarget.id)
      : undefined;
  const selectedDirect =
    selectedTarget?.type === "direct"
      ? directProfiles[selectedTarget.id]
      : undefined;

  const selectedMessages = selectedEvent
    ? eventMessageMap[selectedEvent.id] ?? []
    : selectedDirect
      ? directMessageMap[selectedDirect.id] ?? []
      : [];

  const query = search.trim().toLowerCase();

  const eventRows = useMemo(
    () =>
      events
        .filter((event) => {
          const isOrganizer = event.organizer.trim().toLowerCase() === user.name.trim().toLowerCase();
          return isOrganizer || registrations.has(event.id);
        })
        .map((event) => {
          const messages = eventMessageMap[event.id] ?? [];
          const last = messages[messages.length - 1];
          const subcategory = getEventSubcategoryLabel(event);
          const participantLabel =
            event.participants === 1 ? "1 partecipante" : `${event.participants} partecipanti`;
          return {
            event,
            preview: lastPreview(messages, "Chat evento pronta"),
            subtitle: `${subcategory} · ${participantLabel}`,
            time: formatChatTime(last?.sentAt || event.dateTimeIso)
          };
        })
        .sort((a, b) => {
          const messagesA = eventMessageMap[a.event.id] ?? [];
          const messagesB = eventMessageMap[b.event.id] ?? [];
          const lastA = messagesA[messagesA.length - 1]?.sentAt || a.event.dateTimeIso;
          const lastB = messagesB[messagesB.length - 1]?.sentAt || b.event.dateTimeIso;
          return (lastB ? Date.parse(lastB) : 0) - (lastA ? Date.parse(lastA) : 0);
        })
        .filter(({ event, preview, subtitle }) => {
          if (!query) {
            return true;
          }

          return [
            event.title,
            event.place,
            event.city,
            event.chatMode,
            subtitle,
            preview
          ].join(" ").toLowerCase().includes(query);
        }),
    [eventMessageMap, events, query, registrations, user.name]
  );

  const directRows = useMemo(
    () =>
      [...directChatIds]
        .map((chatId) => directProfiles[chatId])
        .filter((chat): chat is DirectChat => Boolean(chat))
        .map((chat) => {
          const messages = directMessageMap[chat.id] ?? [];
          const last = messages[messages.length - 1];
          return {
            chat,
            preview: lastPreview(messages, "Nessun messaggio ancora"),
            time: formatChatTime(last?.sentAt)
          };
        })
        .sort((a, b) => {
          const messagesA = directMessageMap[a.chat.id] ?? [];
          const messagesB = directMessageMap[b.chat.id] ?? [];
          const lastA = messagesA[messagesA.length - 1]?.sentAt;
          const lastB = messagesB[messagesB.length - 1]?.sentAt;
          return (lastB ? Date.parse(lastB) : 0) - (lastA ? Date.parse(lastA) : 0);
        })
        .filter(({ chat, preview }) => {
          if (!query) {
            return true;
          }

          return [chat.name, chat.email, chat.status, preview].join(" ").toLowerCase().includes(query);
        }),
    [directChatIds, directMessageMap, directProfiles, query]
  );

  const selectedTitle = selectedEvent?.title ?? selectedDirect?.name ?? "";
  const selectedSubtitle = selectedEvent
    ? `${selectedEvent.chatMode} · ${selectedEvent.participants} partecipanti`
    : selectedDirect?.email ?? "";
  const selectedAccent = selectedEvent
    ? categoryColors[selectedEvent.category]
    : selectedDirect?.accent ?? colors.primary;
  const selectedSoft = selectedEvent
    ? categorySoftColors[selectedEvent.category]
    : selectedDirect?.soft ?? colors.surfaceMuted;
  const selectedIconText = selectedEvent ? categoryEmojis[selectedEvent.category] : selectedDirect?.name.slice(0, 1);
  const organizerCanWrite =
    selectedEvent && selectedEvent.organizer.trim().toLowerCase() === user.name.trim().toLowerCase();
  const composerLocked = Boolean(selectedEvent?.chatMode === "Solo annunci" && !organizerCanWrite);
  const canSend = draft.trim().length > 0 && !composerLocked && selectedTarget !== null;

  const mergeDirectConversations = useCallback(
    (conversations: DirectConversation[], replace = false) => {
      setDirectProfiles((current) => {
        const next = { ...current };
        conversations.forEach((conversation) => {
          const chat = directChatFromConversation(conversation);
          next[chat.id] = chat;
        });
        return next;
      });
      const incomingIds = conversations.map((conversation) => String(conversation.id));
      setDirectChatIds((current) => (replace ? new Set(incomingIds) : new Set([...current, ...incomingIds])));
      setDirectMessageMap((current) => {
        const next = { ...current };
        conversations.forEach((conversation) => {
          const chatId = String(conversation.id);
          if (!conversation.lastMessage) {
            next[chatId] = next[chatId] ?? [];
            return;
          }

          const mappedMessage = mapApiDirectMessage(conversation.lastMessage, user);
          const existing = next[chatId] ?? [];
          const withoutDuplicate = existing.filter((message) => message.id !== mappedMessage.id);
          next[chatId] = [...withoutDuplicate, mappedMessage].sort(
                (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
              );
        });
        return next;
      });
    },
    [user]
  );

  const loadDirectChats = useCallback(async () => {
    if (!online) {
      return;
    }

    try {
      mergeDirectConversations(await api.directChats(), true);
    } catch {
      // Keep the current chat list visible if refresh fails.
    }
  }, [mergeDirectConversations, online]);

  const upsertDirectMessage = useCallback(
    (conversationId: string, message: DirectMessage) => {
      const mappedMessage = mapApiDirectMessage(message, user);
      setDirectMessageMap((current) => {
        const existing = current[conversationId] ?? [];
        const withoutDuplicate = existing.filter((item) => item.id !== mappedMessage.id);
        return {
          ...current,
          [conversationId]: [...withoutDuplicate, mappedMessage].sort(
            (a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt)
          )
        };
      });
    },
    [user]
  );

  const upsertEventMessage = useCallback(
    (eventId: string, message: ChatMessage) => {
      const mappedMessage = mapApiMessage(message, user);
      setEventMessageMap((current) => {
        const existing = current[eventId] ?? [];
        const withoutDuplicate = existing.filter((item) => item.id !== mappedMessage.id);
        return {
          ...current,
          [eventId]: [...withoutDuplicate, mappedMessage].sort(
            (a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt)
          )
        };
      });
    },
    [user]
  );

  const handleRealtimeEvent = useCallback(
    (event: RealtimeDirectMessageEvent | RealtimeEventMessageEvent) => {
      if (event.type === "direct-message") {
        mergeDirectConversations([event.payload.conversation]);
        upsertDirectMessage(String(event.payload.conversation.id), event.payload.message);
        return;
      }

      upsertEventMessage(event.payload.eventId, event.payload.message);
    },
    [mergeDirectConversations, upsertDirectMessage, upsertEventMessage]
  );

  useEffect(() => {
    if (!online) {
      return;
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;
    let stopped = false;

    const connect = () => {
      const url = getRealtimeWebSocketUrl();
      if (!url || stopped) {
        return;
      }

      socket = new WebSocket(url);
      socket.onmessage = (message) => {
        if (typeof message.data !== "string") {
          return;
        }

        try {
          const event = JSON.parse(message.data) as
            | RealtimeDirectMessageEvent
            | RealtimeEventMessageEvent
            | { type?: string };
          if (event.type === "direct-message" || event.type === "event-message") {
            handleRealtimeEvent(event as RealtimeDirectMessageEvent | RealtimeEventMessageEvent);
          }
        } catch {
          // Ignore malformed realtime payloads.
        }
      };
      socket.onclose = () => {
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [handleRealtimeEvent, online, user.email]);

  useEffect(() => {
    if (!peopleOpen) {
      return;
    }

    const email = normalizedEmail(peopleSearch);
    setPeopleSearchResult(null);
    setPeopleSearchError("");

    if (!email) {
      setPeopleSearching(false);
      return;
    }

    if (!emailPattern.test(email)) {
      setPeopleSearching(false);
      setPeopleSearchError("Inserisci un'email completa per cercare un utente.");
      return;
    }

    if (email === normalizedEmail(user.email)) {
      setPeopleSearching(false);
      setPeopleSearchError("Non puoi avviare una chat con te stesso.");
      return;
    }

    const localProfile = Object.values(directProfiles).find((profile) => profile.email === email);
    if (localProfile) {
      setPeopleSearching(false);
      setPeopleSearchResult(localProfile);
      return;
    }

    if (!online) {
      setPeopleSearching(false);
      setPeopleSearchError("Utente non trovato tra i profili disponibili offline.");
      return;
    }

    let cancelled = false;
    setPeopleSearching(true);
    const timeout = setTimeout(() => {
      api
        .searchUserByEmail(email)
        .then((foundUser) => {
          if (cancelled) {
            return;
          }

          setPeopleSearchResult(foundUser ? profileFromUser(foundUser) : null);
          setPeopleSearchError(foundUser ? "" : "Nessun utente trovato con questa email.");
        })
        .catch(() => {
          if (!cancelled) {
            setPeopleSearchError("Non riesco a cercare utenti adesso.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setPeopleSearching(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [directProfiles, online, peopleOpen, peopleSearch, user.email]);

  useEffect(() => {
    void loadDirectChats();
  }, [loadDirectChats]);

  useEffect(() => {
    if (!initialEventId || !eventRows.some((row) => row.event.id === initialEventId)) {
      return;
    }

    setDraft("");
    setSelectedTarget({ type: "event", id: initialEventId });
    onInitialEventHandled?.();
  }, [eventRows, initialEventId, onInitialEventHandled]);

  const loadEventMessages = useCallback(
    async (eventId: string, showLoading = true) => {
      if (!online || !isBackendEventId(eventId)) {
        return;
      }

      if (showLoading) {
        setLoadingEventId(eventId);
      }

      try {
        const messages = await api.messages(eventId);
        setEventMessageMap((current) => ({
          ...current,
          [eventId]: messages.map((message) => mapApiMessage(message, user))
        }));
      } catch {
        // Keep the current conversation visible if refresh fails.
      } finally {
        if (showLoading) {
          setLoadingEventId(null);
        }
      }
    },
    [online, user]
  );

  const loadDirectMessages = useCallback(
    async (conversationId: string, showLoading = true) => {
      if (!online) {
        return;
      }

      if (showLoading) {
        setLoadingDirectId(conversationId);
      }

      try {
        const messages = await api.directMessages(conversationId);
        setDirectMessageMap((current) => ({
          ...current,
          [conversationId]: messages.map((message) => mapApiDirectMessage(message, user))
        }));
      } catch {
        // Keep the current conversation visible if refresh fails.
      } finally {
        if (showLoading) {
          setLoadingDirectId(null);
        }
      }
    },
    [online, user]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      await loadDirectChats();
      if (selectedEvent) {
        await loadEventMessages(selectedEvent.id, false);
      }
      if (selectedDirect) {
        await loadDirectMessages(selectedDirect.id, false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadDirectChats, loadDirectMessages, loadEventMessages, onRefresh, selectedDirect?.id, selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    void loadEventMessages(selectedEvent.id);
  }, [loadEventMessages, selectedEvent?.id]);

  useEffect(() => {
    if (!selectedDirect) {
      return;
    }

    void loadDirectMessages(selectedDirect.id);
  }, [loadDirectMessages, selectedDirect?.id]);

  const openTarget = (target: ChatTarget) => {
    setDraft("");
    setSelectedTarget(target);
  };

  const startDirectChat = async (chat: DirectChat) => {
    if (!online) {
      setPeopleSearchError("Serve il backend attivo per avviare una chat privata.");
      return;
    }

    try {
      const conversation = await api.startDirectChat(chat.email);
      mergeDirectConversations([conversation]);
      setPeopleOpen(false);
      setPeopleSearch("");
      setPeopleSearchResult(null);
      setPeopleSearchError("");
      openTarget({ type: "direct", id: String(conversation.id) });
      await loadDirectMessages(String(conversation.id), false);
    } catch {
      setPeopleSearchError("Non riesco ad avviare questa chat adesso.");
    }
  };

  const directContactFromMessage = (message: DisplayMessage) => {
    if (message.mine) {
      return null;
    }

    if (!message.senderEmail) {
      return null;
    }

    const email = normalizedEmail(message.senderEmail);
    return Object.values(directProfiles).find((profile) => profile.email === email) ?? {
      id: email,
      email,
      name: message.senderName,
      status: "Conversazione privata",
      accent: colors.primary,
      soft: colors.surfaceMuted,
      city: "Citta non indicata",
      interests: []
    };
  };

  const openDirectFromMessage = (message: DisplayMessage) => {
    const contact = directContactFromMessage(message);
    if (contact) {
      startDirectChat(contact);
    }
  };

  const closeConversation = () => {
    setDraft("");
    setSelectedTarget(null);
  };

  const appendEventMessage = (eventId: string, message: DisplayMessage) => {
    setEventMessageMap((current) => ({
      ...current,
      [eventId]: [...(current[eventId] ?? []), message]
    }));
  };

  const appendDirectMessage = (chatId: string, message: DisplayMessage) => {
    setDirectMessageMap((current) => ({
      ...current,
      [chatId]: [...(current[chatId] ?? []), message]
    }));
  };

  const replaceOptimisticDirectMessage = (
    conversationId: string,
    localId: string,
    nextMessage: DisplayMessage
  ) => {
    setDirectMessageMap((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).some((message) => message.id === nextMessage.id)
        ? (current[conversationId] ?? []).filter((message) => message.id !== localId)
        : (current[conversationId] ?? []).map((message) =>
            message.id === localId ? nextMessage : message
          )
    }));
  };

  const markOptimisticDirectMessageLocal = (conversationId: string, localId: string) => {
    setDirectMessageMap((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).map((message) =>
        message.id === localId ? { ...message, pending: false, failed: true } : message
      )
    }));
  };

  const replaceOptimisticEventMessage = (
    eventId: string,
    localId: string,
    nextMessage: DisplayMessage
  ) => {
    setEventMessageMap((current) => ({
      ...current,
      [eventId]: (current[eventId] ?? []).some((message) => message.id === nextMessage.id)
        ? (current[eventId] ?? []).filter((message) => message.id !== localId)
        : (current[eventId] ?? []).map((message) =>
            message.id === localId ? nextMessage : message
          )
    }));
  };

  const markOptimisticEventMessageLocal = (eventId: string, localId: string) => {
    setEventMessageMap((current) => ({
      ...current,
      [eventId]: (current[eventId] ?? []).map((message) =>
        message.id === localId ? { ...message, pending: false, failed: true } : message
      )
    }));
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !selectedTarget || composerLocked) {
      return;
    }

    const localMessage: DisplayMessage = {
      id: `local-${Date.now()}`,
      text,
      sentAt: new Date().toISOString(),
      senderName: user.name,
      mine: true,
      pending: online && (selectedTarget.type === "direct" || isBackendEventId(selectedTarget.id))
    };

    setDraft("");

    if (selectedTarget.type === "direct") {
      appendDirectMessage(selectedTarget.id, localMessage);
      if (!online) {
        markOptimisticDirectMessageLocal(selectedTarget.id, localMessage.id);
        return;
      }

      setSendingDirectId(selectedTarget.id);
      api
        .sendDirectMessage(selectedTarget.id, text)
        .then((message) => {
          replaceOptimisticDirectMessage(
            selectedTarget.id,
            localMessage.id,
            mapApiDirectMessage(message, user)
          );
          void loadDirectChats();
        })
        .catch(() => {
          markOptimisticDirectMessageLocal(selectedTarget.id, localMessage.id);
        })
        .finally(() => {
          setSendingDirectId(null);
        });
      return;
    }

    appendEventMessage(selectedTarget.id, localMessage);

    if (!online || !isBackendEventId(selectedTarget.id)) {
      return;
    }

    setSendingEventId(selectedTarget.id);
    api
      .sendMessage(selectedTarget.id, text)
      .then((message) => {
        replaceOptimisticEventMessage(
          selectedTarget.id,
          localMessage.id,
          mapApiMessage(message, user)
        );
      })
      .catch(() => {
        markOptimisticEventMessageLocal(selectedTarget.id, localMessage.id);
      })
      .finally(() => {
        setSendingEventId(null);
      });
  };

  if (selectedTarget && (selectedEvent || selectedDirect)) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatRoot}
      >
        <View style={styles.chatHeader}>
          <Pressable
            accessibilityLabel="Torna alle chat"
            accessibilityRole="button"
            onPress={closeConversation}
            style={styles.headerButton}
          >
            <Ionicons color={colors.ink} name="chevron-back" size={24} />
          </Pressable>
          <View style={[styles.detailIcon, { backgroundColor: selectedSoft, borderColor: selectedAccent }]}>
            <Text style={styles.detailIconText}>{selectedIconText}</Text>
          </View>
          <View style={styles.detailCopy}>
            <Text numberOfLines={1} style={styles.detailTitle}>{selectedTitle}</Text>
            <Text numberOfLines={1} style={styles.detailSubtitle}>{selectedSubtitle}</Text>
          </View>
          {selectedEvent ? (
            <Pressable
              accessibilityLabel="Apri dettaglio evento"
              accessibilityRole="button"
              onPress={() => onOpenEvent(selectedEvent)}
              style={styles.headerButton}
            >
              <Ionicons color={colors.ink} name="information-circle-outline" size={24} />
            </Pressable>
          ) : null}
        </View>

        {selectedEvent ? (
          <View style={styles.chatMetaRow}>
            <PillButton
              accent={selectedAccent}
              emoji={categoryEmojis[selectedEvent.category]}
              label={getEventSubcategoryLabel(selectedEvent)}
              soft={selectedSoft}
            />
            <Text style={styles.chatMetaText}>
              {registrations.has(selectedEvent.id) ? "Partecipi" : "Canale evento"}
            </Text>
          </View>
        ) : null}

        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.messagesContainer}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl
              colors={[selectedAccent]}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor={selectedAccent}
            />
          }
          ref={scrollRef}
        >
          {loadingEventId === selectedEvent?.id ? (
            <Text style={styles.loadingText}>Carico i messaggi...</Text>
          ) : null}
          {loadingDirectId === selectedDirect?.id ? (
            <Text style={styles.loadingText}>Carico i messaggi...</Text>
          ) : null}

          {selectedMessages.length === 0 ? (
            <View style={styles.emptyConversation}>
              <Ionicons color={colors.muted} name="chatbubble-ellipses-outline" size={26} />
              <Text style={styles.emptyConversationTitle}>Ancora nessun messaggio</Text>
              <Text style={styles.emptyConversationText}>Scrivi tu il primo messaggio.</Text>
            </View>
          ) : (
            selectedMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onAuthorPress={selectedEvent && !message.mine ? () => openDirectFromMessage(message) : undefined}
              />
            ))
          )}
        </ScrollView>

        {composerLocked ? (
          <View style={styles.lockedComposer}>
            <Ionicons color={colors.muted} name="megaphone-outline" size={20} />
            <Text style={styles.lockedText}>Solo l'organizzatore puo scrivere in questa chat.</Text>
          </View>
        ) : (
          <View style={styles.messageBox}>
            <TextInput
              multiline
              onChangeText={setDraft}
              placeholder="Scrivi un messaggio"
              placeholderTextColor={colors.muted}
              style={styles.messageInput}
              value={draft}
            />
            <Pressable
              accessibilityLabel="Invia messaggio"
              accessibilityRole="button"
              disabled={
                !canSend ||
                sendingEventId === selectedEvent?.id ||
                sendingDirectId === selectedDirect?.id
              }
              onPress={sendMessage}
              style={[
                styles.sendButton,
                (!canSend ||
                  sendingEventId === selectedEvent?.id ||
                  sendingDirectId === selectedDirect?.id) &&
                  styles.sendButtonDisabled
              ]}
            >
              <Ionicons color={colors.surface} name="send" size={18} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chat</Text>
            <Text style={styles.subtitle}>Eventi e conversazioni private.</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons color={colors.muted} name="search-outline" size={20} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Cerca chat o persone"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Cancella ricerca" accessibilityRole="button" onPress={() => setSearch("")}>
              <Ionicons color={colors.muted} name="close-circle" size={20} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Avvia chat cercando una persona tramite email"
          accessibilityRole="button"
          onPress={() => setPeopleOpen(true)}
          style={styles.friendShortcut}
        >
          <View style={styles.friendShortcutIcon}>
            <Ionicons color={colors.primary} name="people-outline" size={22} />
          </View>
          <View style={styles.friendShortcutCopy}>
            <Text style={styles.friendShortcutTitle}>Nuova chat</Text>
            <Text style={styles.friendShortcutText}>Cerca una persona tramite email e avvia una conversazione privata.</Text>
          </View>
          <Ionicons color={colors.muted} name="chevron-forward" size={20} />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat eventi</Text>
          {eventRows.length ? (
            eventRows.map(({ event, preview, subtitle, time }) => (
              <ChatRow
                key={event.id}
                accent={categoryColors[event.category]}
                iconText={categoryEmojis[event.category]}
                onPress={() => openTarget({ type: "event", id: event.id })}
                preview={preview}
                soft={categorySoftColors[event.category]}
                subtitle={subtitle}
                time={time}
                title={event.title}
              />
            ))
          ) : (
            <Text style={styles.emptyListText}>
              Partecipa a un evento o creane uno per vedere qui la chat di gruppo.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat private</Text>
          {directRows.length ? (
            directRows.map(({ chat, preview, time }) => (
              <ChatRow
                key={chat.id}
                accent={chat.accent}
                iconText={chat.name.slice(0, 1)}
                onPress={() => openTarget({ type: "direct", id: chat.id })}
                preview={preview}
                soft={chat.soft}
                subtitle={chat.status}
                time={time}
                title={chat.name}
              />
            ))
          ) : (
            <Text style={styles.emptyListText}>Cerca una persona tramite email per iniziare una chat privata.</Text>
          )}
        </View>
      </ScrollView>

      <PeoplePickerModal
        error={peopleSearchError}
        onClose={() => setPeopleOpen(false)}
        onSearchChange={setPeopleSearch}
        onStartChat={startDirectChat}
        result={peopleSearchResult}
        search={peopleSearch}
        searching={peopleSearching}
        visible={peopleOpen}
      />
    </>
  );
}

type PeoplePickerModalProps = {
  error: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onStartChat: (chat: DirectChat) => void;
  result: DirectChat | null;
  search: string;
  searching: boolean;
  visible: boolean;
};

function PeoplePickerModal({
  error,
  onClose,
  onSearchChange,
  onStartChat,
  result,
  search,
  searching,
  visible
}: PeoplePickerModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
          style={styles.peopleSheet}
        >
          <View style={styles.friendHeader}>
            <View>
              <Text style={styles.friendTitle}>Nuova chat</Text>
              <Text style={styles.friendSubtitle}>Cerca una persona usando la sua email.</Text>
            </View>
            <Pressable accessibilityLabel="Chiudi ricerca persone" accessibilityRole="button" onPress={onClose} style={styles.friendClose}>
              <Ionicons color={colors.ink} name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.friendSearchBox}>
            <Ionicons color={colors.muted} name="mail-outline" size={19} />
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={onSearchChange}
              placeholder="email@dominio.it"
              placeholderTextColor={colors.muted}
              style={styles.friendSearchInput}
              textContentType="emailAddress"
              value={search}
            />
            {search ? (
              <Pressable
                accessibilityLabel="Cancella ricerca persone"
                accessibilityRole="button"
                onPress={() => onSearchChange("")}
              >
                <Ionicons color={colors.muted} name="close-circle" size={19} />
              </Pressable>
            ) : null}
          </View>

          {searching ? <Text style={styles.emptyListText}>Cerco utente...</Text> : null}
          {error ? <Text style={styles.peopleErrorText}>{error}</Text> : null}
          {!search && !searching ? (
            <Text style={styles.emptyListText}>Inserisci un'email per trovare la persona con cui parlare.</Text>
          ) : null}
          {result ? (
            <PersonRow
              actionLabel="Avvia chat"
              chat={result}
              icon="chatbubble-ellipses-outline"
              onPress={() => onStartChat(result)}
            />
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type PersonRowProps = {
  actionLabel: string;
  chat: DirectChat;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PersonRow({ actionLabel, chat, icon, onPress }: PersonRowProps) {
  return (
    <View style={styles.friendRow}>
      <View style={[styles.friendAvatar, { backgroundColor: chat.soft, borderColor: chat.accent }]}>
        <Text style={[styles.friendAvatarText, { color: chat.accent }]}>{chat.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.friendCopy}>
        <Text style={styles.friendName}>{chat.name}</Text>
        <Text style={styles.friendStatus}>{chat.email}</Text>
        <Text style={styles.friendMeta}>{chat.city} · {chat.status}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${actionLabel} a ${chat.name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.friendAction}
      >
        <Ionicons color={colors.surface} name={icon} size={16} />
        <Text style={styles.friendActionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function ChatRow({
  accent,
  icon,
  iconText,
  onPress,
  preview,
  soft,
  subtitle,
  time,
  title,
  unread
}: ChatRowProps) {
  return (
    <Pressable
      accessibilityLabel={`Apri chat ${title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.channel, pressed && styles.channelPressed]}
    >
      <View style={[styles.channelIcon, { backgroundColor: soft, borderColor: accent }]}>
        {iconText ? (
          <Text style={styles.channelIconText}>{iconText}</Text>
        ) : (
          <Ionicons color={accent} name={icon ?? "chatbubble-ellipses-outline"} size={20} />
        )}
      </View>
      <View style={styles.channelCopy}>
        <View style={styles.channelTopRow}>
          <Text numberOfLines={1} style={styles.channelTitle}>{title}</Text>
          {time ? <Text style={styles.chatTime}>{time}</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.channelText}>{subtitle}</Text>
        <Text numberOfLines={1} style={styles.previewText}>{preview}</Text>
      </View>
      {unread ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function MessageBubble({
  message,
  onAuthorPress
}: {
  message: DisplayMessage;
  onAuthorPress?: () => void;
}) {
  return (
    <View style={[styles.bubbleRow, message.mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!message.mine ? (
          onAuthorPress ? (
            <Pressable
              accessibilityLabel={`Avvia chat con ${message.senderName}`}
              accessibilityRole="button"
              onPress={onAuthorPress}
            >
              <Text style={[styles.bubbleAuthor, styles.bubbleAuthorLink]}>{message.senderName}</Text>
            </Pressable>
          ) : (
            <Text style={styles.bubbleAuthor}>{message.senderName}</Text>
          )
        ) : null}
        <Text style={[styles.bubbleText, message.mine && styles.bubbleTextMine]}>{message.text}</Text>
        <Text style={[styles.bubbleMeta, message.mine && styles.bubbleMetaMine]}>
          {formatChatTime(message.sentAt)}
          {message.pending ? " · invio" : message.failed ? " · locale" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 48
  },
  friendShortcut: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  friendShortcutIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  friendShortcutCopy: {
    flex: 1,
    minWidth: 0
  },
  friendShortcutTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  friendShortcutText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  channel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    padding: spacing.md
  },
  channelPressed: {
    opacity: 0.78
  },
  channelIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  channelIconText: {
    fontSize: 22,
    fontWeight: "900"
  },
  channelCopy: {
    flex: 1,
    minWidth: 0
  },
  channelTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  channelTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  channelText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  previewText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.78
  },
  chatTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  unreadText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  emptyListText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  modalOverlay: {
    backgroundColor: "rgba(17,24,39,0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  friendSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: spacing.md,
    maxHeight: "82%",
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  peopleSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: spacing.md,
    maxHeight: "82%",
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  friendHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  friendTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  friendSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  friendClose: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  friendSearchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  friendSearchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 46
  },
  friendList: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  peopleErrorText: {
    backgroundColor: colors.roseSoft,
    borderColor: "#F3B7B7",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    padding: spacing.sm
  },
  friendSectionTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.sm,
    textTransform: "uppercase"
  },
  friendRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md
  },
  friendAvatar: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: "900"
  },
  friendCopy: {
    flex: 1,
    minWidth: 0
  },
  friendName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  friendStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  friendMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3
  },
  friendAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 5,
    minHeight: 38,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: spacing.sm
  },
  friendActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  chatRoot: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  chatHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  detailIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  detailIconText: {
    fontSize: 20,
    fontWeight: "900"
  },
  detailCopy: {
    flex: 1,
    minWidth: 0
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  detailSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  chatMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md
  },
  chatMetaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  messagesContainer: {
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: "flex-end",
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg
  },
  loadingText: {
    alignSelf: "center",
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  emptyConversation: {
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.xxl
  },
  emptyConversationTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  emptyConversationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  bubbleRow: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  bubbleRowMine: {
    justifyContent: "flex-end"
  },
  bubble: {
    borderRadius: radius.md,
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1
  },
  bubbleMine: {
    backgroundColor: colors.primary
  },
  bubbleAuthor: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3
  },
  bubbleAuthorLink: {
    color: colors.primary,
    textDecorationLine: "underline"
  },
  bubbleText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  bubbleTextMine: {
    color: colors.surface
  },
  bubbleMeta: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "right"
  },
  bubbleMetaMine: {
    color: "rgba(255,255,255,0.72)"
  },
  messageBox: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    ...shadow
  },
  messageInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  sendButtonDisabled: {
    opacity: 0.42
  },
  lockedComposer: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  lockedText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  }
});
