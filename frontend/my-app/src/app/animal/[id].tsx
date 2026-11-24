import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { getApi } from "@/lib/api";

// Réponse de GET /api/animaux/:id (fiche complète d'un animal)
type AnimalFiche = {
  idAnimal: number;
  numero: number;
  nom: string;
  nomScientifique: string;
  famille: string;
  habitat: string;
  alimentation: string;
  description: string;
  imageFiche: string;
};

const MUTED = "#566056";

// Écran fiche d'un animal. Il n'est accessible que depuis un animal débloqué
// (le bouton n'existe pas pour les animaux verrouillés, voir habitat/[nom].tsx).
export default function AnimalScreen() {
  // L'id vient de l'URL : /animal/<idAnimal>
  const { id } = useLocalSearchParams<{ id: string }>();
  const [animal, setAnimal] = useState<AnimalFiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setAnimal(await getApi<AnimalFiche>(`/animaux/${id}`));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (error || !animal) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <Text style={styles.subtitle}>
          {error ? `Impossible de charger cet animal (${error}).` : "Animal introuvable."}
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

      <Text style={styles.title}>{animal.nom}</Text>
      <Text style={styles.scientifique}>{animal.nomScientifique}</Text>

      <View style={styles.card}>
        <Ligne titre="Famille" valeur={animal.famille} />
        <Ligne titre="Habitat" valeur={animal.habitat} />
        <Ligne titre="Alimentation" valeur={animal.alimentation} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitre}>Description</Text>
        <Text style={styles.texte}>{animal.description}</Text>
      </View>
    </ScrollView>
  );
}

// Petit bloc "titre : valeur" réutilisé pour les informations de la fiche
function Ligne({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneTitre}>{titre}</Text>
      <Text style={styles.texte}>{valeur}</Text>
    </View>
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
    gap: 12,
  },
  backButton: { alignSelf: "flex-start", paddingVertical: 12 },
  back: { color: colors.green, fontSize: 16, fontWeight: "bold" },
  title: { fontSize: 32, fontWeight: "bold", color: colors.green },
  scientifique: { fontSize: 16, fontStyle: "italic", color: MUTED, marginBottom: 8 },
  subtitle: { fontSize: 16, color: MUTED, marginBottom: 12 },

  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardTitre: { fontSize: 16, fontWeight: "bold", color: colors.green },
  ligne: { gap: 2 },
  ligneTitre: { fontSize: 14, fontWeight: "bold", color: colors.green },
  texte: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
