import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import {
  getSubscriptionStatus,
  getSubscriptionDetails,
  restorePurchases,
  cancelSubscription,
  clearSubscriptionCache,
  formatPrice,
  type Subscription,
} from '@/lib/billing-service';
import { resetRevenueCatUser } from '@/lib/revenuecat-service';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    try {
      const [sub, det] = await Promise.all([
        getSubscriptionStatus(),
        getSubscriptionDetails(),
      ]);
      setSubscription(sub);
      setDetails(det);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleRestorePurchase = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const restored = await restorePurchases();
      await loadSubscription();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    }
  }, [loadSubscription]);

  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your Pro subscription?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              await loadSubscription();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Canceled', 'Your subscription has been canceled.');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  }, [loadSubscription]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearSubscriptionCache();
            await resetRevenueCatUser();
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if cleanup fails
            await logout();
          }
        },
      },
    ]);
  }, [logout]);

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
            <View className={`rounded-lg p-4 border-2 ${
              details.isPro ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
            }`}>
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className={`text-lg font-bold ${
                    details.isPro ? 'text-primary' : 'text-foreground'
                  }`}>
                    {details.isPro ? '⭐ Pro Subscriber' : '📱 Free Plan'}
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    {details.isPro ? `Renews in ${details.daysRemaining} days` : 'Upgrade to Pro'}
                  </Text>
                </View>
              </View>

              {details.isPro && (
                <View className="gap-2 mb-3 pb-3 border-b border-primary/20">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Expires:</Text>
                    <Text className="text-xs text-foreground font-semibold">
                      {new Date(details.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Auto-Renew:</Text>
                    <Text className="text-xs text-foreground font-semibold">
                      {details.autoRenew ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
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

          {/* Subscription Actions */}
          <View className="gap-2">
            {details?.isPro ? (
              <TouchableOpacity
                onPress={handleCancelSubscription}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: colors.error + '20',
                  alignItems: 'center',
                }}
              >
                <Text className="text-sm font-semibold text-error">Cancel Subscription</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                }}
              >
                <Text className="text-sm font-semibold text-background">
                  Upgrade to Pro — {formatPrice()}
                </Text>
              </TouchableOpacity>
            )}

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
                <Text className="text-sm text-muted">Name</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {user?.name ?? 'Benjamin Parrish'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Email</Text>
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {user?.email ?? 'benjaminparrish79-design@gmail.com'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Member Since</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {user?.lastSignedIn
                    ? new Date(user.lastSignedIn).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </Text>
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
