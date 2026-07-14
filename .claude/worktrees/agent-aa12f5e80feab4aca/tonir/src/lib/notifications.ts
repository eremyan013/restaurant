import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      (Constants.easConfig as any)?.projectId ??
      (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await (supabase as any).from('profiles').update({ push_token: token }).eq('id', userId);
  } catch {
    // Running in simulator or EAS project not yet configured — skip silently
  }
}
