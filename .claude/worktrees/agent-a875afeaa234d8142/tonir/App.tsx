import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansArmenian_400Regular,
  NotoSansArmenian_500Medium,
  NotoSansArmenian_600SemiBold,
  NotoSansArmenian_700Bold,
  NotoSansArmenian_800ExtraBold,
} from '@expo-google-fonts/noto-sans-armenian';

import { AppNavigator } from './src/navigation';
import { FONTS } from './src/theme';

// Keep the splash screen visible until fonts are ready
SplashScreen.preventAutoHideAsync();

// Apply Noto Sans Armenian as the default typeface for every Text in the app.
// Component-level fontFamily/fontWeight styles always override this baseline.
(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.style = { fontFamily: FONTS.regular };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArmenian_400Regular,
    NotoSansArmenian_500Medium,
    NotoSansArmenian_600SemiBold,
    NotoSansArmenian_700Bold,
    NotoSansArmenian_800ExtraBold,
  });

  useEffect(() => {
    // Hide splash as soon as fonts are ready (or gracefully if loading fails)
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep splash visible while loading
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
