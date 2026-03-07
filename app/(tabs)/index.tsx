import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">FL-GreenGuard</Text>
            <Text className="text-sm text-muted">Professional Landscaping Compliance</Text>
          </View>

          {/* Quick Stats */}
          <View className="bg-surface rounded-lg p-4 gap-3">
            <Text className="text-sm font-semibold text-foreground">This Week</Text>
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Applications</Text>
                <Text className="text-2xl font-bold text-foreground">0</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Compliant</Text>
                <Text className="text-2xl font-bold text-success">0</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Rate</Text>
                <Text className="text-2xl font-bold text-primary">—</Text>
              </View>
            </View>
          </View>

          {/* GPS Status */}
          <View className="bg-primary/10 rounded-lg p-4 border border-primary flex-row items-center gap-3">
            <View className="w-3 h-3 bg-success rounded-full" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Ring of Responsibility</Text>
              <Text className="text-xs text-muted">GPS lock active • Ready for applications</Text>
            </View>
          </View>

          {/* Action Cards */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/calculator")}
              className="bg-primary rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-lg font-bold text-background">🚀 Start New Job</Text>
              <Text className="text-xs text-background/80 mt-1">Begin a fertilizer application</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("audit-logs" as any)}
              className="bg-surface border border-border rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-lg font-bold text-foreground">📋 View Audit Logs</Text>
              <Text className="text-xs text-muted mt-1">Review past applications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("wallet" as any)}
              className="bg-surface border border-border rounded-lg p-4 active:opacity-80"
            >
              <Text className="text-lg font-bold text-foreground">💼 Digital Wallet</Text>
              <Text className="text-xs text-muted mt-1">Certificates & licenses</Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="bg-warning/10 rounded-lg p-4 border border-warning">
            <Text className="text-sm font-semibold text-warning mb-2">⚠ 0 Pending Sync</Text>
            <Text className="text-xs text-warning/80">
              All audit logs are synced to the cloud. Your data is safe.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
