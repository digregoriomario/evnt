import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../theme";

type ProfileImagePickerProps = {
  onChange: (uri: string) => void;
  value?: string;
};

function assetToUri(asset: ImagePicker.ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
  }

  return asset.uri;
}

export function ProfileImagePicker({ onChange, value }: ProfileImagePickerProps) {
  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ["images"],
      quality: 0.72
    });

    if (!result.canceled && result.assets[0]) {
      onChange(assetToUri(result.assets[0]));
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.preview}>
        {value ? (
          <Image source={{ uri: value }} style={styles.image} />
        ) : (
          <Ionicons color={colors.teal} name="image-outline" size={24} />
        )}
      </View>
      <Pressable accessibilityRole="button" onPress={pickImage} style={styles.button}>
        <Text style={styles.buttonText}>{value ? "Cambia immagine" : "Scegli immagine"}</Text>
        <Ionicons color={colors.ink} name={Platform.OS === "web" ? "cloud-upload-outline" : "images-outline"} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58
  },
  image: {
    height: "100%",
    width: "100%"
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  buttonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  }
});
