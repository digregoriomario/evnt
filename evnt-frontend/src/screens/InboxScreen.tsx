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

import { api, type ChatMessage, type UserSearchResult } from "../api";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { PillButton } from "../components/PillButton";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent, UserProfile } from "../types";

type InboxScreenProps = {
  events: EvntEvent[];
  onRefresh: () => Promise<void>;
  online: boolean;
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

const contactProfiles: DirectChat[] = [
  {
    id: "anna.rossi@evnt.app",
    email: "anna.rossi@evnt.app",
    name: "Anna",
    status: "Sta partecipando a Sunset Jam",
    accent: "#0891B2",
    soft: "#EAFBFF",
    city: "Salerno",
    interests: ["Concerti", "Serate"]
  },
  {
    id: "luca.verdi@evnt.app",
    email: "luca.verdi@evnt.app",
    name: "Luca",
    status: "Compagno di calcetto",
    accent: "#16A34A",
    soft: "#ECFDF3",
    city: "Salerno",
    interests: ["Sport", "Social"]
  },
  {
    id: "sofia.bianchi@evnt.app",
    email: "sofia.bianchi@evnt.app",
    name: "Sofia",
    status: "Food tour e serate social",
    accent: "#EA580C",
    soft: "#FFF4E8",
    city: "Cava de' Tirreni",
    interests: ["Food", "Social"]
  },
  {
    id: "marco.neri@evnt.app",
    email: "marco.neri@evnt.app",
    name: "Marco",
    status: "Cerca gruppo per basket",
    accent: "#2563EB",
    soft: "#EEF5FF",
    city: "Salerno",
    interests: ["Sport", "Tech"]
  },
  {
    id: "giulia.russo@evnt.app",
    email: "giulia.russo@evnt.app",
    name: "Giulia",
    status: "Mostre, teatro e aperitivi",
    accent: "#C026D3",
    soft: "#FDF0FF",
    city: "Vietri sul Mare",
    interests: ["Arte", "Serate"]
  }
];

const isBackendEventId = (id: string) => /^\d+$/.test(id);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const normalizedEmail = (value: string) => value.trim().toLowerCase();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailFromName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

  return `${slug || "utente"}@evnt.app`;
}

function profileMapFromContacts(contacts: DirectChat[]) {
  return contacts.reduce<Record<string, DirectChat>>((acc, contact) => {
    acc[contact.id] = contact;
    return acc;
  }, {});
}

function profileFromUser(user: UserSearchResult): DirectChat {
  return {
    id: normalizedEmail(user.email),
    email: normalizedEmail(user.email),
    name: user.name,
    status: "Conversazione privata",
    accent: colors.primary,
    soft: colors.surfaceMuted,
    city: user.city || "Citta non indicata",
    interests: []
  };
}

function createInitialDirectMessages(userName: string): Record<string, DisplayMessage[]> {
  return {
    "anna.rossi@evnt.app": [
      {
        id: "anna-1",
        text: "Ci vediamo direttamente al molo?",
        sentAt: minutesAgo(54),
        senderEmail: "anna.rossi@evnt.app",
        senderName: "Anna",
        mine: false
      },
      {
        id: "anna-2",
        text: "Si, arrivo dieci minuti prima cosi ci troviamo con calma.",
        sentAt: minutesAgo(38),
        senderName: userName,
        mine: true
      }
    ],
    "luca.verdi@evnt.app": [
      {
        id: "luca-1",
        text: "Ho altre due persone interessate al calcetto.",
        sentAt: minutesAgo(96),
        senderEmail: "luca.verdi@evnt.app",
        senderName: "Luca",
        mine: false
      }
    ],
    "sofia.bianchi@evnt.app": [
      {
        id: "sofia-1",
        text: "Per il food tour passo dal centro.",
        sentAt: minutesAgo(1440),
        senderEmail: "sofia.bianchi@evnt.app",
        senderName: "Sofia",
        mine: false
      }
    ]
  };
}

