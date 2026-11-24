import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { File as ExpoFile } from "expo-file-system";
import { fetch } from "expo/fetch";
import * as ImagePicker from "expo-image-picker";
import { API_URL, authClient } from "@/lib/auth-client";
import { colors } from "@/constants/colors";

type ResultatCapture = {
  statut: "reconnu" | "incertain" | "inconnu";
  prediction: { species: string; score: number };
  animal: { idAnimal: number; nom: string } | null;
  nouveauDeblocage: boolean;
  dejaDebloque: boolean;
};

export default function CaptureScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [resultat, setResultat] = useState<ResultatCapture | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const verrou = useRef(false);
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
      setPhoto(result.assets[0]);
      setResultat(null);
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
      setPhoto(result.assets[0]);
      setResultat(null);
    }
  };

  const analyserPhoto = async () => {
    if (!photo || verrou.current || resultat) return;
    verrou.current = true;
    setAnalyseEnCours(true);
    setErrorMessage("");
    const controleur = new AbortController();
    const delai = setTimeout(() => controleur.abort(), 45_000);
    try {
      const formulaire = new FormData();
      if (Platform.OS === "web") {
        const fichier = photo.file ?? (await (await fetch(photo.uri)).blob());
        formulaire.append("image", fichier, photo.fileName ?? "photo.jpg");
      } else {
        // Expo 58 attend un fichier lisible (bytes), pas un simple objet URI.
        formulaire.append("image", new ExpoFile(photo.uri));
      }
      const cookie =
        Platform.OS !== "web" ? await authClient.getCookie() : undefined;
      const reponse = await fetch(`${API_URL}/api/photos`, {
        method: "POST",
        credentials: "include",
        headers: cookie ? { Cookie: cookie } : undefined,
        body: formulaire,
        signal: controleur.signal,
      });
      if (reponse.status === 401)
        throw new Error("Connecte-toi pour enregistrer une capture.");
      if (!reponse.ok) {
        const erreur = await reponse.json().catch(() => null);
        throw new Error(
          typeof erreur?.message === "string"
            ? erreur.message
            : "L’analyse a échoué. Réessaie.",
        );
      }
      setResultat(await reponse.json());
    } catch (erreur) {
      setErrorMessage(
        erreur instanceof Error
          ? erreur.message
          : "Impossible de joindre le serveur.",
      );
    } finally {
      clearTimeout(delai);
      verrou.current = false;
      setAnalyseEnCours(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        disabled={analyseEnCours}
        onPress={takePhoto}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.buttonText}>
          {photoUri ? "Reprendre une photo" : "Prendre une photo"}
        </Text>
      </Pressable>

      <Pressable
        disabled={analyseEnCours}
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
      {photo && !resultat ? (
        <Pressable
          disabled={analyseEnCours}
          onPress={analyserPhoto}
          style={[styles.button, analyseEnCours && { opacity: 0.6 }]}
        >
          {analyseEnCours ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Reconnaître l’animal</Text>
          )}
        </Pressable>
      ) : null}
      {resultat?.statut === "reconnu" ? (
        <Pressable
          onPress={() => router.push("/collection")}
          style={[styles.button, styles.secondaryButton]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Voir ma collection
          </Text>
        </Pressable>
      ) : null}
      {resultat ? (
        <View accessibilityLiveRegion="polite">
          <Text style={styles.resultat}>
            {resultat.statut === "reconnu"
              ? `${resultat.animal?.nom} — ${resultat.nouveauDeblocage ? "Nouvel animal débloqué !" : "Déjà débloqué, nouvelle capture enregistrée."}`
              : resultat.statut === "incertain"
                ? "Photo trop incertaine. Reprends une photo plus nette de l’animal."
                : "Cette espèce n’est pas encore disponible dans la collection."}
          </Text>
          <Text style={styles.previewText}>
            Score du modèle : {Math.round(resultat.prediction.score * 100)} %
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  title: { fontSize: 32, color: colors.green, textAlign: "center" },
  preview: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 4 / 3,
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
  resultat: {
    color: colors.green,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
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
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
  },
  secondaryButtonText: { color: colors.green },
});
