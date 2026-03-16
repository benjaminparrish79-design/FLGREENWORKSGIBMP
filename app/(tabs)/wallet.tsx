/**
 * FL-GreenGuard: Digital Wallet Screen
 *
 * Stores and displays fertilizer applicator certificates and licenses.
 * Supports camera capture, file picker upload, expiration reminders,
 * and a full-screen "Show for Inspection" mode.
 */

import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

const WALLET_STORAGE_KEY = 'fl_greenguard_wallet_certificates';

export interface Certificate {
  id: string;
  name: string;
  type: 'gibmp' | 'lf_license' | 'other';
  uri: string;
  mimeType: string;
  expirationDate?: string;
  uploadedAt: string;
}

const CERT_TYPE_LABELS: Record<Certificate['type'], string> = {
  gibmp: 'Green Industries BMP',
  lf_license: 'Limited Fertilizer License',
  other: 'Other Certificate',
};

export default function WalletScreen() {
  const colors = useColors();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectionCert, setInspectionCert] = useState<Certificate | null>(null);

  // Load saved certificates from AsyncStorage
  const loadCertificates = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      if (raw) setCertificates(JSON.parse(raw));
    } catch (error) {
      console.error('[Wallet] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCertificates = useCallback(async (certs: Certificate[]) => {
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(certs));
    setCertificates(certs);
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  // Prompt user to choose upload method and certificate type
  const handleAddCertificate = useCallback(() => {
    Alert.alert('Add Certificate', 'Choose how to add your certificate', [
      {
        text: '📷 Take Photo',
        onPress: () => pickFromCamera(),
      },
      {
        text: '🖼 Photo Library',
        onPress: () => pickFromLibrary(),
      },
      {
        text: '📄 Browse Files',
        onPress: () => pickDocument(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const finalizeUpload = useCallback(
    (uri: string, name: string, mimeType: string) => {
      Alert.alert('Certificate Type', 'What type of certificate is this?', [
        ...(['gibmp', 'lf_license', 'other'] as Certificate['type'][]).map((type) => ({
          text: CERT_TYPE_LABELS[type],
          onPress: () => {
            const cert: Certificate = {
              id: `cert_${Date.now()}`,
              name,
              type,
              uri,
              mimeType,
              uploadedAt: new Date().toISOString(),
            };
            saveCertificates([...certificates, cert]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [certificates, saveCertificates]
  );

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finalizeUpload(asset.uri, `Photo_${Date.now()}.jpg`, 'image/jpeg');
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `Image_${Date.now()}.jpg`;
      finalizeUpload(asset.uri, name, asset.mimeType ?? 'image/jpeg');
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finalizeUpload(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
    }
  };

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Certificate', 'Remove this certificate from your wallet?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => saveCertificates(certificates.filter((c) => c.id !== id)),
        },
      ]);
    },
    [certificates, saveCertificates]
  );

  const isExpiringSoon = (cert: Certificate) => {
    if (!cert.expirationDate) return false;
    const days = (new Date(cert.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  };

  const isExpired = (cert: Certificate) => {
    if (!cert.expirationDate) return false;
    return new Date(cert.expirationDate).getTime() < Date.now();
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Digital Wallet</Text>
            <Text className="text-sm text-muted">Certificates & Licenses</Text>
          </View>

          {/* Add Certificate Button */}
          <TouchableOpacity
            onPress={handleAddCertificate}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text className="text-base font-bold text-background">+ Add Certificate</Text>
          </TouchableOpacity>

          {/* Certificate List */}
          {certificates.length === 0 ? (
            <View className="items-center justify-center py-16 gap-3">
              <Text className="text-4xl">💼</Text>
              <Text className="text-lg text-muted">No certificates yet</Text>
              <Text className="text-sm text-muted text-center">
                Add your GIBMP certificate or fertilizer license to display during inspections.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {certificates.map((cert) => {
                const expired = isExpired(cert);
                const expiring = isExpiringSoon(cert);

                return (
                  <View
                    key={cert.id}
                    className={`bg-surface rounded-lg p-4 border ${
                      expired
                        ? 'border-error'
                        : expiring
                        ? 'border-warning'
                        : 'border-border'
                    }`}
                  >
                    {/* Preview thumbnail */}
                    {cert.mimeType.startsWith('image/') && (
                      <Image
                        source={{ uri: cert.uri }}
                        style={{
                          width: '100%',
                          height: 140,
                          borderRadius: 8,
                          marginBottom: 12,
                          backgroundColor: colors.border,
                        }}
                        resizeMode="cover"
                      />
                    )}
                    {cert.mimeType === 'application/pdf' && (
                      <View
                        className="w-full rounded-lg mb-3 items-center justify-center"
                        style={{ height: 80, backgroundColor: colors.border }}
                      >
                        <Text className="text-3xl">📄</Text>
                        <Text className="text-xs text-muted mt-1">PDF Document</Text>
                      </View>
                    )}

                    {/* Cert details */}
                    <Text className="text-sm font-bold text-foreground mb-1">{cert.name}</Text>
                    <Text className="text-xs text-muted mb-3">
                      {CERT_TYPE_LABELS[cert.type]}
                    </Text>

                    {/* Expiration badges */}
                    {expired && (
                      <View className="bg-error/20 rounded px-2 py-1 mb-3 self-start">
                        <Text className="text-xs font-semibold text-error">✗ Expired</Text>
                      </View>
                    )}
                    {expiring && !expired && (
                      <View className="bg-warning/20 rounded px-2 py-1 mb-3 self-start">
                        <Text className="text-xs font-semibold text-warning">
                          ⚠ Expiring soon
                        </Text>
                      </View>
                    )}

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => setInspectionCert(cert)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-xs font-bold text-background">
                          🔍 Show for Inspection
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(cert.id)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          backgroundColor: colors.error + '20',
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-xs font-bold text-error">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Inspection Full-Screen Modal */}
      <Modal
        visible={!!inspectionCert}
        animationType="fade"
        onRequestClose={() => setInspectionCert(null)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity
            onPress={() => setInspectionCert(null)}
            style={{
              position: 'absolute',
              top: 48,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕ Close</Text>
          </TouchableOpacity>

          {inspectionCert && inspectionCert.mimeType.startsWith('image/') && (
            <Image
              source={{ uri: inspectionCert.uri }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          )}

          {inspectionCert && inspectionCert.mimeType === 'application/pdf' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Text style={{ fontSize: 80 }}>📄</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {inspectionCert.name}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                PDF — tap close to go back
              </Text>
            </View>
          )}

          {/* Cert label at bottom */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: 20,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              {inspectionCert?.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
              {inspectionCert ? CERT_TYPE_LABELS[inspectionCert.type] : ''}
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
