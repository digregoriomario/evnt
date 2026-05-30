import { ComponentProps, ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadow, spacing } from "../../theme";

type CardProps = ComponentProps<typeof View> & {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  variant?: "elevated" | "outline" | "ghost" | "filled";
};

export function Card({ children, size = "md", style, variant = "elevated", ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        size === "sm" && styles.small,
        size === "lg" && styles.large,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        variant === "filled" && styles.filled,
        variant === "elevated" && shadow,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  filled: {
    backgroundColor: colors.surfaceMuted
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent"
  },
  large: {
    padding: spacing.lg
  },
  outline: {
    backgroundColor: colors.surface
  },
  small: {
    padding: spacing.sm
  }
});
