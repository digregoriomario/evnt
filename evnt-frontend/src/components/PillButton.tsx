import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";

import { colors, hitSlop, spacing } from "../theme";

type PillButtonProps = {
  accent?: string;
  accessibilityLabel?: string;
  emoji?: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  soft?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PillButton({
  accent = colors.ink,
  accessibilityLabel,
  emoji,
  label,
  onPress,
  selected = false,
  soft = colors.surfaceMuted,
  style,
  textStyle
}: PillButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      disabled={!onPress}
      hitSlop={onPress ? hitSlop : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: soft, borderColor: selected ? accent : soft },
        selected && styles.selected,
        pressed && onPress && styles.pressed,
        !onPress && styles.disabled,
        style
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text numberOfLines={1} style={[styles.label, { color: accent }, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 1
  },
  emoji: {
    fontSize: 15,
    lineHeight: 17
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17
  },
  pill: {
    alignItems: "center",
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  pressed: {
    opacity: 0.86
  },
  selected: {
    borderWidth: 1
  }
});
