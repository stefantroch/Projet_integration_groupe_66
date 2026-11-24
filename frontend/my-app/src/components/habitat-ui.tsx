import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

const MUTED = "#566056";

// Photo de l'habitat. Tant qu'aucune URL n'est fournie (imageUrl = null),
// rien n'est affiché.
export function ImageHabitat({ imageUrl, hauteur = 160 }: { imageUrl: string | null; hauteur?: number }) {
  if (!imageUrl) return null;
  return (
    <Image
      source={{ uri: imageUrl }}
      style={[styles.image, { height: hauteur }]}
      resizeMode="cover"
    />
  );
}

// Barre de progression avec le texte "x/y" à côté
export function BarreProgression({ valeur, total }: { valeur: number; total: number }) {
  // Pourcentage borné entre 0 et 100 (évite une division par zéro si total = 0)
  const pourcentage = total > 0 ? Math.min(Math.max(valeur / total, 0), 1) * 100 : 0;
  return (
    <View style={styles.progressionLigne}>
      <View style={styles.piste}>
        <View style={[styles.remplissage, { width: `${pourcentage}%` }]} />
      </View>
      <Text style={styles.progressionTexte}>
        {valeur}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", borderRadius: 16, backgroundColor: "#E4E1D4" },

  progressionLigne: { flexDirection: "row", alignItems: "center", gap: 10 },
  piste: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E4E1D4",
    overflow: "hidden",
  },
  remplissage: { height: "100%", backgroundColor: colors.green, borderRadius: 5 },
  progressionTexte: { fontSize: 14, fontWeight: "bold", color: MUTED, minWidth: 48, textAlign: "right" },
});
