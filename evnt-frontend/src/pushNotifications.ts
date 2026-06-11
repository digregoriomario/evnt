import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

export type PushNotificationData = {
  eventId?: string;
  notificationId?: number;
  type?: string;
};

type PushRegistrationResult =
  | { status: "registered"; token: string }
  | {
      reason:
        | "denied"
        | "expo-go"
        | "missing-project-id"
        | "simulator"
        | "unsupported"
        | "unavailable";
      status: "skipped";
    };

type ListenerSubscription = {
  remove: () => void;
};

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

function runsInExpoGo() {
  return Constants.appOwnership === "expo";
}

function canUseNativeNotifications() {
  return Platform.OS !== "web" && !runsInExpoGo();
}

async function loadNotificationsModule() {
  if (!canUseNativeNotifications()) {
    return null;
  }

  notificationsModulePromise ??= import("expo-notifications");
  const Notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

function getProjectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

function pushDataStringId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function pushDataNumericId(value: unknown) {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : undefined;

  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : undefined;
}

function notificationDataFromUnknown(data: unknown): PushNotificationData {
  if (!data || typeof data !== "object") {
    return {};
  }

  const record = data as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;

  return {
    eventId: pushDataStringId(record.eventId),
    notificationId: pushDataNumericId(record.notificationId),
    type
  };
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    return { reason: "unsupported", status: "skipped" };
  }

  if (runsInExpoGo()) {
    return { reason: "expo-go", status: "skipped" };
  }

  if (!Device.isDevice) {
    return { reason: "simulator", status: "skipped" };
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return { reason: "unsupported", status: "skipped" };
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("events", {
        importance: Notifications.AndroidImportance.MAX,
        lightColor: "#0F172A",
        name: "Eventi e chat",
        vibrationPattern: [0, 250, 250, 250]
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;

    if (finalStatus !== "granted") {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== "granted") {
      return { reason: "denied", status: "skipped" };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return { reason: "missing-project-id", status: "skipped" };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: "registered", token: token.data };
  } catch {
    return { reason: "unavailable", status: "skipped" };
  }
}

export function addPushTokenRefreshListener(listener: (token: string) => void): ListenerSubscription {
  if (!canUseNativeNotifications()) {
    return { remove: () => undefined };
  }

  let removed = false;
  let subscription: ListenerSubscription | undefined;

  void loadNotificationsModule()
    .then((Notifications) => {
      if (!Notifications || removed) {
        return;
      }

      subscription = Notifications.addPushTokenListener((token) => listener(token.data));
      if (removed) {
        subscription.remove();
      }
    })
    .catch(() => undefined);

  return {
    remove: () => {
      removed = true;
      subscription?.remove();
    }
  };
}

export function addPushNotificationResponseListener(
  listener: (data: PushNotificationData) => void
): ListenerSubscription {
  if (!canUseNativeNotifications()) {
    return { remove: () => undefined };
  }

  let removed = false;
  let subscription: ListenerSubscription | undefined;

  void loadNotificationsModule()
    .then((Notifications) => {
      if (!Notifications || removed) {
        return;
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        listener(notificationDataFromUnknown(response.notification.request.content.data));
      });
      if (removed) {
        subscription.remove();
      }
    })
    .catch(() => undefined);

  return {
    remove: () => {
      removed = true;
      subscription?.remove();
    }
  };
}
