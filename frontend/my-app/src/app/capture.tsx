import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@/constants/colors";

export default function CaptureScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const takePhoto = async () => {
    setErrorMessage("");

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Autorise l'accès à la caméra pour capturer un animal.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capturer</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={styles.previewText}>Aucune photo</Text>
        </View>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        onPress={takePhoto}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.buttonText}>
          {photoUri ? "Reprendre une photo" : "Prendre une photo"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  title: { fontSize: 32, color: colors.green, textAlign: "center" },
  preview: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 3 / 4,
    alignSelf: "center",
    borderRadius: 20,
  },
  placeholder: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { color: colors.text },
  error: { color: colors.error, textAlign: "center" },
  button: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: colors.green,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: colors.white, fontSize: 16 },
});