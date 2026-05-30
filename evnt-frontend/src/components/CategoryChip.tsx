import { StyleSheet, Text } from "react-native";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { Category } from "../types";
import { colors, shadow, spacing } from "../theme";
import { Button, ButtonText } from "./ui";

type CategoryChipProps = {
  category: Category;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ category, selected = false, onPress }: CategoryChipProps) {
  const accent = categoryColors[category];
  const emoji = categoryEmojis[category];
  const soft = categorySoftColors[category];

  return (
    <Button
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      size="sm"
      style={[
        styles.chip,
        { backgroundColor: soft, borderColor: selected ? accent : soft },
        selected && styles.chipSelected
      ]}
      variant="outline"
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <ButtonText style={[styles.label, { color: accent }]}>{category}</ButtonText>
    </Button>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 28,
    flexDirection: "row",
    gap: 6,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadow
  },
  chipSelected: {
    borderWidth: 1
  },
  emoji: {
    fontSize: 16
  },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  }
});
