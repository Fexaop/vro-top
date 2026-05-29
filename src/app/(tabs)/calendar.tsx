import { SectionList, View, RefreshControl } from 'react-native';
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load calendar.'}
        </Banner>
      )}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => item.date + i}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surfaceVariant }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', padding: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, gap: 12, borderBottomColor: theme.colors.outlineVariant }}>
              <Text variant="bodySmall" style={{ width: 80, paddingTop: 2, color: theme.colors.onSurfaceVariant }}>
                {item.date}
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.text}</Text>
                <Chip
                  compact
                  style={{ alignSelf: 'flex-start', height: 22, backgroundColor: TYPE_COLORS[item.type] + '22' }}
                  textStyle={{ color: TYPE_COLORS[item.type], fontSize: 11 }}
                >
                  {item.type}
                </Chip>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <Text variant="headlineMedium" style={{ padding: 16, paddingBottom: 8 }}>Academic Calendar</Text>
          }
          ListEmptyComponent={
            <Text className="text-center p-8" style={{ color: theme.colors.onSurfaceVariant }}>
              No calendar events found.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}
