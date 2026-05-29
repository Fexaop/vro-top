import { useQuery } from '@tanstack/react-query';
import { FlatList, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import type { ExamSlot } from '@/types/exam';

function ExamCard({ item }: { item: ExamSlot }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.courseCode}</Text>
          </View>
          <Chip compact>{item.session}</Chip>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.examTime}</Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Venue: {item.venue}</Text>
          {item.seatNumber && (
            <Text variant="bodySmall" style={{ color: colors.primary, fontWeight: 'bold' }}>
              Seat: {item.seatNumber}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function ExamScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const creds = useAuthStore((s) => s.vtopCredentials);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-schedule'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchExamSchedule(session);
    },
    enabled: !!creds,
    staleTime: 30 * 60 * 1000,
  });

  const sections = data
    ? Object.entries(
        data.reduce<Record<string, ExamSlot[]>>((acc, slot) => {
          const key = slot.examType || 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(slot);
          return acc;
        }, {}),
      ).map(([title, slotData]) => ({ title, data: slotData }))
    : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {String(error)}
        </Banner>
      )}
      <View style={styles.titleRow}>
        <Text variant="headlineMedium">Exam Schedule</Text>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.courseCode + item.date + item.session}
          renderItem={({ item }) => <ExamCard item={item} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceVariant }]}>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleRow: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { padding: 16, gap: 12 },
  card: { marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8, borderRadius: 8 },
});
