import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, hitSlop, radius } from "../theme";

type IconButtonProps = {
  accessibilityLabel: string;
  badgeCount?: number;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  onPress: () => void;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
};

const sizes = {
  lg: 52,
  md: 44
};

export function IconButton({
  accessibilityLabel,
  badgeCount = 0,
  disabled = false,
  icon,
  iconColor = colors.ink,
  iconSize = 21,
  onPress,
  size = "md",
  style
}: IconButtonProps) {
  const dimension = sizes[size];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height: dimension, width: dimension },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Ionicons color={iconColor} name={icon} size={iconSize} />
      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(badgeCount, 9)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    top: -4,
    width: 18
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900"
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    position: "relative"
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.78
  }
});
