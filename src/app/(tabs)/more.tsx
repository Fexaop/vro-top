import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const SECTIONS = [
  { label: 'Exam Schedule', icon: 'clipboard-list', href: '/exam' },
  { label: 'Academic Calendar', icon: 'calendar', href: '/calendar' },
  { label: 'Hostel', icon: 'home-city', href: '/hostel' },
  { label: 'LMS / Moodle', icon: 'book-open-variant', href: '/lms' },
  { label: 'Vitol', icon: 'laptop', href: '/vitol' },
  { label: 'Settings', icon: 'cog', href: '/settings' },
] as const;

export default function MoreScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium" style={styles.heading}>
          More
        </Text>
        {SECTIONS.map((s) => (
          <Card
            key={s.href}
            style={styles.card}
            onPress={() => router.push(s.href as never)}
          >
            <Card.Title
              title={s.label}
              left={(props) => {
                const MaterialCommunityIcons =
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  require('@expo/vector-icons').MaterialCommunityIcons as React.ComponentType<{
                    name: string;
                    size: number;
                    color: string;
                  }>;
                return (
                  <MaterialCommunityIcons
                    name={s.icon}
                    size={props.size}
                    color={theme.colors.primary}
                  />
                );
              }}
            />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16 },
  heading: { marginBottom: 16 },
  card: { marginBottom: 8 },
});
