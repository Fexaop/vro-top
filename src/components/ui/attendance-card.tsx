import { StyleSheet, View } from 'react-native';
import { Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import type { AttendanceCourse } from '@/types/attendance';

interface Props {
  course: AttendanceCourse;
  onPress?: () => void;
}

export function AttendanceCard({ course, onPress }: Props) {
  const theme = useTheme();
  const pct = course.percentage;
  const isLow = pct < 75;
  const isBorder = pct >= 75 && pct < 85;

  const barColor = isLow
    ? theme.colors.error
    : isBorder
      ? '#F5A623'
      : theme.colors.tertiary;

  return (
    <Card style={styles.card} onPress={onPress} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text variant="titleSmall" numberOfLines={1}>
              {course.courseTitle}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {course.courseCode} · {course.slot}
            </Text>
          </View>
          <Text
            variant="headlineSmall"
            style={{ color: barColor, fontVariant: ['tabular-nums'] }}
          >
            {`${pct}%`}
          </Text>
        </View>

        <ProgressBar
          progress={pct / 100}
          color={barColor}
          style={styles.bar}
        />

        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {course.attended}/{course.totalClasses} classes
          </Text>
          {course.faculty ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
              numberOfLines={1}
            >
              {course.faculty.split(' ')[0] ?? ''}
            </Text>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  info: { flex: 1, marginRight: 12 },
  bar: { marginTop: 10, height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
