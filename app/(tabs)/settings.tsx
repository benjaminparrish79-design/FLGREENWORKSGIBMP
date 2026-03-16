import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import {
  getSubscriptionDetails,
  restorePurchases,
} from '@/lib/revenuecat-service';
import { useProSubscription } from '@/hooks/use-pro-subscription';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const colors = useColors();
  const auth = useAuth();
  const { isPro, isLoading: subLoading, expiresAt, daysRemaining, autoRenew, refresh } = useProSubscription();

  const handleRestorePurchase = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await restorePurchases();
      await refresh();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  }, [refresh]);

  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel, manage your subscription through the Google Play Store directly.',
      [{ text: 'OK', style: 'cancel' }]
    );
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.logout();
          } catch (error) {
            Alert.alert('Error', 'Failed to log out');
          }
        },
      },
    ]);
  }, [auth]);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Settings</Text>
            <Text className="text-sm text-muted">Account & Subscription</Text>
          </View>

          <View className={`rounded-lg p-4 border-2 ${isPro ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
            <Text className={`text-lg font-bold ${isPro ? 'text-primary' : 'text-foreground'}`}>
              {subLoading ? 'Checking...' : isPro ? '⭐ Pro Subscriber' : '📱 Free Plan'}
            </Text>
            <Text className="text-sm text-muted mt-1">
              {isPro ? (daysRemaining != null ? `Renews in ${daysRemaining} days` : 'Active') : 'Upgrade to Pro for full compliance tools'}
            </Text>
            {!isPro && (
              <View className="gap-2 mt-3">
                <Text className="text-xs text-muted">✓ Advanced analytics</Text>
                <Text className="text-xs text-muted">✓ Priority support</Text>
                <Text className="text-xs text-muted">✓ Unlimited audit logs</Text>
              </View>
            )}
          </View>

          <View className="gap-2">
            {isPro ? (
              <TouchableOpacity onPress={handleCancelSubscription} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.error + '20', alignItems: 'center' }}>
                <Text className="text-sm font-semibold text-error">Manage Subscription</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text className="text-sm font-semibold text-background">Upgrade to Pro — $4.99/month</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleRestorePurchase} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' }}>
              <Text className="text-sm font-semibold text-foreground">Restore Purchase</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Account</Text>
            <View className="bg-surface rounded-lg p-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Email</Text>
                <Text className="text-sm font-semibold text-foreground">{auth.user?.email ?? '—'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Name</Text>
                <Text className="text-sm font-semibold text-foreground">{auth.user?.name ?? '—'}</Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">About</Text>
            <View className="bg-surface rounded-lg p-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">App Version</Text>
                <Text className="text-sm font-semibold text-foreground">1.0.0</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Compliance Standard</Text>
                <Text className="text-sm font-semibold text-foreground">FDACS Rule 5E-1.003</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogout} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.error + '20', alignItems: 'center' }}>
            <Text className="text-sm font-semibold text-error">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
