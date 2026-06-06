import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { type Notification, type NotificationType } from "../api";
import { colors, radius, spacing } from "../theme";
import { EmptyState } from "./EmptyState";

type NotificationsModalProps = {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onPressNotification: (notification: Notification) => void;
  visible: boolean;
};

const notificationIcons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  CHAT_MESSAGE: "chatbubble-ellipses-outline",
  EVENT_CANCELLED: "close-circle-outline",
  EVENT_FULL: "people-circle-outline",
  EVENT_STARTING: "navigate-circle-outline",
  EVENT_UPDATED: "create-outline",
  LOW_SEATS: "ticket-outline",
  NEW_MATCH: "sparkles-outline",
  ORGANIZER_ANNOUNCEMENT: "megaphone-outline",
  SAVED_EVENT_REMINDER: "bookmark-outline"
};

const notificationAccents: Record<NotificationType, string> = {
  CHAT_MESSAGE: colors.teal,
  EVENT_CANCELLED: colors.danger,
  EVENT_FULL: colors.primary,
  EVENT_STARTING: colors.green,
  EVENT_UPDATED: colors.yellow,
  LOW_SEATS: colors.yellow,
  NEW_MATCH: colors.primary,
  ORGANIZER_ANNOUNCEMENT: colors.teal,
  SAVED_EVENT_REMINDER: colors.primary
};

export function NotificationsModal({
  notifications,
  onClose,
  onMarkAllRead,
  onPressNotification,
  visible
}: NotificationsModalProps) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifiche</Text>
              <Text style={styles.meta}>
                {unreadCount > 0 ? `${unreadCount} da leggere` : "Tutto letto"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Chiudi notifiche"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.iconButton}
            >
              <Ionicons color={colors.ink} name="close" size={22} />
            </Pressable>
          </View>

          {notifications.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={unreadCount === 0}
              onPress={onMarkAllRead}
              style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
            >
              <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
                Segna tutte come lette
              </Text>
            </Pressable>
          ) : null}

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <EmptyState
                body="Qui troverai promemoria, aggiornamenti e messaggi importanti sui tuoi eventi."
                icon="notifications-outline"
                title="Nessuna notifica"
              />
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onPress={() => onPressNotification(notification)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type NotificationRowProps = {
  notification: Notification;
  onPress: () => void;
};

function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const accent = notificationAccents[notification.type] ?? colors.primary;
  const icon = notificationIcons[notification.type] ?? "notifications-outline";

  return (
    <Pressable
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, !notification.isRead && styles.rowUnread]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${accent}1A` }]}>
        <Ionicons color={accent} name={icon} size={19} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {notification.title}
          </Text>
          {!notification.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text numberOfLines={2} style={styles.rowMessage}>
          {notification.message}
        </Text>
        <Text style={styles.rowTime}>{formatNotificationTime(notification.createdAt)}</Text>
      </View>
      {notification.eventId ? <Ionicons color={colors.muted} name="chevron-forward" size={18} /> : null}
    </Pressable>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 1) return "Adesso";
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.floor(hours / 24);
  return `${days} g fa`;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(17, 24, 39, 0.32)",
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
    maxHeight: "84%",
    padding: spacing.lg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  markAllButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  markAllButtonDisabled: {
    opacity: 0.55
  },
  markAllText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  markAllTextDisabled: {
    color: colors.muted
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  rowUnread: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  rowCopy: {
    flex: 1,
    gap: 3
  },
  rowTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  rowTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  rowMessage: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  rowTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  }
});
