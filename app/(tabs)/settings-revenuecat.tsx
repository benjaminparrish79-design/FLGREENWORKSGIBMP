import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  getSubscriptionStatus,
  getSubscriptionDetails,
  restorePurchases,
  getAvailablePackages,
  purchasePackage,
  logoutRevenueCat,
  type SubscriptionInfo,
} from '@/lib/revenuecat-service';
import * as Haptics from 'expo-haptics';
import type { Package } from 'react-native-purchases';

export default function SettingsScreen() {
  const colors = useColors();

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, det, pkgs] = await Promise.all([
        getSubscriptionStatus(),
        getSubscriptionDetails(),
        getAvailablePackages(),
      ]);
      setSubscription(sub);
      setDetails(det);
      setPackages(pkgs);
    } catch (error) {
      console.error('Error loading subscription:', error);
      Alert.alert('Error', 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handlePurchase = useCallback(
    async (pkg: Package) => {
      try {
        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await purchasePackage(pkg);
        await loadSubscription();
        Alert.alert('Success', 'Subscription purchased successfully!');
      } catch (error: any) {
        if (error.code !== 'PurchaseCancelledError') {
          Alert.alert('Error', 'Failed to complete purchase');
        }
      } finally {
        setPurchasing(false);
      }
    },
    [loadSubscription]
  );

  const handleRestorePurchase = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await restorePurchases();
      await loadSubscription();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    }
  }, [loadSubscription]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutRevenueCat();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Logged Out', 'You have been logged out.');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <ScreenContainer className="p-4 justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Settings</Text>
            <Text className="text-sm text-muted">Account & Subscription</Text>
          </View>

          {/* Subscription Status */}
          {details && (
            <View
              className={`rounded-lg p-4 border-2 ${
                details.isPro ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
              }`}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text
                    className={`text-lg font-bold ${
                      details.isPro ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {details.isPro ? '⭐ Pro Subscriber' : '📱 Free Plan'}
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    {details.isPro
                      ? `Renews in ${details.daysRemaining} days`
                      : 'Upgrade to Pro'}
                  </Text>
                </View>
              </View>

              {details.isPro && (
                <View className="gap-2 mb-3 pb-3 border-b border-primary/20">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Expires:</Text>
                    <Text className="text-xs text-foreground font-semibold">
                      {details.expiresAt?.toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Auto-Renew:</Text>
                    <Text className="text-xs text-foreground font-semibold">
                      {details.autoRenew ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  {details.managementUrl && (
                    <TouchableOpacity
                      onPress={() => {
                        // Open management URL in browser
                        console.log('Opening management URL:', details.managementUrl);
                      }}
                    >
                      <Text className="text-xs text-primary font-semibold underline">
                        Manage Subscription
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!details.isPro && (
                <View className="gap-2">
                  <Text className="text-sm text-foreground mb-2">
                    Unlock premium features with Pro:
                  </Text>
                  <Text className="text-xs text-muted">✓ Advanced analytics</Text>
                  <Text className="text-xs text-muted">✓ Priority support</Text>
                  <Text className="text-xs text-muted">✓ Unlimited audit logs</Text>
                </View>
              )}
            </View>
          )}

          {/* Available Packages */}
          {!details?.isPro && packages.length > 0 && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Available Plans</Text>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  disabled={purchasing}
                  onPress={() => handlePurchase(pkg)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    opacity: purchasing ? 0.6 : 1,
                  }}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View>
                      <Text className="text-sm font-semibold text-background">
                        {pkg.product.title}
                      </Text>
                      <Text className="text-xs text-background/80">
                        {pkg.product.priceString}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Subscription Actions */}
          <View className="gap-2">
            <TouchableOpacity
              onPress={handleRestorePurchase}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
              }}
            >
              <Text className="text-sm font-semibold text-foreground">Restore Purchase</Text>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Account</Text>

            <View className="bg-surface rounded-lg p-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">License Number</Text>
                <Text className="text-sm font-semibold text-foreground">LF301625</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Email</Text>
                <Text className="text-sm font-semibold text-foreground">user@example.com</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Member Since</Text>
                <Text className="text-sm font-semibold text-foreground">Mar 2026</Text>
              </View>
            </View>
          </View>

          {/* App Info */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">About</Text>

            <View className="bg-surface rounded-lg p-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">App Version</Text>
                <Text className="text-sm font-semibold text-foreground">1.0.0</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Build</Text>
                <Text className="text-sm font-semibold text-foreground">fe53c847</Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
              }}
            >
              <Text className="text-sm font-semibold text-foreground">Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
              }}
            >
              <Text className="text-sm font-semibold text-foreground">Terms of Service</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: colors.error + '20',
              alignItems: 'center',
            }}
          >
            <Text className="text-sm font-semibold text-error">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
