import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

// IP du PC qui fait tourner Expo (ex : "192.168.1.42")
const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "http://localhost:3000" : `http://${devHost}:3000`);

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      storagePrefix: "capturama",
      storage: SecureStore,
    }),
  ],
});