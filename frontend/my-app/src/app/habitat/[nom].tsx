import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { chargerHabitats, type Habitat } from "@/lib/habitats";
import { BarreProgression, ImageHabitat } from "@/components/habitat-ui";

// Écran détail d'un habitat : photo, progression et liste des animaux
// Le nom de l'habitat vient de l'URL (/habitat/<nom>), déjà décodé par expo-router
export default function HabitatDetailScreen() {
  const { nom } = useLocalSearchParams<{ nom: string }>();
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Pas de route habitat dédiée : on recharge la liste et on cherche celui demandé
        const habitats = await chargerHabitats();
        setHabitat(habitats.find((h) => h.nom === nom) ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [nom]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (error || !habitat) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <Text style={styles.subtitle}>
          {error ? `Impossible de charger cet habitat (${error}).` : "Habitat introuvable."}
        </Text>
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

      <ImageHabitat imageUrl={habitat.imageUrl} />

      <Text style={styles.title}>{habitat.nom}</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Animaux débloqués</Text>
        <BarreProgression valeur={habitat.debloques} total={habitat.total} />
      </View>

      <Text style={styles.sectionTitle}>Animaux</Text>

      <View style={styles.list}>
        {habitat.animaux.map((animal) => {
          // Un animal débloqué est cliquable (fiche détaillée) ; un verrouillé non
          const contenu = (
            <>
              <View style={styles.info}>
                <Text style={[styles.animalNom, !animal.debloque && styles.animalNomLocked]}>
                  {animal.nom}
                </Text>
                <Text style={styles.animalFamille}>{animal.famille}</Text>
              </View>
              {/* Cadenas affiché uniquement pour les animaux pas encore débloqués */}
              {!animal.debloque && <Text style={styles.cadenas}>🔒</Text>}
            </>
          );

          if (!animal.debloque) {
            return (
              <View
                key={animal.idAnimal}
                style={[styles.card, styles.cardLocked]}
                accessibilityLabel={`${animal.nom}, verrouillé`}
              >
                {contenu}
              </View>
            );
          }

          return (
            <Pressable
              key={animal.idAnimal}
              style={styles.card}
              // Ouvre la fiche de l'animal : /animal/<idAnimal>
              onPress={() => router.push(`/animal/${animal.idAnimal}`)}
              accessibilityRole="button"
              accessibilityLabel={`${animal.nom}, débloqué, voir la fiche`}
            >
              {contenu}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const MUTED = "#566056";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 12,
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
    padding: 16,
    gap: 10,
  },
  summaryLabel: { fontSize: 16, fontWeight: "bold", color: MUTED },

  sectionTitle: { fontSize: 20, fontWeight: "bold", color: colors.green, marginTop: 12 },

  list: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
  },
  cardLocked: { backgroundColor: "#EFEDE4" },
  info: { flex: 1, gap: 2 },
  animalNom: { fontSize: 18, fontWeight: "bold", color: colors.green },
  animalNomLocked: { color: MUTED },
  animalFamille: { fontSize: 14, color: MUTED },
  cadenas: { fontSize: 22 },
});
