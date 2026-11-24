import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@/constants/colors";

// Adresse du service de reconnaissance (ai-recognition, port 8000).
// Même logique que pour l'API : l'IP du PC qui fait tourner Expo en mode téléphone.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
const RECOGNITION_URL =
  process.env.EXPO_PUBLIC_RECOGNITION_URL ??
  (Platform.OS === "web" ? "http://localhost:8000" : `http://${devHost}:8000`);

// Réponse de POST /predict (espèces les plus probables)
type Prediction = { species: string; score: number };
type PredictionResponse = { predictions: Prediction[] };

export default function CaptureScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [identifying, setIdentifying] = useState(false);

  // Envoie la photo au modèle d'IA et affiche les espèces proposées
  const identifyAnimal = async () => {
    if (!photoUri) return;
    setErrorMessage("");
    setPredictions([]);
    setIdentifying(true);

    try {
      const form = new FormData();
      // Format attendu par React Native pour un fichier local
      form.append("image", {
        uri: photoUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      const response = await fetch(`${RECOGNITION_URL}/predict`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      const result: PredictionResponse = await response.json();
      setPredictions(result.predictions);
    } catch {
      setErrorMessage("Impossible de reconnaître l'animal. Réessaie.");
    } finally {
      setIdentifying(false);
    }
  };

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
      setPredictions([]);
    }
  };

  const pickImage = async () => {
    setErrorMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Autorise l'accès à la galerie pour importer une image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPredictions([]);
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

      {photoUri ? (
        <Pressable
          onPress={identifyAnimal}
          disabled={identifying}
          style={({ pressed }) => [
            styles.button,
            (pressed || identifying) && { opacity: 0.6 },
          ]}
        >
          {identifying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{"Reconnaître l'animal"}</Text>
          )}
        </Pressable>
      ) : null}

      {predictions.length > 0 ? (
        <View style={styles.results}>
          {predictions.map((p) => (
            <Text key={p.species} style={styles.resultText}>
              {p.species} : {Math.round(p.score * 100)} %
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={takePhoto}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.buttonText}>
          {photoUri ? "Reprendre une photo" : "Prendre une photo"}
        </Text>
      </Pressable>

      <Pressable
        onPress={pickImage}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Importer une image
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
  results: { gap: 6, alignItems: "center" },
  resultText: { color: colors.text, fontSize: 16 },
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
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
  },
  secondaryButtonText: { color: colors.green },
});