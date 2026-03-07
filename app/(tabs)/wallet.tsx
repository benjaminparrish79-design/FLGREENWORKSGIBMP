import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  getWalletCertificates,
  isCertificateExpired,
  getDaysUntilExpiration,
  deleteCertificate,
  type WalletCertificate,
} from '@/lib/digital-wallet-service';
import * as Haptics from 'expo-haptics';

export default function WalletScreen() {
  const colors = useColors();

  const [certificates, setCertificates] = useState<WalletCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCertificates = useCallback(async () => {
    try {
      const certs = await getWalletCertificates();
      setCertificates(certs);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const handleDeleteCertificate = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Certificate',
        `Are you sure you want to delete "${name}"?`,
        [
          { text: 'Cancel', onPress: () => {}, style: 'cancel' },
          {
            text: 'Delete',
            onPress: async () => {
              try {
                const success = await deleteCertificate(id);
                if (success) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  await loadCertificates();
                } else {
                  Alert.alert('Error', 'Failed to delete certificate');
                }
              } catch (error) {
                Alert.alert('Error', 'An error occurred while deleting the certificate');
              }
            },
            style: 'destructive',
          },
        ]
      );
    },
    [loadCertificates]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCertificateTypeLabel = (type: string) => {
    return type === 'gibmp' ? 'GI-BMP Certificate' : 'LF License';
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-lg text-muted">Loading wallet...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Digital Wallet</Text>
            <Text className="text-sm text-muted">Your certificates and licenses</Text>
          </View>

          {/* Certificates List */}
          {certificates.length > 0 ? (
            <View className="gap-3">
              {certificates.map((cert) => {
                const isExpired = isCertificateExpired(cert);
                const daysUntilExp = getDaysUntilExpiration(cert);

                return (
                  <View
                    key={cert.id}
                    className={`rounded-lg p-4 border-2 ${
                      isExpired ? 'bg-error/10 border-error' : 'bg-surface border-border'
                    }`}
                  >
                    {/* Certificate Header */}
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-foreground">
                          {getCertificateTypeLabel(cert.type)}
                        </Text>
                        <Text className="text-sm text-muted mt-1">{cert.name}</Text>
                      </View>
                      {isExpired && (
                        <View className="bg-error/20 px-2 py-1 rounded">
                          <Text className="text-xs font-semibold text-error">Expired</Text>
                        </View>
                      )}
                    </View>

                    {/* Expiration Info */}
                    {cert.expirationDate && (
                      <View className="mb-3 pb-3 border-b border-border">
                        <Text className="text-xs text-muted mb-1">Expiration Date</Text>
                        <Text
                          className={`text-sm font-semibold ${
                            isExpired ? 'text-error' : 'text-foreground'
                          }`}
                        >
                          {formatDate(cert.expirationDate)}
                        </Text>
                        {!isExpired && daysUntilExp !== null && (
                          <Text className="text-xs text-muted mt-1">
                            {daysUntilExp > 30
                              ? `${daysUntilExp} days remaining`
                              : daysUntilExp > 0
                              ? `⚠ ${daysUntilExp} days remaining`
                              : 'Expires today'}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* File Info */}
                    <View className="gap-2 mb-4">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted">File Size</Text>
                        <Text className="text-xs text-foreground">{formatFileSize(cert.fileSize)}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted">Uploaded</Text>
                        <Text className="text-xs text-foreground">{formatDate(cert.uploadedAt)}</Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-sm font-semibold text-background">Show for Inspection</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCertificate(cert.id, cert.name)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: colors.error + '20',
                          alignItems: 'center',
                        }}
                      >
                        <Text className="text-sm font-semibold text-error">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="bg-surface rounded-lg p-6 items-center gap-3">
              <Text className="text-lg font-semibold text-foreground">No Certificates Yet</Text>
              <Text className="text-sm text-muted text-center">
                Upload your GI-BMP Certificate and LF License to store them in your digital wallet.
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  marginTop: 8,
                }}
              >
                <Text className="text-sm font-semibold text-background">Upload Certificate</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info Box */}
          <View className="bg-primary/10 rounded-lg p-4 border border-primary">
            <Text className="text-sm font-semibold text-primary mb-2">💡 Inspection Ready</Text>
            <Text className="text-xs text-primary/80">
              Your certificates are stored securely and available offline. Tap "Show for Inspection" to display
              them full-screen during field inspections.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
