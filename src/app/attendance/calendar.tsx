import { ScrollView, View, RefreshControl } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';

const STATUS_COLOR: Record<string, string> = {
  Present: '#2E7D32',
  Absent: '#C62828',
  OD: '#1565C0',
  EAB: '#E65100',
};

export default function AttendanceCalendarScreen() {
  const theme = useTheme();
  const { courseCode } = useLocalSearchParams<{ courseCode: string }>();
  const adapter = useScraper();
  const { ensureFreshSession } = useVtopSession();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['day-attendance', courseCode],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return adapter.fetchDayAttendance(session, decodeURIComponent(courseCode ?? ''));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!courseCode,
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load attendance details.'}
        </Banner>
      )}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
      >
        <Text variant="headlineMedium" style={{ marginBottom: 4 }}>
          Attendance Log
        </Text>
        <Text variant="bodySmall" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
          {decodeURIComponent(courseCode ?? '')}
        </Text>

        {isLoading ? (
          <View className="flex-1 items-center justify-center" style={{ paddingTop: 48 }}><ActivityIndicator size="large" /></View>
        ) : (data ?? []).length === 0 ? (
          <Text className="text-center p-8" style={{ color: theme.colors.onSurfaceVariant }}>No attendance records found.</Text>
        ) : (
          (data ?? []).map((day) => (
            <Card key={day.date} style={{ marginBottom: 12 }} mode="outlined">
              <Card.Title title={day.date} titleVariant="titleSmall" />
              <Card.Content style={{ gap: 8 }}>
                {day.periods.map((p, i) => (
                  <View key={i} className="flex-row items-center">
                    <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface }}>{p.slot}</Text>
                    <Chip
                      compact
                      style={{ height: 22, backgroundColor: (STATUS_COLOR[p.status] ?? '#777') + '22' }}
                      textStyle={{ color: STATUS_COLOR[p.status] ?? '#777', fontSize: 11 }}
                    >
                      {p.status}
                    </Chip>
                  </View>
                ))}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
