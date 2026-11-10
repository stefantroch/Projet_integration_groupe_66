import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import LoginForm from "@/components/login-form";
import { colors } from "@/constants/colors";
import { authClient } from "@/lib/auth-client";

export default function HomeScreen() {
  // Better Auth vérifie si une session valide existe déjà.
  // Quand la réponse arrive, React affiche à nouveau ce composant.
  const { data: session, isPending } = authClient.useSession();

  // On attend la réponse avant de choisir entre l'accueil et la connexion.
  if (isPending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.green}
          accessibilityLabel="Vérification de la session"
        />
      </View>
    );
  }

  // Une session valide permet d'aller directement à l'accueil.
  if (session) {
    return <Redirect href="/home" />;
  }

  // Sans session valide, on affiche le formulaire de connexion.
  return (
    <View style={styles.container}>
      <LoginForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
});
