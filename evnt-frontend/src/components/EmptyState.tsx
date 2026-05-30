import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "../theme";
import { Card, Text, VStack } from "./ui";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  return (
    <Card style={styles.container} variant="outline">
      <Ionicons color={colors.teal} name={icon} size={28} />
      <VStack style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.xl
  },
  copy: {
    gap: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
