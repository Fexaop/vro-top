import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCHEDULE = [
  { day: 'Monday', slot: 'A Wing' },
  { day: 'Tuesday', slot: 'B Wing' },
  { day: 'Wednesday', slot: 'C Wing' },
  { day: 'Thursday', slot: 'D Wing' },
  { day: 'Friday', slot: 'E Wing' },
  { day: 'Saturday', slot: 'F Wing' },
  { day: 'Sunday', slot: 'G Wing' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function LaundryScreen() {
  const { colors } = useTheme();
  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Laundry Schedule</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
          Laundry is done wing-wise. Check your wing below.
        </Text>

        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Weekly Schedule</Text>
            <Divider style={{ marginVertical: 8 }} />
            {SCHEDULE.map(({ day, slot }) => (
              <View key={day} style={[styles.row, { paddingVertical: 6 }]}>
                <Text variant="bodyMedium" style={day === todayName ? { fontWeight: 'bold', color: colors.primary } : {}}>
                  {day}
                </Text>
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{slot}</Text>
                  {day === todayName && <Chip compact>Today</Chip>}
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Instructions</Text>
            <Divider style={{ marginVertical: 8 }} />
            {[
              'Drop clothes before 8:00 AM at your floor laundry room.',
              'Clothes will be returned by 6:00 PM.',
              'Label all clothes with your room number.',
              'Dry-clean items are not accepted.',
              'Maximum 5 items per wash day.',
            ].map((instruction, i) => (
              <Text key={i} variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 6 }}>
                {i + 1}. {instruction}
              </Text>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  title: { marginBottom: 12 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
