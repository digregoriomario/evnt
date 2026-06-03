import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { Category } from "../types";
import { PillButton } from "./PillButton";

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
    <PillButton
      accent={accent}
      emoji={emoji}
      label={category}
      onPress={onPress}
      selected={selected}
      soft={soft}
    />
  );
}
