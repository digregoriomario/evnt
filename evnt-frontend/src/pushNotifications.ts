import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushNotificationData = {
  eventId?: string;
  notificationId?: number;
  type?: string;
};

type PushRegistrationResult =
  | { status: "registered"; token: string }
  | { reason: "denied" | "missing-project-id" | "unsupported" | "unavailable"; status: "skipped" };

type ListenerSubscription = {
  remove: () => void;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function getProjectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

function notificationDataFromUnknown(data: unknown): PushNotificationData {
  if (!data || typeof data !== "object") {
    return {};
  }

  const record = data as Record<string, unknown>;
  const eventId =
    typeof record.eventId === "string" || typeof record.eventId === "number"
      ? String(record.eventId)
      : undefined;
  const notificationId =
    typeof record.notificationId === "number"
      ? record.notificationId
      : typeof record.notificationId === "string"
        ? Number(record.notificationId)
        : undefined;
  const type = typeof record.type === "string" ? record.type : undefined;

  return {
    eventId,
    notificationId: Number.isFinite(notificationId) ? notificationId : undefined,
    type
  };
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
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
  if (Platform.OS === "web") {
    return { remove: () => undefined };
  }

  return Notifications.addPushTokenListener((token) => listener(token.data));
}

export function addPushNotificationResponseListener(
  listener: (data: PushNotificationData) => void
): ListenerSubscription {
  if (Platform.OS === "web") {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    listener(notificationDataFromUnknown(response.notification.request.content.data));
  });
}
