import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { api, type ChatMessage } from "../api";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { PillButton } from "../components/PillButton";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent, UserProfile } from "../types";

type InboxScreenProps = {
  events: EvntEvent[];
  initialEventId?: string;
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
  senderName: string;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
};

type DirectChat = {
  id: string;
  name: string;
  status: string;
  accent: string;
  soft: string;
  city: string;
  interests: string[];
  mutual: string;
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
    id: "anna",
    name: "Anna",
    status: "Sta partecipando a Sunset Jam",
    accent: "#0891B2",
    soft: "#EAFBFF",
    city: "Salerno",
    interests: ["Concerti", "Serate"],
    mutual: "2 eventi in comune"
  },
  {
    id: "luca",
    name: "Luca",
    status: "Compagno di calcetto",
    accent: "#16A34A",
    soft: "#ECFDF3",
    city: "Salerno",
    interests: ["Sport", "Social"],
    mutual: "1 amico in comune"
  },
  {
    id: "sofia",
    name: "Sofia",
    status: "Food tour e serate social",
    accent: "#EA580C",
    soft: "#FFF4E8",
    city: "Cava de' Tirreni",
    interests: ["Food", "Social"],
    mutual: "Ha partecipato a 2 eventi simili"
  },
  {
    id: "marco",
    name: "Marco",
    status: "Cerca gruppo per basket",
    accent: "#2563EB",
    soft: "#EEF5FF",
    city: "Salerno",
    interests: ["Sport", "Tech"],
    mutual: "Vicino a te"
  },
  {
    id: "giulia",
    name: "Giulia",
    status: "Mostre, teatro e aperitivi",
    accent: "#C026D3",
    soft: "#FDF0FF",
    city: "Vietri sul Mare",
    interests: ["Arte", "Serate"],
    mutual: "3 interessi compatibili"
  }
];

const isBackendEventId = (id: string) => /^\d+$/.test(id);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