function createEventSeedMessages(events: EvntEvent[], userName: string): Record<string, DisplayMessage[]> {
  return events.reduce<Record<string, DisplayMessage[]>>((acc, event, index) => {
    const firstText =
      event.chatMode === "Solo annunci"
        ? `Aggiornamento da ${event.organizer}: confermato ${event.place} alle ${event.time}.`
        : `Benvenuti nella chat di ${event.title}. Usiamola per organizzarci prima dell'evento.`;

    const messages: DisplayMessage[] = [
      {
        id: `${event.id}-seed-organizer`,
        text: firstText,
        sentAt: minutesAgo(150 + index * 19),
        senderEmail: emailFromName(event.organizer),
        senderName: event.organizer,
        mine: event.organizer.toLowerCase() === userName.toLowerCase()
      }
    ];

    if (event.chatMode === "Gruppo aperto") {
      messages.push({
        id: `${event.id}-seed-community`,
        text: "Io ci sono, qualcuno vuole incontrarsi prima?",
        sentAt: minutesAgo(46 + index * 7),
        senderEmail: "community@evnt.app",
        senderName: "Community Evnt",
        mine: false
      });
    }

    acc[event.id] = messages;
    return acc;
  }, {});
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
  onRefresh,
  online,
  registrations,
  user,
  onOpenEvent
}: InboxScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ChatTarget | null>(null);
  const [eventMessageMap, setEventMessageMap] = useState<Record<string, DisplayMessage[]>>({});
  const [directMessageMap, setDirectMessageMap] = useState<Record<string, DisplayMessage[]>>(() =>
    createInitialDirectMessages(user.name)
  );
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [sendingEventId, setSendingEventId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [peopleSearchError, setPeopleSearchError] = useState("");
  const [peopleSearchResult, setPeopleSearchResult] = useState<DirectChat | null>(null);
  const [directProfiles, setDirectProfiles] = useState<Record<string, DirectChat>>(() =>
    profileMapFromContacts(contactProfiles)
  );
  const [directChatIds, setDirectChatIds] = useState<Set<string>>(
    () => new Set(Object.keys(createInitialDirectMessages(user.name)))
  );

  const seededEventMessages = useMemo(
    () => createEventSeedMessages(events, user.name),
    [events, user.name]
  );

  const selectedEvent =
    selectedTarget?.type === "event"
      ? events.find((event) => event.id === selectedTarget.id)
      : undefined;
  const selectedDirect =
    selectedTarget?.type === "direct"
      ? directProfiles[selectedTarget.id]
      : undefined;

  const selectedMessages = selectedEvent
    ? eventMessageMap[selectedEvent.id] ?? seededEventMessages[selectedEvent.id] ?? []
    : selectedDirect
      ? directMessageMap[selectedDirect.id] ?? []
      : [];

  const query = search.trim().toLowerCase();

  const eventRows = useMemo(
    () =>
      events
        .filter((event) => {
          const organizerMatches = event.organizer.trim().toLowerCase() === user.name.trim().toLowerCase();
          const hasLocalMessages = Boolean(eventMessageMap[event.id]?.length);
          return registrations.has(event.id) || organizerMatches || hasLocalMessages;
        })
        .map((event) => {
          const messages = eventMessageMap[event.id] ?? seededEventMessages[event.id] ?? [];
          const last = messages[messages.length - 1];
          return {
            event,
            preview: lastPreview(messages, `${event.chatMode} con ${event.participants} partecipanti`),
            time: formatChatTime(last?.sentAt),
            unread: event.status === "live" ? 2 : event.status === "trending" ? 1 : undefined
          };
        })
        .filter(({ event, preview }) => {
          if (!query) {
            return true;
          }

          return [event.title, event.organizer, getEventSubcategoryLabel(event), preview]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }),
    [eventMessageMap, events, query, registrations, seededEventMessages, user.name]
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

    const localProfile = directProfiles[email] ?? contactProfiles.find((contact) => contact.email === email);
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      if (selectedEvent) {
        await loadEventMessages(selectedEvent.id, false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadEventMessages, onRefresh, selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    void loadEventMessages(selectedEvent.id);
  }, [loadEventMessages, selectedEvent?.id]);

  const openTarget = (target: ChatTarget) => {
    setDraft("");
    setSelectedTarget(target);
  };

  const startDirectChat = (chat: DirectChat) => {
    const chatId = normalizedEmail(chat.email);
    const normalizedChat = { ...chat, id: chatId, email: chatId };

    setDirectProfiles((current) => ({ ...current, [chatId]: normalizedChat }));
    setDirectChatIds((current) => {
      const next = new Set(current);
      next.add(chatId);
      return next;
    });
    setPeopleOpen(false);
    setPeopleSearch("");
    setPeopleSearchResult(null);
    setPeopleSearchError("");
    openTarget({ type: "direct", id: chatId });
  };

  const directContactFromMessage = (message: DisplayMessage) => {
    if (message.mine) {
      return null;
    }

    const email = normalizedEmail(message.senderEmail ?? emailFromName(message.senderName));
    return directProfiles[email] ?? {
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
      [eventId]: [...(current[eventId] ?? seededEventMessages[eventId] ?? []), message]
    }));
  };

  const appendDirectMessage = (chatId: string, message: DisplayMessage) => {
    setDirectMessageMap((current) => ({
      ...current,
      [chatId]: [...(current[chatId] ?? []), message]
    }));
  };

  const replaceOptimisticEventMessage = (
    eventId: string,
    localId: string,
    nextMessage: DisplayMessage
  ) => {
    setEventMessageMap((current) => ({
      ...current,
      [eventId]: (current[eventId] ?? []).map((message) =>
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
      pending:
        selectedTarget.type === "event" && online && isBackendEventId(selectedTarget.id)
    };

    setDraft("");

    if (selectedTarget.type === "direct") {
      appendDirectMessage(selectedTarget.id, localMessage);
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
              disabled={!canSend || sendingEventId === selectedEvent?.id}
              onPress={sendMessage}
              style={[styles.sendButton, (!canSend || sendingEventId === selectedEvent?.id) && styles.sendButtonDisabled]}
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
            <Text style={styles.subtitle}>Conversazioni private.</Text>
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
