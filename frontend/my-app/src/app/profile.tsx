import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect, router } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { colors } from "@/constants/colors";

export default function ProfilScreen() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  // Sans session, retour à l'écran de connexion.
  if (!session) {
    return <Redirect href="/" />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/");
  };

  const { user } = session;
  const initiale = user.name?.charAt(0).toUpperCase() ?? "?";
  const membreDepuis = new Date(user.createdAt).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>

        <Text style={styles.title}>Mon profil</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initiale}</Text>
          </View>

          <InfoRow label="Nom" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Membre depuis" value={membreDepuis} />
        </View>

        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  center: { justifyContent: "center", alignItems: "center" },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: 16,
  },
  back: { fontSize: 16, color: colors.green },
  title: { fontSize: 32, color: colors.green },
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: "bold" },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 2,
  },
  label: { fontSize: 13, color: colors.green, fontWeight: "600" },
  value: { fontSize: 16, color: colors.text },
  signOutButton: {
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  signOutText: { color: colors.error, fontSize: 14, fontWeight: "600" },
});
