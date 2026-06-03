import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../theme";

type LocationFallbackBannerProps = {
  city: string;
  onRetry: () => void;
};

export function LocationFallbackBanner({ city, onRetry }: LocationFallbackBannerProps) {
  return (
    <View style={styles.locationBanner}>
      <View style={styles.locationBannerIcon}>
        <Ionicons color={colors.ink} name="location-outline" size={19} />
      </View>
      <View style={styles.locationBannerCopy}>
        <Text style={styles.locationBannerTitle}>Geolocalizzazione non attiva</Text>
        <Text style={styles.locationBannerText}>
          Stai vedendo gli eventi basati sulla citta indicata: {city}.
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.locationRetry}>
        <Text style={styles.locationRetryText}>Riprova</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  locationBanner: {
    alignItems: "center",
    backgroundColor: "#FFF7DF",
    borderColor: "#F3D28A",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  locationBannerCopy: {
    flex: 1,
    gap: 2
  },
  locationBannerIcon: {
    alignItems: "center",
    backgroundColor: "#FFE9A8",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  locationBannerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  locationBannerTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  locationRetry: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  locationRetryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  }
});
