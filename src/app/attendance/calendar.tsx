import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load attendance details.'}
        </Banner>
      )}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
      >
        <Text variant="headlineMedium" style={styles.title}>
          Attendance Log
        </Text>
        <Text variant="bodySmall" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {decodeURIComponent(courseCode ?? '')}
        </Text>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" /></View>
        ) : (data ?? []).length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No attendance records found.</Text>
        ) : (
          (data ?? []).map((day) => (
            <Card key={day.date} style={styles.card} mode="outlined">
              <Card.Title title={day.date} titleVariant="titleSmall" />
              <Card.Content style={styles.periods}>
                {day.periods.map((p, i) => (
                  <View key={i} style={styles.periodRow}>
                    <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface }}>{p.slot}</Text>
                    <Chip
                      compact
                      style={[styles.chip, { backgroundColor: (STATUS_COLOR[p.status] ?? '#777') + '22' }]}
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 16 },
  empty: { textAlign: 'center', padding: 32 },
  card: { marginBottom: 12 },
  periods: { gap: 8 },
  periodRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { height: 22 },
});
