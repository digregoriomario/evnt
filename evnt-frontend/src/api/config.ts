const apiPath = "/api";

function cleanBaseUrl(value?: string | null) {
  return value?.trim().replace(/\/+$/, "") || undefined;
}

function unique(values: Array<string | undefined>) {
  return values.filter((value, index, all): value is string => !!value && all.indexOf(value) === index);
}

const configuredBaseUrl = cleanBaseUrl(process.env.EXPO_PUBLIC_API_URL);
const remoteUrl = `http://evnt.dedor.it:8080${apiPath}`;

export const API_BASE_URLS = unique([configuredBaseUrl, remoteUrl]);

export const API_BASE_URL = API_BASE_URLS[0];
