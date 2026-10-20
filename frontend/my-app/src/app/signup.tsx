import { View, StyleSheet } from "react-native";
import SignupForm from "@/components/signup-form";
import { colors } from "@/constants/colors";

export default function SignupScreen() {
  return (
    <View style={styles.container}>
      <SignupForm />
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