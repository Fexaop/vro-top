import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
export default function CourseDetail() {
  const { courseCode } = useLocalSearchParams<{courseCode:string}>();
  return <View style={{flex:1,padding:16}}><Text variant="headlineMedium">{courseCode}</Text></View>;
}
