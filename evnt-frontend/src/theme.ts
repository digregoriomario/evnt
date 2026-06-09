import { Platform } from "react-native";

export const colors = {
  background: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F6",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E2E8F0",
  primary: "#0F172A",
  primaryDark: "#020617",
  teal: "#2563EB",
  tealSoft: "#DBEAFE",
  yellow: "#F59E0B",
  yellowSoft: "#FEF3C7",
  roseSoft: "#FEE2E2",
  green: "#16A34A",
  danger: "#DC2626"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12
};

export const typography = {
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 0,
    lineHeight: 18
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700" as const
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900" as const,
    lineHeight: 27
  }
};

export const form = {
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0,
    lineHeight: 16
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0,
    lineHeight: 17
  },
  label: typography.label
};

export const hitSlop = {
  bottom: 8,
  left: 8,
  right: 8,
  top: 8
};

export const shadow =
  Platform.OS === "web"
    ? {
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.05)"
      }
    : {
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2
      };
