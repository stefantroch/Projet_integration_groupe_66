import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { colors } from "@/constants/colors";
import { authClient } from "@/lib/auth-client";

const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "http://localhost:3000" : `http://${devHost}:3000`);

// Réponse de GET /api/animaux/collection
// (tous les animaux, avec `debloque` selon l'utilisateur connecté)
// `debloque` = une ligne existe dans AnimalDebloque pour l'utilisateur connecté.
type Animal = {
  idAnimal: number;
  nom: string;
  imageFiche: string; // URL, ou vide / autre chose tant qu'il n'y a pas d'image
  debloque: boolean;
};

// Seules les URLs http(s) sont affichées ; sinon on retombe sur le placeholder.
const hasImage = (imageFiche: string) => /^https?:\/\//.test(imageFiche);

// true  => les animaux non débloqués affichent "???"
// false => le nom reste visible mais grisé
const HIDE_LOCKED_NAMES = false;

const MUTED = "#566056";

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

async function getApi<T>(path: string): Promise<T> {
  const { data, error } = await authClient.$fetch<T>(path, {
    method: "GET",
    baseURL: `${API_URL}/api`,
  });
  if (error || !data) {
    throw new Error(`Erreur ${error?.status ?? ""}`.trim());
  }
  return data;
}

export default function CollectionScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getApi<Animal[]>("/animaux");
        // Ordre de l'id (comme un Pokédex)
        setAnimals([...list].sort((a, b) => a.idAnimal - b.idAnimal));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unlockedCount = animals.filter((a) => a.debloque).length;
  const total = animals.length;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <Text style={styles.subtitle}>Impossible de charger ta collection ({error}).</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>

      <Text style={styles.title}>Ma collection</Text>
      <Text style={styles.subtitle}>Capture des animaux pour les débloquer.</Text>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>
            {unlockedCount} / {total}
          </Text>
          <Text style={styles.summaryLabel}>animaux débloqués</Text>
        </View>
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              { width: `${total ? clamp(unlockedCount / total) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      {total === 0 ? (
        <Text style={styles.empty}>Aucun animal disponible pour le moment.</Text>
      ) : (
        <View style={styles.grid}>
          {animals.map((animal) => (
            <View
              key={animal.idAnimal}
              style={[styles.card, !animal.debloque && styles.cardLocked]}
              accessibilityLabel={`${animal.nom}, ${animal.debloque ? "débloqué" : "non débloqué"}`}
            >
              <View style={styles.imageWrapper}>
                {hasImage(animal.imageFiche) ? (
                  <Image
                    source={{ uri: animal.imageFiche }}
                    style={[styles.image, !animal.debloque && styles.imageLocked]}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.placeholder, !animal.debloque && styles.imageLocked]}>
                    {animal.debloque ? "🐾" : "❔"}
                  </Text>
                )}
              </View>

              <Text
                style={[styles.name, !animal.debloque && styles.nameLocked]}
                numberOfLines={1}
              >
                {`#${String(animal.idAnimal).padStart(3, "0")} `}
                {!animal.debloque && HIDE_LOCKED_NAMES ? "???" : animal.nom}
              </Text>

              <View
                style={[styles.pill, animal.debloque ? styles.pillUnlocked : styles.pillLocked]}
              >
                <Text
                  style={animal.debloque ? styles.pillUnlockedText : styles.pillLockedText}
                >
                  {animal.debloque ? "Débloqué" : "À débloquer"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 8,
  },
  backButton: { alignSelf: "flex-start", paddingVertical: 12 },
  back: { color: colors.green, fontSize: 16, fontWeight: "bold" },
  title: { fontSize: 32, fontWeight: "bold", color: colors.green },
  subtitle: { fontSize: 16, color: MUTED, marginBottom: 12 },
  empty: { fontSize: 14, color: MUTED, marginTop: 16 },

  summary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  summaryCount: { fontSize: 36, fontWeight: "bold", color: colors.green },
  summaryLabel: { fontSize: 16, fontWeight: "bold", color: MUTED },
  summaryTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E4E1D4",
    overflow: "hidden",
  },
  summaryFill: { height: "100%", backgroundColor: colors.green, borderRadius: 6 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  card: {
    width: "48%",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 16,
    padding: 12,
  },
  cardLocked: { backgroundColor: "#EFEDE4", borderColor: "#C9C6B8" },

  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  imageLocked: { opacity: 0.35 },
  placeholder: { fontSize: 56 },

  name: { fontSize: 16, fontWeight: "bold", color: colors.green },
  nameLocked: { color: MUTED },

  pill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillUnlocked: { backgroundColor: colors.green },
  pillUnlockedText: { color: colors.white, fontSize: 12, fontWeight: "bold" },
  pillLocked: { backgroundColor: "#E4E1D4" },
  pillLockedText: { color: MUTED, fontSize: 12, fontWeight: "bold" },
});