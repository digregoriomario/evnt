import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, hitSlop, radius, spacing } from "../theme";
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
            <View style={[styles.iconWrap, selected && styles.activeIconWrap]}>
              <Ionicons
                color={selected ? colors.surface : colors.muted}
                name={iconName}
                size={21}
              />
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{Math.min(badgeCount, 9)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, selected && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  item: {
    alignItems: "center",
    borderRadius: radius.md,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 56
  },
  activeItem: {
    backgroundColor: "transparent"
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 44
  },
  activeIconWrap: {
    backgroundColor: colors.ink
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -10,
    top: -8,
    width: 18
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900"
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  activeLabel: {
    color: colors.primary
  }
});
