import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, shadow, spacing } from "../theme";

export type ToastTone = "success" | "info" | "warning";

type ToastBannerProps = {
  message: string;
  tone?: ToastTone;
};

const toneConfig: Record<ToastTone, { background: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: {
    background: colors.tealSoft,
    color: colors.teal,
    icon: "information-circle-outline"
  },
  success: {
    background: "#DCFCE7",
    color: colors.green,
    icon: "checkmark-circle-outline"
  },
  warning: {
    background: colors.yellowSoft,
    color: colors.yellow,
    icon: "alert-circle-outline"
  }
};

export function ToastBanner({ message, tone = "info" }: ToastBannerProps) {
  const config = toneConfig[tone];

  return (
    <View accessibilityRole="alert" style={styles.toast}>
      <View style={[styles.iconWrap, { backgroundColor: config.background }]}>
        <Ionicons color={config.color} name={config.icon} size={20} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 420,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
    ...shadow
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  message: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  }
});
