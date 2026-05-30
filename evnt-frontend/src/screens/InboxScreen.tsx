import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "../theme";
import { EvntEvent } from "../types";

type InboxScreenProps = {
  events: EvntEvent[];
  onOpenEvent: (event: EvntEvent) => void;
};

const directChats = [
  { id: "anna", name: "Anna", message: "Ci vediamo direttamente al molo?", time: "18:42" },
  { id: "luca", name: "Luca", message: "Ho due amici interessati al calcetto.", time: "17:10" },
  { id: "sofia", name: "Sofia", message: "Per il food tour passo dal centro.", time: "Ieri" }
];

export function InboxScreen({ events, onOpenEvent }: InboxScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Gruppi evento e messaggi personali.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons color={colors.teal} name="chatbubbles-outline" size={22} />
        </View>
      </View>

      <View style={styles.composer}>
        <Ionicons color={colors.muted} name="search-outline" size={20} />
        <TextInput
          placeholder="Cerca chat o persone"
          placeholderTextColor={colors.muted}
          style={styles.composerInput}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gruppi evento</Text>
        {events.slice(0, 4).map((event) => (
          <Pressable key={event.id} onPress={() => onOpenEvent(event)} style={styles.channel}>
            <View style={styles.channelIcon}>
              <Ionicons
                color={colors.teal}
                name={event.chatMode === "Gruppo aperto" ? "chatbubbles-outline" : "megaphone-outline"}
                size={20}
              />
            </View>
            <View style={styles.channelCopy}>
              <Text numberOfLines={1} style={styles.channelTitle}>{event.title}</Text>
              <Text numberOfLines={1} style={styles.channelText}>
                {event.chatMode} · {event.participants} partecipanti
              </Text>
            </View>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{event.status === "live" ? "3" : "1"}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Persone</Text>
        {directChats.map((chat) => (
          <View key={chat.id} style={styles.channel}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>{chat.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.channelCopy}>
              <Text style={styles.channelTitle}>{chat.name}</Text>
              <Text numberOfLines={1} style={styles.channelText}>{chat.message}</Text>
            </View>
            <Text style={styles.chatTime}>{chat.time}</Text>
          </View>
        ))}
      </View>

      <View style={styles.messageBox}>
        <TextInput
          placeholder="Scrivi un messaggio"
          placeholderTextColor={colors.muted}
          style={styles.messageInput}
        />
        <Pressable accessibilityLabel="Invia messaggio" style={styles.sendButton}>
          <Ionicons color={colors.surface} name="send" size={18} />
        </Pressable>
      </View>
    </ScrollView>
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
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  composer: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  composerInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    minHeight: 48
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
    minHeight: 72,
    padding: spacing.md
  },
  channelIcon: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  channelCopy: {
    flex: 1
  },
  channelTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  channelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3
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
  personAvatar: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  personInitial: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  chatTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  messageBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  messageInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  }
});
