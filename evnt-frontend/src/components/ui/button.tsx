import { ComponentProps, ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../theme";

type ButtonAction = "primary" | "secondary" | "positive" | "negative" | "default";
type ButtonVariant = "solid" | "outline" | "link";

type ButtonProps = ComponentProps<typeof Pressable> & {
  action?: ButtonAction;
  children?: ReactNode;
  isDisabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

type ButtonTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

const actionColors: Record<ButtonAction, string> = {
  default: colors.ink,
  negative: colors.danger,
  positive: colors.green,
  primary: colors.primary,
  secondary: colors.teal
};

export function Button({
  action = "primary",
  children,
  disabled,
  isDisabled,
  size = "md",
  style,
  variant = "solid",
  ...props
}: ButtonProps) {
  const isOff = disabled || isDisabled;
  const accent = actionColors[action];

  return (
    <Pressable
      disabled={isOff}
      style={({ pressed }) => [
        styles.button,
        size === "sm" && styles.small,
        size === "lg" && styles.large,
        variant === "solid" && { backgroundColor: accent, borderColor: accent },
        variant === "outline" && { backgroundColor: colors.surface, borderColor: accent },
        variant === "link" && styles.link,
        pressed && !isOff && styles.pressed,
        isOff && styles.disabled,
        style
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function ButtonText({ children, style, ...props }: ButtonTextProps) {
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md
  },
  disabled: {
    backgroundColor: "#B9B2A7",
    borderColor: "#B9B2A7"
  },
  large: {
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  link: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    minHeight: 32,
    paddingHorizontal: 0
  },
  pressed: {
    opacity: 0.86
  },
  small: {
    minHeight: 38,
    paddingHorizontal: spacing.sm
  },
  text: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  }
});
