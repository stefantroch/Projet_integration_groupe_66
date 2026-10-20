import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { colors } from "@/constants/colors";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    setErrorMessage("");

    if (password !== confirm) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      return;
    }

    const { data, error } = await authClient.signUp.email({ name, email, password });

    if (error) {
      setErrorMessage(error.message ?? "Erreur lors de l'inscription");
      return;
    }
    console.log("Compte créé :", data.user.name);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.logo}>Capturama</Text>
      <Text style={styles.title}>Inscription</Text>

      <TextInput placeholder="Pseudo" value={name} onChangeText={setName} style={styles.input} />
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
      <TextInput
        placeholder="Confirmer le mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.input}
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Créer un compte</Text>
      </Pressable>

      <Link href="/" style={styles.link}>Déjà un compte ? Se connecter</Link>
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
  logo: { fontSize: 18, fontWeight: "bold", color: colors.green, textAlign: "center" },
  title: { fontSize: 32, color: colors.green, textAlign: "center", marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
  },
  error: { color: colors.error },
  button: { backgroundColor: colors.green, padding: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: colors.white, fontSize: 16 },
  link: { color: colors.green, textAlign: "center" },
});