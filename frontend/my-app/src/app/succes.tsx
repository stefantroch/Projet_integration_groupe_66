import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ImageSourcePropType,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/colors";
import { authClient } from "@/lib/auth-client";
import Constants from "expo-constants";
import { Platform } from "react-native";

const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "http://localhost:3000" : `http://${devHost}:3000`);
  
// Réponse de GET /api/badges
type Badge = {
  idTrophee: number;
  nom: string;
  description: string;
  conditionObtention: string;
  icone: string;
  obtenu: boolean;
  dateObtention: string | null;
};

// Le champ `icone` d'un trophée choisit l'image ; image bronze par défaut
const BADGE_IMAGES: Record<string, ImageSourcePropType> = {
  bronze: require("../assets/badges/bronze.png"),
  argent: require("../assets/badges/argent.png"),
  or: require("../assets/badges/or.png"),
  ultime: require("../assets/badges/ultime.png"),
};

const badgeImage = (icone: string) =>
  BADGE_IMAGES[icone.replace(/\.png$/, "").toLowerCase()] ?? BADGE_IMAGES.bronze;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

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

export default function SuccesScreen() {
  const [captureCount, setCaptureCount] = useState(0);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [progression, animaux, listeBadges] = await Promise.all([
          getApi<{ captureCount: number }>("/badges/progression"),
          getApi<unknown[]>("/animaux"),
          getApi<Badge[]>("/badges"),
        ]);
        setCaptureCount(progression.captureCount);
        setTotalAnimals(animaux.length);
        // Badges obtenus d'abord
        setBadges([...listeBadges].sort((a, b) => Number(b.obtenu) - Number(a.obtenu)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const remaining = Math.max(totalAnimals - captureCount, 0);
  const obtainedCount = badges.filter((b) => b.obtenu).length;

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
        <Text style={styles.subtitle}>Impossible de charger les succès ({error}).</Text>
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

      <Text style={styles.title}>Succès</Text>
      <Text style={styles.subtitle}>Capture des animaux pour débloquer des badges.</Text>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>
            {captureCount} / {totalAnimals}
          </Text>
          <Text style={styles.summaryLabel}>animaux capturés</Text>
        </View>
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              { width: `${totalAnimals ? clamp(captureCount / totalAnimals) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.summaryHint}>
          {remaining > 0
            ? `Encore ${remaining} ${remaining > 1 ? "animaux" : "animal"} à découvrir`
            : "Tu as découvert tous les animaux, bravo !"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Badges · {obtainedCount} / {badges.length}
      </Text>

      {badges.length === 0 ? (
        <Text style={styles.empty}>Aucun badge disponible pour le moment.</Text>
      ) : (
        <View style={styles.list}>
          {badges.map((badge) => (
            <View
              key={badge.idTrophee}
              style={[styles.card, !badge.obtenu && styles.cardLocked]}
              accessibilityLabel={`${badge.nom}, ${badge.obtenu ? "obtenu" : "non obtenu"}`}
            >
              <Image
                source={badgeImage(badge.icone)}
                style={[styles.badgeImage, !badge.obtenu && styles.badgeImageLocked]}
                resizeMode="contain"
              />

              <View style={styles.info}>
                <Text style={[styles.badgeTitle, !badge.obtenu && styles.badgeTitleLocked]}>
                  {badge.nom}
                </Text>
                <Text style={styles.badgeDescription}>
                  {badge.obtenu ? badge.description : badge.conditionObtention}
                </Text>

                {badge.obtenu ? (
                  <View style={[styles.pill, styles.pillUnlocked]}>
                    <Text style={styles.pillUnlockedText}>
                      {badge.dateObtention
                        ? `Obtenu le ${formatDate(badge.dateObtention)}`
                        : "Obtenu"}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.pill, styles.pillLocked]}>
                    <Text style={styles.pillLockedText}>À débloquer</Text>
                  </View>
                )}
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

  summary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
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
  summaryHint: { fontSize: 14, color: MUTED },

  sectionTitle: { fontSize: 20, fontWeight: "bold", color: colors.green, marginTop: 24 },
  empty: { fontSize: 14, color: MUTED },

  list: { gap: 12, marginTop: 8 },
  card: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
  },
  cardLocked: { backgroundColor: "#EFEDE4" },

  badgeImage: { width: 72, height: 80 },
  badgeImageLocked: { opacity: 0.35 },

  info: { flex: 1, gap: 4 },
  badgeTitle: { fontSize: 20, fontWeight: "bold", color: colors.green },
  badgeTitleLocked: { color: MUTED },
  badgeDescription: { fontSize: 14, color: MUTED },

  pill: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillUnlocked: { backgroundColor: colors.green },
  pillUnlockedText: { color: colors.white, fontSize: 12, fontWeight: "bold" },
  pillLocked: { backgroundColor: "#E4E1D4" },
  pillLockedText: { color: MUTED, fontSize: 12, fontWeight: "bold" },
});