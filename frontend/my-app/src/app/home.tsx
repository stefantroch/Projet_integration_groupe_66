import { View, Text, Pressable, StyleSheet } from "react-native";
import { authClient } from "@/lib/auth-client";
import { colors } from "@/constants/colors";

const sections = ["Ma collection", "Capturer", "Habitat", "Succès"];

export default function AccueilScreen() {
  const { data: session } = authClient.useSession();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Capturama</Text>
        <Text style={styles.title}>Bienvenue {session?.user.name}</Text>
        <Text style={styles.subtitle}>Que veux-tu faire aujourd'hui ?</Text>

        <View style={styles.grid}>
          {sections.map((section) => (
            <Pressable key={section} style={styles.tile}>
              <View style={styles.tileButton}>
                <Text style={styles.tileText}>{section}</Text>
              </View>
            </Pressable>
          ))}
        </View>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  tile: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 16,
    justifyContent: "flex-end",
    padding: 12,
  },
  tileButton: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 10,
  },
  tileText: { color: colors.white, textAlign: "center", fontSize: 16 },
});