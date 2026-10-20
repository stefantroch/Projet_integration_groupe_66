import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { authClient } from "@/lib/auth-client";
import { colors } from "@/constants/colors";
import { Link } from "expo-router";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    setErrorMessage("");
    const { data, error } = await authClient.signIn.email({ email, password });

    if (error) {
      setErrorMessage(error.message ?? "Erreur de connexion");
      return;
    }
    console.log("Connecté :", data.user.name);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.logo}>Capturama</Text>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </Pressable>

      <Link href="/signup" style={styles.link}>Pas de compte ? S'inscrire</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 16,
    padding: 24,
    gap: 14,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    color: colors.green,
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
  },
  error: {
    color: colors.error,
  },
  button: {
    backgroundColor: colors.green,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
  },
  link: {
    color: colors.green,
    textAlign: "center",
  },
});