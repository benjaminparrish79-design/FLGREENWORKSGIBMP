import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useProSubscription } from '@/hooks/use-pro-subscription';
import { useColors } from '@/hooks/use-colors';

export interface ProFeatureGateProps {
  children: React.ReactNode;
  featureName?: string;
  onUpgradePress?: () => void;
  showLockIcon?: boolean;
}

/**
 * Component to gate Pro-only features
 * Shows upgrade prompt if user doesn't have Pro subscription
 */
export function ProFeatureGate({
  children,
  featureName = 'This feature',
  onUpgradePress,
  showLockIcon = true,
}: ProFeatureGateProps) {
  const { isPro, isLoading } = useProSubscription();
  const colors = useColors();

  if (isLoading) {
    return (
      <View className="items-center justify-center p-4">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isPro) {
    return (
      <View className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 items-center gap-3">
        {showLockIcon && <Text className="text-2xl">🔒</Text>}
        <Text className="text-sm font-semibold text-foreground text-center">
          {featureName} is available for Pro subscribers
        </Text>
        <TouchableOpacity
          onPress={onUpgradePress}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 6,
            backgroundColor: colors.primary,
          }}
        >
          <Text className="text-xs font-semibold text-background">Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Hook-based alternative for conditional rendering
 */
export function useProFeatureAccess(featureName?: string) {
  const { isPro, isLoading } = useProSubscription();

  return {
    hasAccess: isPro,
    isLoading,
    message: !isPro ? `${featureName || 'This feature'} requires Pro subscription` : null,
  };
}
