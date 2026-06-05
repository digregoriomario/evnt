import Constants from "expo-constants";
import { Platform } from "react-native";

// Base URL of the Evnt backend.
// Override at build/run time with EXPO_PUBLIC_API_URL (Expo inlines EXPO_PUBLIC_* vars).
// Defaults are sensible per-platform for local development:
//  - web / iOS simulator: localhost
//  - Android emulator: 10.0.2.2 maps to the host machine's localhost
const backendPort = 4000;
const apiPath = "/api";

type ExpoRuntimeConstants = typeof Constants & {
  expoConfig?: { hostUri?: string };
  manifest?: { debuggerHost?: string; hostUri?: string };
  manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
};

function cleanBaseUrl(value?: string | null) {
  return value?.trim().replace(/\/+$/, "") || undefined;
}

function hostFromUrlLike(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    return url.hostname;
  } catch {
    return value.split(":")[0]?.replace(/^\/\//, "") || undefined;
  }
}

function baseUrlFromHost(host?: string) {
  return host ? `http://${host}:${backendPort}${apiPath}` : undefined;
}

function expoDevHost() {
  const constants = Constants as ExpoRuntimeConstants;
  const hostUris = [
    constants.expoConfig?.hostUri,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.manifest?.hostUri,
    constants.manifest?.debuggerHost
  ];

  for (const hostUri of hostUris) {
    const host = hostFromUrlLike(hostUri);
    if (host) return host;
  }

  return undefined;
}

function browserHost() {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  return window.location.hostname;
}

function isLocalNetworkHost(host?: string) {
  return (
    !!host &&
    (host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host))
  );
}

function localHttpVariant(value?: string) {
  if (!value?.startsWith("https://")) return undefined;
  const host = hostFromUrlLike(value);
  return isLocalNetworkHost(host) ? value.replace(/^https:\/\//, "http://") : undefined;
}

function unique(values: Array<string | undefined>) {
  return values.filter((value, index, all): value is string => !!value && all.indexOf(value) === index);
}

const configuredBaseUrl = cleanBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export const API_BASE_URLS = unique([
  configuredBaseUrl,
  localHttpVariant(configuredBaseUrl),
  baseUrlFromHost(expoDevHost()),
  baseUrlFromHost(browserHost()),
  Platform.OS === "android" ? `http://10.0.2.2:${backendPort}${apiPath}` : undefined,
  `http://localhost:${backendPort}${apiPath}`
]);

export const API_BASE_URL = API_BASE_URLS[0];
