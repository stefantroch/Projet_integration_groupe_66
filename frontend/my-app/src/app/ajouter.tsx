import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";

// Adresse du back. Depuis le navigateur : localhost.
// Depuis un téléphone : remplace "localhost" par l'adresse IP de ton ordinateur
// (ex. http://192.168.1.20:3000).
const API_URL = "http://localhost:3000";

type Message = { ok: boolean; text: string } | null;

export default function AjouterScreen() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    setAsset(result.assets[0]);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!asset) return;

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();

      if (Platform.OS === "web") {
        // Sur le web, il faut envoyer un vrai fichier (Blob)
        const blob = await (await fetch(asset.uri)).blob();
        formData.append("image", blob, asset.fileName ?? "photo.jpg");
      } else {
        // Sur mobile, React Native accepte cet objet
        formData.append("image", {
          uri: asset.uri,
          name: asset.fileName ?? "photo.jpg",
          type: asset.mimeType ?? "image/jpeg",
        } as any);
      }

      const response = await fetch(`${API_URL}/collection`, {
        method: "POST",
        body: formData, // pas de header Content-Type : il est ajouté automatiquement
        credentials: "include", // envoie le cookie de session
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      setMessage({ ok: true, text: "L'image a été ajoutée à la collection." });
      setAsset(null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erreur inconnue";
      setMessage({ ok: false, text: `Impossible d'ajouter l'image. ${detail}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Capturama</Text>
        <Text style={styles.title}>Ajouter à la collection</Text>
        <Text style={styles.subtitle}>Choisis une image depuis ta galerie.</Text>

        <Pressable onPress={pickImage} style={styles.preview}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={styles.placeholder}>Appuie pour choisir une image</Text>
          )}
        </Pressable>

        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [styles.buttonOutline, pressed && styles.pressed]}>
          <Text style={styles.buttonOutlineText}>
            {asset ? "Changer d'image" : "Choisir depuis la galerie"}
          </Text>
        </Pressable>

        {asset && (
          <>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                (pressed || loading) && styles.pressed,
              ]}>
              <Text style={styles.buttonText}>
                {loading ? "Ajout en cours…" : "Ajouter à la collection"}
              </Text>
            </Pressable>

            <Pressable onPress={() => setAsset(null)}>
              <Text style={styles.link}>Retirer l&apos;image</Text>
            </Pressable>
          </>
        )}

        {message && (
          <Text style={[styles.message, !message.ok && styles.messageError]}>
            {message.text}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
  },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: 8,
  },
  logo: { fontSize: 18, fontWeight: "bold", color: colors.green },
  title: { fontSize: 32, color: colors.green },
  subtitle: { fontSize: 16, color: colors.text, marginBottom: 16 },
  preview: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 320,
    alignSelf: "center",
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  image: { width: "100%", height: "100%" },
  placeholder: { color: colors.text, fontSize: 16 },
  button: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonText: { color: colors.white, textAlign: "center", fontSize: 16 },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 10,
    paddingVertical: 10,
  },
  buttonOutlineText: { color: colors.green, textAlign: "center", fontSize: 16 },
  link: { color: colors.text, textAlign: "center", fontSize: 14, paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  message: { color: colors.green, textAlign: "center", fontSize: 14, marginTop: 8 },
  messageError: { color: "#b00020" },
});
