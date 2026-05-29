import { SectionList, StyleSheet, View, RefreshControl } from 'react-native';
import { ActivityIndicator, Banner, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import type { CalendarEvent } from '@/types/calendar';

type Section = { title: string; data: CalendarEvent[] };

function groupByMonth(events: CalendarEvent[]): Section[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 7) || e.date.split('-').slice(0, 2).join('-') || e.date;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return [...map.entries()].map(([title, data]) => ({ key: title, title, data }));
}

const TYPE_COLORS: Record<string, string> = {
  Instructional: '#1565C0',
  Holiday: '#2E7D32',
  Other: '#6A1B9A',
};

export default function CalendarScreen() {
  const theme = useTheme();
  const adapter = useScraper();
  const { ensureFreshSession } = useVtopSession();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['academic-calendar'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return adapter.fetchAcademicCalendar(session);
    },
    staleTime: 60 * 60 * 1000,
  });

  const sections = groupByMonth(data ?? []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load calendar.'}
        </Banner>
      )}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => item.date + i}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[styles.eventRow, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text variant="bodySmall" style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                {item.date}
              </Text>
              <View style={styles.eventContent}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.text}</Text>
                <Chip
                  compact
                  style={[styles.chip, { backgroundColor: TYPE_COLORS[item.type] + '22' }]}
                  textStyle={{ color: TYPE_COLORS[item.type], fontSize: 11 }}
                >
                  {item.type}
                </Chip>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <Text variant="headlineMedium" style={styles.title}>Academic Calendar</Text>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              No calendar events found.
            </Text>
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { padding: 16, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', padding: 32 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, fontWeight: 'bold' },
  eventRow: { flexDirection: 'row', padding: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  date: { width: 80, paddingTop: 2 },
  eventContent: { flex: 1, gap: 4 },
  chip: { alignSelf: 'flex-start', height: 22 },
});
