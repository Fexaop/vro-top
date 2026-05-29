import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { OnDeviceAdapter } from '@/lib/scraper/on-device-adapter';
import { secureStorage } from '@/lib/storage/secure';
import { persistentStorage } from '@/lib/storage/persistent';
import type { VtopCredentials } from '@/types/auth';

export const REFRESH_TASK = 'unicc-refresh';

TaskManager.defineTask(REFRESH_TASK, async () => {
  try {
    const credsRaw = await secureStorage.get('vtopCredentials');
    if (!credsRaw) return BackgroundTask.BackgroundTaskResult.Failed;

    const creds: VtopCredentials = JSON.parse(credsRaw);
    const adapter = new OnDeviceAdapter();
    const session = await adapter.vtopLogin(creds);

    const attendance = await adapter.fetchAttendance(session);
    await persistentStorage.set('attendance_cache', attendance);

    const grades = await adapter.fetchCurrentGrades(session);
    await persistentStorage.set('grades_cache', grades);

    const low = attendance.filter((c) => c.percentage < 75);
    if (low.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Low Attendance Alert',
          body: `${low.length} course${low.length > 1 ? 's' : ''} below 75%: ${low.map((c) => c.courseCode).join(', ')}`,
        },
        trigger: null,
      });
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh() {
  if (Platform.OS === 'web') return;
  await BackgroundTask.registerTaskAsync(REFRESH_TASK, {
    minimumInterval: 15 * 60,
  });
}

export async function unregisterBackgroundRefresh() {
  if (Platform.OS === 'web') return;
  await BackgroundTask.unregisterTaskAsync(REFRESH_TASK);
}