function createInitialDirectMessages(userName: string): Record<string, DisplayMessage[]> {
  return {
    anna: [
      {
        id: "anna-1",
        text: "Ci vediamo direttamente al molo?",
        sentAt: minutesAgo(54),
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
    luca: [
      {
        id: "luca-1",
        text: "Ho due amici interessati al calcetto.",
        sentAt: minutesAgo(96),
        senderName: "Luca",
        mine: false
      }
    ],
    sofia: [
      {
        id: "sofia-1",
        text: "Per il food tour passo dal centro.",
        sentAt: minutesAgo(1440),
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
        senderName: event.organizer,
        mine: event.organizer.toLowerCase() === userName.toLowerCase()
      }
    ];

    if (event.chatMode === "Gruppo aperto") {
      messages.push({
        id: `${event.id}-seed-community`,
        text: "Io ci sono, qualcuno vuole incontrarsi prima?",
        sentAt: minutesAgo(46 + index * 7),
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
  initialEventId,
  online,
  registrations,
  user,
  onOpenEvent
}: InboxScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ChatTarget | null>(
    initialEventId ? { type: "event", id: initialEventId } : null
  );
  const [eventMessageMap, setEventMessageMap] = useState<Record<string, DisplayMessage[]>>({});
  const [directMessageMap, setDirectMessageMap] = useState<Record<string, DisplayMessage[]>>(() =>
    createInitialDirectMessages(user.name)
  );
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [sendingEventId, setSendingEventId] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendIds, setFriendIds] = useState<Set<string>>(() => new Set(["anna", "luca"]));

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
      ? contactProfiles.find((chat) => chat.id === selectedTarget.id)
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
      contactProfiles
        .filter((chat) => friendIds.has(chat.id))
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

          return [chat.name, chat.status, preview].join(" ").toLowerCase().includes(query);
        }),
    [directMessageMap, friendIds, query]
  );

  const selectedTitle = selectedEvent?.title ?? selectedDirect?.name ?? "";
  const selectedSubtitle = selectedEvent
    ? `${selectedEvent.chatMode} · ${selectedEvent.participants} partecipanti`
    : selectedDirect?.status ?? "";
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
    if (initialEventId) {
      setSelectedTarget({ type: "event", id: initialEventId });
    }
  }, [initialEventId]);

  useEffect(() => {
    if (!selectedEvent || !online || !isBackendEventId(selectedEvent.id)) {
      return;
    }

    let cancelled = false;
    setLoadingEventId(selectedEvent.id);

    api
      .messages(selectedEvent.id)
      .then((messages) => {
        if (cancelled) {
          return;
        }

        setEventMessageMap((current) => ({
          ...current,
          [selectedEvent.id]: messages.map((message) => mapApiMessage(message, user))
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoadingEventId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [online, selectedEvent?.id, user]);

  const openTarget = (target: ChatTarget) => {
    setDraft("");
    setSelectedTarget(target);
  };

  const openFriendChat = (chatId: string) => {
    if (!friendIds.has(chatId)) {
      return;
    }
    setFriendsOpen(false);
    openTarget({ type: "direct", id: chatId });
  };

  const addFriend = (chatId: string) => {
    setFriendIds((current) => {
      const next = new Set(current);
      next.add(chatId);
      return next;
    });
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
              <MessageBubble key={message.id} message={message} />
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chat</Text>
            <Text style={styles.subtitle}>Gruppi evento e amici.</Text>
          </View>
          <Pressable
            accessibilityLabel="Gestisci amici"
            accessibilityRole="button"
            onPress={() => setFriendsOpen(true)}
            style={styles.headerIcon}
          >
            <Ionicons color={colors.ink} name="person-add-outline" size={22} />
          </Pressable>
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
          accessibilityLabel="Apri rubrica amici"
          accessibilityRole="button"
          onPress={() => setFriendsOpen(true)}
          style={styles.friendShortcut}
        >
          <View style={styles.friendShortcutIcon}>
            <Ionicons color={colors.primary} name="people-outline" size={22} />
          </View>
          <View style={styles.friendShortcutCopy}>
            <Text style={styles.friendShortcutTitle}>Amici</Text>
            <Text style={styles.friendShortcutText}>Aggiungi persone compatibili e avvia conversazioni private.</Text>
          </View>
          <Ionicons color={colors.muted} name="chevron-forward" size={20} />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat eventi</Text>
          {eventRows.length ? (
            eventRows.map(({ event, preview, time, unread }) => (
              <ChatRow
                key={event.id}
                accent={categoryColors[event.category]}
                iconText={categoryEmojis[event.category]}
                onPress={() => openTarget({ type: "event", id: event.id })}
                preview={preview}
                soft={categorySoftColors[event.category]}
                subtitle={`${event.chatMode} · ${event.participants} partecipanti`}
                time={time}
                title={event.title}
                unread={unread}
              />
            ))
          ) : (
            <Text style={styles.emptyListText}>Iscriviti a un evento per vedere la chat qui.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amici</Text>
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
            <Text style={styles.emptyListText}>Aggiungi amici dalla rubrica per iniziare una chat privata.</Text>
          )}
        </View>
      </ScrollView>

      <FriendPickerModal
        contacts={contactProfiles}
        friendIds={friendIds}
        onAddFriend={addFriend}
        onClose={() => setFriendsOpen(false)}
        onSearchChange={setFriendSearch}
        onSelect={openFriendChat}
        search={friendSearch}
        visible={friendsOpen}
      />
    </>
  );
}

type FriendPickerModalProps = {
  contacts: DirectChat[];
  friendIds: Set<string>;
  onAddFriend: (chatId: string) => void;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (chatId: string) => void;
  search: string;
  visible: boolean;
};

function FriendPickerModal({
  contacts,
  friendIds,
  onAddFriend,
  onClose,
  onSearchChange,
  onSelect,
  search,
  visible
}: FriendPickerModalProps) {
  const normalized = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((contact) => {
    if (!normalized) {
      return true;
    }

    return [contact.name, contact.status, contact.city, contact.interests.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
  const friends = filteredContacts.filter((contact) => friendIds.has(contact.id));
  const suggestions = filteredContacts.filter((contact) => !friendIds.has(contact.id));

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.friendSheet}>
          <View style={styles.friendHeader}>
            <View>
              <Text style={styles.friendTitle}>Amici</Text>
              <Text style={styles.friendSubtitle}>Aggiungi persone e scegli con chi parlare.</Text>
            </View>
            <Pressable accessibilityLabel="Chiudi rubrica amici" accessibilityRole="button" onPress={onClose} style={styles.friendClose}>
              <Ionicons color={colors.ink} name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.friendSearchBox}>
            <Ionicons color={colors.muted} name="search-outline" size={19} />
            <TextInput
              autoCapitalize="none"
              onChangeText={onSearchChange}
              placeholder="Cerca persone"
              placeholderTextColor={colors.muted}
              style={styles.friendSearchInput}
              value={search}
            />
            {search ? (
              <Pressable
                accessibilityLabel="Cancella ricerca amici"
                accessibilityRole="button"
                onPress={() => onSearchChange("")}
              >
                <Ionicons color={colors.muted} name="close-circle" size={19} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={styles.friendList} keyboardShouldPersistTaps="handled">
            <Text style={styles.friendSectionTitle}>I tuoi amici</Text>
            {friends.length ? (
              friends.map((chat) => (
                <FriendRow
                  actionLabel="Scrivi"
                  chat={chat}
                  icon="chatbubble-ellipses-outline"
                  key={chat.id}
                  onPress={() => onSelect(chat.id)}
                />
              ))
            ) : (
              <Text style={styles.emptyListText}>Nessun amico trovato con questa ricerca.</Text>
            )}

            <Text style={styles.friendSectionTitle}>Persone suggerite</Text>
            {suggestions.length ? (
              suggestions.map((chat) => (
                <FriendRow
                  actionLabel="Aggiungi"
                  chat={chat}
                  icon="person-add-outline"
                  key={chat.id}
                  onPress={() => onAddFriend(chat.id)}
                />
              ))
            ) : (
              <Text style={styles.emptyListText}>Non ci sono altri suggerimenti.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type FriendRowProps = {
  actionLabel: string;
  chat: DirectChat;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function FriendRow({ actionLabel, chat, icon, onPress }: FriendRowProps) {
  return (
    <View style={styles.friendRow}>
      <View style={[styles.friendAvatar, { backgroundColor: chat.soft, borderColor: chat.accent }]}>
        <Text style={[styles.friendAvatarText, { color: chat.accent }]}>{chat.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.friendCopy}>
        <Text style={styles.friendName}>{chat.name}</Text>
        <Text style={styles.friendStatus}>{chat.status}</Text>
        <Text style={styles.friendMeta}>{chat.city} · {chat.mutual}</Text>
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

function MessageBubble({ message }: { message: DisplayMessage }) {
  return (
    <View style={[styles.bubbleRow, message.mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!message.mine ? <Text style={styles.bubbleAuthor}>{message.senderName}</Text> : null}
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
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
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
