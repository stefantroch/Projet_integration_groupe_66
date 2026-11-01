import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AjouterScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const picked = result.assets[0];
    setAsset(picked);
    setImageUri(picked.uri);
  };

  const removeImage = () => {
    setAsset(null);
    setImageUri(null);
  };

  const handleSave = async () => {
    if (!asset) return;

    setLoading(true);
    try {
      // TODO: brancher le back ici.
      // Exemple d'envoi en multipart/form-data :
      //
      // const formData = new FormData();
      // formData.append('image', {
      //   uri: asset.uri,
      //   name: asset.fileName ?? 'photo.jpg',
      //   type: asset.mimeType ?? 'image/jpeg',
      // } as any);
      //
      // const response = await fetch('https://TON_API/collection', {
      //   method: 'POST',
      //   body: formData,
      // });
      // if (!response.ok) throw new Error('Erreur serveur');

      Alert.alert('Succès', "L'image a été ajoutée à la collection.");
      removeImage();
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter l'image. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Ajouter à la collection</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Choisis une image depuis ta galerie.
          </ThemedText>
        </ThemedView>

        <Pressable
          onPress={pickImage}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.preview}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Appuie pour choisir une image
              </ThemedText>
            )}
          </ThemedView>
        </Pressable>

        <ThemedView style={styles.actions}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.button}>
              <ThemedText type="link">
                {imageUri ? "Changer d'image" : 'Choisir depuis la galerie'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          {imageUri && (
            <>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={({ pressed }) => (pressed || loading) && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.button}>
                  <ThemedText type="linkPrimary">
                    {loading ? 'Ajout en cours…' : 'Ajouter à la collection'}
                  </ThemedText>
                </ThemedView>
              </Pressable>

              <Pressable
                onPress={removeImage}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Retirer l&apos;image
                </ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  titleContainer: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  preview: {
    width: 280,
    height: 280,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
