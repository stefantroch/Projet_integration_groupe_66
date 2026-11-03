import { View, StyleSheet } from "react-native";
import LoginForm from "@/components/login-form";
import { colors } from "@/constants/colors"

export default function HomeScreen() {
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