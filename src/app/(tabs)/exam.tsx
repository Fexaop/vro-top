import { useQuery } from '@tanstack/react-query';
import { SectionList, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import type { ExamSlot } from '@/types/exam';

function ExamCard({ item }: { item: ExamSlot }) {
  const { colors } = useTheme();
  return (
    <Card style={{ marginBottom: 8 }} mode="outlined">
      <Card.Content>
        <View className="flex-row items-center justify-between gap-2">
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.courseCode}</Text>
          </View>
          <Chip compact>{item.session}</Chip>
        </View>
        <View className="flex-row items-center justify-between gap-2" style={{ marginTop: 8 }}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {item.date}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.examTime}</Text>
        </View>
        <View className="flex-row items-center justify-between gap-2" style={{ marginTop: 4 }}>
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
  const creds = useAuthStore((s) => s.vtopCreds);

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
      ).map(([title, slotData]) => ({ key: title, title, data: slotData }))
    : [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {String(error)}
        </Banner>
      )}
      <View style={{ padding: 16 }}>
        <Text variant="headlineMedium">Exam Schedule</Text>
      </View>
      {isLoading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.courseCode + item.date + item.session}
          renderItem={({ item }) => <ExamCard item={item} />}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8, borderRadius: 8, backgroundColor: colors.surfaceVariant }}>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}
