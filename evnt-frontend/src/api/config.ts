import { Platform } from "react-native";

// Base URL of the Evnt backend.
// Override at build/run time with EXPO_PUBLIC_API_URL (Expo inlines EXPO_PUBLIC_* vars).
// Defaults are sensible per-platform for local development:
//  - web / iOS simulator: localhost
//  - Android emulator: 10.0.2.2 maps to the host machine's localhost
function defaultBaseUrl(): string {
  const port = 4000;
  if (Platform.OS === "android") return `http://10.0.2.2:${port}/api`;
  return `http://localhost:${port}/api`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? defaultBaseUrl();
