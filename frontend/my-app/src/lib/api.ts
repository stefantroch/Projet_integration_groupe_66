import Constants from "expo-constants";
import { Platform } from "react-native";
import { authClient } from "@/lib/auth-client";

// Même logique que dans auth-client.ts : on trouve l'adresse de l'API
// (l'IP du PC qui fait tourner Expo en mode téléphone, localhost sur le web)
const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "http://localhost:3000" : `http://${devHost}:3000`);

// Appel GET vers l'API. authClient envoie automatiquement la session de l'utilisateur connecté.
// En cas d'erreur, on lève une exception que l'écran pourra afficher.
export async function getApi<T>(path: string): Promise<T> {
  const { data, error } = await authClient.$fetch<T>(path, {
    method: "GET",
    baseURL: `${API_URL}/api`,
  });
  if (error || !data) {
    throw new Error(`Erreur ${error?.status ?? ""}`.trim());
  }
  return data;
}
