import { ScrollView, Text, View, TextInput, TouchableOpacity, Pressable, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  calculateNitrogenApplication,
  getMaxCompliantApplication,
  validateFertilizerBag,
  type FertilizerBag,
  type ApplicationJob,
} from '@/lib/nitrogen-calculator';
import { createAuditLog } from '@/lib/audit-log-service';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

export default function CalculatorScreen() {
  const colors = useColors();
  const router = useRouter();

  // Form state
  const [turfAreaSqFt, setTurfAreaSqFt] = useState('5000');
  const [nitrogenPercent, setNitrogenPercent] = useState('10');
  const [phosphorusPercent, setPhosphorusPercent] = useState('10');
  const [potassiumPercent, setPotassiumPercent] = useState('10');
  const [bagWeightLbs, setBagWeightLbs] = useState('50');
  const [bagsToApply, setBagsToApply] = useState('1');
  const [releaseType, setReleaseType] = useState<'quick-release' | 'slow-release'>('quick-release');

  // Calculation result
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleCalculate = useCallback(() => {
    try {
      setError('');

      // Parse inputs
      const area = parseFloat(turfAreaSqFt);
      const nPercent = parseFloat(nitrogenPercent);
      const pPercent = parseFloat(phosphorusPercent);
      const kPercent = parseFloat(potassiumPercent);
      const weight = parseFloat(bagWeightLbs);
      const bags = parseFloat(bagsToApply);

      // Validate inputs
      if (isNaN(area) || area <= 0) {
        throw new Error('Turf area must be a positive number');
      }
      if (isNaN(weight) || weight <= 0) {
        throw new Error('Bag weight must be a positive number');
      }
      if (isNaN(bags) || bags < 0) {
        throw new Error('Number of bags cannot be negative');
      }

      // Create fertilizer object
      const fertilizer: FertilizerBag = {
        nitrogenPercent: nPercent,
        phosphorusPercent: pPercent,
        potassiumPercent: kPercent,
        bagWeightLbs: weight,
        releaseType,
      };

      // Validate fertilizer
      const validation = validateFertilizerBag(fertilizer);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create job
      const job: ApplicationJob = {
        turfAreaSqFt: area,
        fertilizer,
        bagsToApply: bags,
      };

      // Calculate
      const calcResult = calculateNitrogenApplication(job);
      setResult(calcResult);

      // Haptic feedback
      if (calcResult.isCompliant) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation error');
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [turfAreaSqFt, nitrogenPercent, phosphorusPercent, potassiumPercent, bagWeightLbs, bagsToApply, releaseType]);

  const handleQuickMax = useCallback(() => {
    try {
      const area = parseFloat(turfAreaSqFt);
      const nPercent = parseFloat(nitrogenPercent);
      const weight = parseFloat(bagWeightLbs);

      if (isNaN(area) || isNaN(nPercent) || isNaN(weight)) {
        setError('Please fill in turf area, nitrogen %, and bag weight first');
        return;
      }

      const fertilizer: FertilizerBag = {
        nitrogenPercent: nPercent,
        phosphorusPercent: parseFloat(phosphorusPercent) || 0,
        potassiumPercent: parseFloat(potassiumPercent) || 0,
        bagWeightLbs: weight,
        releaseType,
      };

      const maxApp = getMaxCompliantApplication(area, fertilizer);
      setBagsToApply(maxApp.maxBags.toString());
      setError('');
    } catch (err) {
      setError('Error calculating max bags');
    }
  }, [turfAreaSqFt, nitrogenPercent, phosphorusPercent, potassiumPercent, bagWeightLbs, releaseType]);

  const handleSaveJob = useCallback(async () => {
    if (!result) return;

    setSaving(true);
    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Create audit log entry
      // Note: userId and propertyId should come from user context/props in production
      const auditLog = await createAuditLog({
        userId: 1, // TODO: Get from user context
        propertyId: 1, // TODO: Get from selected property
        timestamp: new Date().toISOString(),
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        gpsAccuracyMeters: location.coords.accuracy,
        windSpeedMph: null, // Would be populated from weather API
        temperatureF: null, // Would be populated from weather API
        nitrogenAppliedLbs: result.totalPoundsN,
        distanceToWaterFeet: 0, // Would be calculated from GPS
        isCompliant: result.isCompliant,
        notes: `${bagsToApply} bags of ${nitrogenPercent}% nitrogen fertilizer applied`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Job saved to audit logs', [
        {
          text: 'View Logs',
          onPress: () => router.push('/(tabs)/audit-logs'),
        },
        {
          text: 'Done',
          onPress: () => {
            // Reset form
            setTurfAreaSqFt('5000');
            setNitrogenPercent('10');
            setPhosphorusPercent('10');
            setPotassiumPercent('10');
            setBagWeightLbs('50');
            setBagsToApply('1');
            setResult(null);
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [result, bagsToApply, nitrogenPercent, router]);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">N-Calculator</Text>
            <Text className="text-sm text-muted">FDACS-Compliant Nitrogen Math</Text>
          </View>

          {/* Turf Area Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Turf Area (sq ft)</Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-foreground bg-surface"
              placeholder="5000"
              value={turfAreaSqFt}
              onChangeText={setTurfAreaSqFt}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Fertilizer Analysis */}
          <View className="gap-3 bg-surface rounded-lg p-4">
            <Text className="text-sm font-semibold text-foreground">Fertilizer Analysis (NPK)</Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Nitrogen %</Text>
                <TextInput
                  className="border border-border rounded-lg p-2 text-foreground bg-background"
                  placeholder="10"
                  value={nitrogenPercent}
                  onChangeText={setNitrogenPercent}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Phosphorus %</Text>
                <TextInput
                  className="border border-border rounded-lg p-2 text-foreground bg-background"
                  placeholder="10"
                  value={phosphorusPercent}
                  onChangeText={setPhosphorusPercent}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Potassium %</Text>
                <TextInput
                  className="border border-border rounded-lg p-2 text-foreground bg-background"
                  placeholder="10"
                  value={potassiumPercent}
                  onChangeText={setPotassiumPercent}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
          </View>

          {/* Bag Details */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Bag Weight (lbs)</Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-foreground bg-surface"
              placeholder="50"
              value={bagWeightLbs}
              onChangeText={setBagWeightLbs}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Release Type */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Release Type</Text>
            <View className="flex-row gap-2">
              {(['quick-release', 'slow-release'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setReleaseType(type)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: releaseType === type ? colors.primary : colors.border,
                      backgroundColor: releaseType === type ? colors.primary : colors.surface,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    className={`text-center font-semibold ${
                      releaseType === type ? 'text-background' : 'text-foreground'
                    }`}
                  >
                    {type === 'quick-release' ? 'Quick' : 'Slow'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Bags to Apply */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-foreground">Bags to Apply</Text>
              <TouchableOpacity
                onPress={handleQuickMax}
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
              >
                <Text className="text-xs font-semibold text-primary">Max Compliant</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="border border-border rounded-lg p-3 text-foreground bg-surface"
              placeholder="1"
              value={bagsToApply}
              onChangeText={setBagsToApply}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Calculate Button */}
          <TouchableOpacity
            onPress={handleCalculate}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text className="text-lg font-bold text-background">Calculate</Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View className="bg-error/10 border border-error rounded-lg p-3">
              <Text className="text-sm text-error font-semibold">{error}</Text>
            </View>
          )}

          {/* Results */}
          {result && (
            <View className="gap-3">
              {/* Compliance Status */}
              <View
                className={`rounded-lg p-4 border-2 ${
                  result.isCompliant
                    ? 'bg-success/10 border-success'
                    : 'bg-error/10 border-error'
                }`}
              >
                <Text
                  className={`text-lg font-bold ${
                    result.isCompliant ? 'text-success' : 'text-error'
                  }`}
                >
                  {result.isCompliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
                </Text>
                <Text className={`text-sm mt-2 ${
                  result.isCompliant ? 'text-success' : 'text-error'
                }`}>
                  {result.complianceMessage}
                </Text>
                {result.warningMessage && (
                  <Text className="text-sm mt-2 text-warning font-semibold">
                    ⚠ {result.warningMessage}
                  </Text>
                )}
              </View>

              {/* Calculation Details */}
              <View className="bg-surface rounded-lg p-4 gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Pounds N per Bag:</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {result.poundsNPerBag.toFixed(2)} lbs
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Total Pounds N:</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {result.totalPoundsN.toFixed(2)} lbs
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Rate (per 1,000 sq ft):</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {result.applicationRatePer1000SqFt.toFixed(2)} lbs
                  </Text>
                </View>
                <View className="flex-row justify-between border-t border-border pt-3">
                  <Text className="text-sm font-semibold text-foreground">Bags Needed:</Text>
                  <Text className="text-lg font-bold text-primary">
                    {result.bagsNeeded}
                  </Text>
                </View>
              </View>

              {/* Save Job Button */}
              {result.isCompliant && (
                <TouchableOpacity
                  onPress={handleSaveJob}
                  disabled={saving}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    backgroundColor: colors.success,
                    alignItems: 'center',
                    marginTop: 8,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text className="text-lg font-bold text-background">
                    {saving ? '⏳ Saving...' : '✓ Save Compliant Job'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
