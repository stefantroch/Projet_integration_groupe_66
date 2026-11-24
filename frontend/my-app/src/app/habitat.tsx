import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/colors";
import { chargerHabitats, type Habitat } from "@/lib/habitats";
import { BarreProgression, ImageHabitat } from "@/components/habitat-ui";

// Écran "Habitat" : liste de tous les habitats avec la progression du joueur
export default function HabitatScreen() {
  const [habitats, setHabitats] = useState<Habitat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Au chargement de l'écran, on récupère les animaux et on les regroupe par habitat
  useEffect(() => {
    (async () => {
      try {
        setHabitats(await chargerHabitats());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <Text style={styles.subtitle}>Impossible de charger les habitats ({error}).</Text>
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

      <Text style={styles.title}>Habitats</Text>
      <Text style={styles.subtitle}>Touche un habitat pour voir ses animaux.</Text>

      {habitats.length === 0 ? (
        <Text style={styles.subtitle}>Aucun habitat pour le moment.</Text>
      ) : (
        <View style={styles.list}>
          {habitats.map((habitat) => (
            <Pressable
              key={habitat.nom}
              style={styles.card}
              // On passe le nom de l'habitat dans l'URL : /habitat/<nom>
              onPress={() => router.push(`/habitat/${encodeURIComponent(habitat.nom)}`)}
              accessibilityRole="button"
              accessibilityLabel={`Habitat ${habitat.nom}, ${habitat.debloques} sur ${habitat.total} animaux débloqués`}
            >
              <ImageHabitat imageUrl={habitat.imageUrl} hauteur={140} />
              <Text style={styles.habitatNom}>{habitat.nom}</Text>
              <BarreProgression valeur={habitat.debloques} total={habitat.total} />
            </Pressable>
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
  subtitle: { fontSize: 16, color: "#566056", marginBottom: 12 },

  list: { gap: 16, marginTop: 8 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },
  habitatNom: { fontSize: 18, fontWeight: "bold", color: colors.green },
});
