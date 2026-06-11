import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, hitSlop, shadow, spacing } from "../theme";
import { ScreenKey } from "../types";

type TabItem = {
  key: ScreenKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const tabs: TabItem[] = [
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "map", label: "Mappa", icon: "map-outline" },
  { key: "create", label: "Crea", icon: "add-circle-outline" },
  { key: "inbox", label: "Chat", icon: "chatbubbles-outline" },
  { key: "profile", label: "Profilo", icon: "person-outline" }
];

type BottomNavProps = {
  active: ScreenKey;
  badgeCounts?: Partial<Record<ScreenKey, number>>;
  onChange: (screen: ScreenKey) => void;
};

export function BottomNav({ active, badgeCounts = {}, onChange }: BottomNavProps) {
  return (
    <View style={styles.safeFrame}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const selected = active === tab.key;
          const badgeCount = badgeCounts[tab.key] ?? 0;
          const iconName = (selected
            ? tab.icon.replace("-outline", "")
            : tab.icon) as keyof typeof Ionicons.glyphMap;
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hitSlop={hitSlop}
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.item, selected && styles.activeItem]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  color={colors.ink}
                  name={iconName}
                  size={25}
                />
                {badgeCount > 0 ? (
                  <View style={styles.badge} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeFrame: {
    alignItems: "center",
    backgroundColor: "transparent",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 34,
    flexDirection: "row",
    gap: 0,
    maxWidth: 520,
    padding: 4,
    width: "100%",
    ...shadow
  },
  item: {
    alignItems: "center",
    borderRadius: 30,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.xs
  },
  activeItem: {
    backgroundColor: "#E7E7E7"
  },
  iconWrap: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    position: "relative",
    width: 40
  },
  badge: {
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    position: "absolute",
    right: -5,
    top: -1,
    width: 14
  }
});
