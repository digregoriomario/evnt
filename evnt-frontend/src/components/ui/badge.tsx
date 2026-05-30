import { ComponentProps, ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../theme";

type BadgeProps = ComponentProps<typeof View> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

type BadgeTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

export function Badge({ children, style, ...props }: BadgeProps) {
  return (
    <View style={[styles.badge, style]} {...props}>
      {children}
    </View>
  );
}

export function BadgeText({ children, style, ...props }: BadgeTextProps) {
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  text: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  }
});
