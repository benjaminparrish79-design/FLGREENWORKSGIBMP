import { View, Text, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useState, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { addCertificateToWallet } from '@/lib/digital-wallet-service';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

export default function UploadCertificateScreen() {
  const colors = useColors();

  const [certificateType, setCertificateType] = useState<'gibmp' | 'lf_license'>('gibmp');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset.uri);
        setFileName(asset.name || 'Certificate');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset.uri);
        setFileName(`${certificateType}_${Date.now()}`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  }, [certificateType]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    if (!fileName.trim()) {
      Alert.alert('Error', 'Please enter a certificate name');
      return;
    }

    try {
      setUploading(true);

      const certificate = await addCertificateToWallet(
        selectedFile,
        certificateType,
        fileName,
        expirationDate || undefined
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Certificate uploaded to your wallet!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setSelectedFile(null);
            setFileName('');
            setExpirationDate('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload certificate');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, fileName, certificateType, expirationDate]);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Upload Certificate</Text>
            <Text className="text-sm text-muted">Add to your Digital Wallet</Text>
          </View>

          {/* Certificate Type Selector */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Certificate Type</Text>
            <View className="flex-row gap-2">
              {(['gibmp', 'lf_license'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setCertificateType(type)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: certificateType === type ? colors.primary : colors.border,
                    backgroundColor: certificateType === type ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      certificateType === type ? 'text-background' : 'text-foreground'
                    }`}
                  >
                    {type === 'gibmp' ? 'GI-BMP' : 'LF License'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* File Selection */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Select File</Text>

            <TouchableOpacity
              onPress={handlePickDocument}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Text className="text-lg font-semibold text-foreground">📄 Pick PDF</Text>
              <Text className="text-xs text-muted mt-1">Select from your device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Text className="text-lg font-semibold text-foreground">📷 Take Photo</Text>
              <Text className="text-xs text-muted mt-1">Capture with camera</Text>
            </TouchableOpacity>
          </View>

          {/* Selected File Info */}
          {selectedFile && (
            <View className="bg-success/10 rounded-lg p-4 border border-success">
              <Text className="text-sm font-semibold text-success mb-1">✓ File Selected</Text>
              <Text className="text-xs text-success/80">{fileName}</Text>
            </View>
          )}

          {/* Certificate Name */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Certificate Name</Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-foreground bg-surface"
              placeholder="e.g., GI-BMP Certificate 2026"
              value={fileName}
              onChangeText={setFileName}
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Expiration Date */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Expiration Date (Optional)</Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-foreground bg-surface"
              placeholder="MM/DD/YYYY"
              value={expirationDate}
              onChangeText={setExpirationDate}
              placeholderTextColor={colors.muted}
            />
            <Text className="text-xs text-muted">Leave blank if no expiration</Text>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading || !selectedFile}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: uploading || !selectedFile ? colors.muted : colors.primary,
              alignItems: 'center',
              opacity: uploading || !selectedFile ? 0.5 : 1,
            }}
          >
            <Text className="text-lg font-bold text-background">
              {uploading ? '⏳ Uploading...' : '✓ Upload Certificate'}
            </Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View className="bg-primary/10 rounded-lg p-4 border border-primary">
            <Text className="text-sm font-semibold text-primary mb-2">💡 Tip</Text>
            <Text className="text-xs text-primary/80">
              Store your certificates in the Digital Wallet for instant access during inspections. No need to carry
              physical documents.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
