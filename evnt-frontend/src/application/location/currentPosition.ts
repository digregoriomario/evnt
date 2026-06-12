import * as Location from "expo-location";
import { Platform } from "react-native";

import type { Coordinates } from "../../types";

async function hasEnabledLocationServices() {
  try {
    if (Platform.OS !== "web") {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return false;
      }

      const providerStatus = await Location.getProviderStatusAsync();
      if (providerStatus.locationServicesEnabled === false) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function canRequestCurrentCoordinates(): Promise<boolean> {
  try {
    const servicesEnabled = await hasEnabledLocationServices();
    if (!servicesEnabled) {
      return false;
    }

    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}

export async function requestCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    const servicesEnabled = await hasEnabledLocationServices();
    if (!servicesEnabled) {
      return null;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return null;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    return {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    };
  } catch {
    return null;
  }
}
