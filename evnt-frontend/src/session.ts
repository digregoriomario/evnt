import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { UserProfile } from "./types";

const SESSION_KEY = "evnt.session.v1";

export type StoredSession = {
  savedAt: string;
  token: string;
  user: UserProfile;
};

type WebStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function getWebStorage(): WebStorage | null {
  return (globalThis as unknown as { localStorage?: WebStorage }).localStorage ?? null;
}

async function readSessionValue(): Promise<string | null> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(SESSION_KEY) ?? null;
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeSessionValue(value: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(SESSION_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await readSessionValue();
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as Partial<StoredSession>;
    if (!session.token || !session.user?.email) {
      return null;
    }

    return session as StoredSession;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: Omit<StoredSession, "savedAt">): Promise<void> {
  await writeSessionValue(
    JSON.stringify({
      ...session,
      savedAt: new Date().toISOString()
    })
  );
}

export async function clearStoredSession(): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
