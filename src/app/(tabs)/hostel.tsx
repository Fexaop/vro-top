import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Banner, Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';

export default function HostelScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const creds = useAuthStore((s) => s.vtopCreds);

  const { data: hostel, isLoading: hostelLoading, error: hostelError, refetch: refetchHostel } = useQuery({
    queryKey: ['hostel-info'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchHostelInfo(session);
    },
    enabled: !!creds,
    staleTime: 30 * 60 * 1000,
  });

  const { data: leaves, isLoading: leavesLoading, refetch: refetchLeaves } = useQuery({
    queryKey: ['leave-history'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchLeaveHistory(session);
    },
    enabled: !!creds,
    staleTime: 15 * 60 * 1000,
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {hostelError && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => { void refetchHostel(); void refetchLeaves(); } }]}>
          {String(hostelError)}
        </Banner>
      )}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16 }}>Hostel</Text>

        {hostelLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} />
        ) : hostel ? (
          <Card mode="outlined" style={{ marginBottom: 8 }}>
            <Card.Content>
              <Text variant="titleMedium">Room Details</Text>
              <Divider style={{ marginVertical: 8 }} />
              <View className="flex-row justify-between items-center" style={{ paddingVertical: 4 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Block</Text>
                <Text variant="bodyMedium">{hostel.blockName}</Text>
              </View>
              <View className="flex-row justify-between items-center" style={{ paddingVertical: 4 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Room</Text>
                <Text variant="bodyMedium">{hostel.roomNumber}</Text>
              </View>
              <View className="flex-row justify-between items-center" style={{ paddingVertical: 4 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Gender</Text>
                <Text variant="bodyMedium">{hostel.gender}</Text>
              </View>
              <View className="flex-row justify-between items-center" style={{ paddingVertical: 4 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Mess</Text>
                <Text variant="bodyMedium">{hostel.messType}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <View className="flex-row justify-between items-center" style={{ marginTop: 16, gap: 12 }}>
          <Button mode="outlined" style={{ flex: 1 }} onPress={() => router.push('/hostel/mess')}>Mess Menu</Button>
          <Button mode="outlined" style={{ flex: 1 }} onPress={() => router.push('/hostel/laundry')}>Laundry</Button>
        </View>

        <Text variant="titleMedium" style={{ marginTop: 24, marginBottom: 8 }}>Leave History</Text>
        {leavesLoading ? (
          <ActivityIndicator />
        ) : leaves?.length ? (
          leaves.map((l) => (
            <Card key={l.id} mode="outlined" style={{ marginBottom: 8 }}>
              <Card.Content>
                <View className="flex-row justify-between items-center" style={{ paddingVertical: 4 }}>
                  <Text variant="bodyMedium">{l.reason}</Text>
                  <Chip compact style={{
                    backgroundColor: l.status === 'Approved' ? colors.tertiary + '20' :
                      l.status === 'Rejected' ? colors.error + '20' : colors.surfaceVariant,
                  }}>
                    {l.status}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                  {new Date(l.fromDate).toLocaleDateString()} — {new Date(l.toDate).toLocaleDateString()}
                </Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>No leave records found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
