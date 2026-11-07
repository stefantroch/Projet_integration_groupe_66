import { View, Text, Image, ScrollView, Pressable, StyleSheet, ImageSourcePropType } from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/colors";
 
// TODO: remplacer par les vraies valeurs (API / base de données)
const CAPTURE_COUNT = 12;
const TOTAL_ANIMALS = 30;
 
type Milestone = {
  id: string;
  title: string;
  description: string;
  target: number;
  image: ImageSourcePropType;
  titleColor: string;
};
 
const MILESTONES: Milestone[] = [
  {
    id: "bronze",
    title: "Bronze",
    description: "Capture 5 animaux",
    target: 5,
    image: require("../assets/badges/bronze.png"),
    titleColor: "#8A5330",
  },
  {
    id: "argent",
    title: "Argent",
    description: "Capture 10 animaux",
    target: 10,
    image: require("../assets/badges/argent.png"),
    titleColor: "#4B5563",
  },
  {
    id: "or",
    title: "Or",
    description: "Capture 20 animaux",
    target: 20,
    image: require("../assets/badges/or.png"),
    titleColor: "#8A6A0B",
  },
  {
    id: "ultime",
    title: "Ultime",
    description: "Capture tous les animaux",
    target: TOTAL_ANIMALS,
    image: require("../assets/badges/ultime.png"),
    titleColor: "#5B3FA0",
  },
];
 
const ROW_HEIGHT = 140;
const NODE_SIZE = 28;
const BADGE_CENTER_Y = 48;
const TRACK = "#D3D0C2";
const MUTED = "#566056";
 
const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
 
export default function SuccesScreen() {
  const nextMilestone = MILESTONES.find((m) => CAPTURE_COUNT < m.target);
 
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>
 
      <Text style={styles.title}>Succès</Text>
      <Text style={styles.subtitle}>Capture des animaux pour débloquer des badges.</Text>
 
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>
            {CAPTURE_COUNT} / {TOTAL_ANIMALS}
          </Text>
          <Text style={styles.summaryLabel}>animaux capturés</Text>
        </View>
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              { width: `${clamp(CAPTURE_COUNT / TOTAL_ANIMALS) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.summaryHint}>
          {nextMilestone
            ? `Encore ${nextMilestone.target - CAPTURE_COUNT} animaux pour le badge ${nextMilestone.title}`
            : "Tu as débloqué tous les badges, bravo !"}
        </Text>
      </View>
 
      <View style={styles.timeline}>
        {MILESTONES.map((milestone, index) => {
          const next = MILESTONES[index + 1];
          const unlocked = CAPTURE_COUNT >= milestone.target;
          const isCurrent = !unlocked && nextMilestone?.id === milestone.id;
          const segmentRatio = next
            ? clamp((CAPTURE_COUNT - milestone.target) / (next.target - milestone.target))
            : 0;
 
          return (
            <View key={milestone.id} style={styles.row}>
              <View style={styles.nodeColumn}>
                {next ? (
                  <View style={styles.segment}>
                    <View style={[styles.segmentFill, { height: `${segmentRatio * 100}%` }]} />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.node,
                    unlocked && styles.nodeUnlocked,
                    isCurrent && styles.nodeCurrent,
                  ]}
                >
                  {unlocked ? <Text style={styles.nodeCheck}>✓</Text> : null}
                </View>
              </View>
 
              <Image
                source={milestone.image}
                style={[styles.badgeImage, !unlocked && styles.badgeImageLocked]}
                resizeMode="contain"
              />
 
              <View style={styles.info}>
                <Text style={[styles.badgeTitle, { color: milestone.titleColor }]}>
                  {milestone.title}
                </Text>
                <Text style={styles.badgeDescription}>{milestone.description}</Text>
 
                {unlocked ? (
                  <View style={[styles.pill, styles.pillUnlocked]}>
                    <Text style={styles.pillUnlockedText}>Débloqué</Text>
                  </View>
                ) : isCurrent ? (
                  <View style={[styles.pill, styles.pillCurrent]}>
                    <Text style={styles.pillCurrentText}>
                      En cours · {CAPTURE_COUNT} / {milestone.target}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.pill, styles.pillLocked]}>
                    <Text style={styles.pillLockedText}>
                      Verrouillé · {CAPTURE_COUNT} / {milestone.target}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 8,
  },
  backButton: { alignSelf: "flex-start", paddingVertical: 12 },
  back: { color: colors.green, fontSize: 16, fontWeight: "bold" },
  title: { fontSize: 32, fontWeight: "bold", color: colors.green },
  subtitle: { fontSize: 16, color: MUTED, marginBottom: 12 },
 
  summary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  summaryCount: { fontSize: 36, fontWeight: "bold", color: colors.green },
  summaryLabel: { fontSize: 16, fontWeight: "bold", color: MUTED },
  summaryTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E4E1D4",
    overflow: "hidden",
  },
  summaryFill: { height: "100%", backgroundColor: colors.green, borderRadius: 6 },
  summaryHint: { fontSize: 14, color: MUTED },
 
  timeline: { marginTop: 20 },
  row: { flexDirection: "row", height: ROW_HEIGHT, gap: 16 },
 
  nodeColumn: { width: NODE_SIZE },
  segment: {
    position: "absolute",
    left: 12,
    top: BADGE_CENTER_Y,
    width: 4,
    height: ROW_HEIGHT,
    backgroundColor: TRACK,
    borderRadius: 2,
  },
  segmentFill: { backgroundColor: colors.green, borderRadius: 2 },
  node: {
    position: "absolute",
    left: 0,
    top: BADGE_CENTER_Y - NODE_SIZE / 2,
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: "#E4E1D4",
    borderWidth: 4,
    borderColor: TRACK,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeUnlocked: { backgroundColor: colors.green, borderColor: colors.green },
  nodeCurrent: { backgroundColor: colors.white, borderColor: colors.green },
  nodeCheck: { color: colors.white, fontSize: 14, fontWeight: "bold" },
 
  badgeImage: { width: 88, height: 96 },
  badgeImageLocked: { opacity: 0.35 },
 
  info: { flex: 1, paddingTop: 14, gap: 4 },
  badgeTitle: { fontSize: 22, fontWeight: "bold" },
  badgeDescription: { fontSize: 14, color: MUTED },
 
  pill: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillUnlocked: { backgroundColor: colors.green },
  pillUnlockedText: { color: colors.white, fontSize: 12, fontWeight: "bold" },
  pillCurrent: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    paddingVertical: 2,
  },
  pillCurrentText: { color: colors.green, fontSize: 12, fontWeight: "bold" },
  pillLocked: { backgroundColor: "#E4E1D4" },
  pillLockedText: { color: MUTED, fontSize: 12, fontWeight: "bold" },
});
 