---
name: project-tonir-navigation
description: tonir mobile app uses React Navigation v6, NOT Expo Router — screens live in src/screens/, navigator in src/navigation/index.tsx
metadata:
  type: project
---

The tonir mobile app uses `@react-navigation/native` v6 with a hand-rolled `NavigationContainer` in `tonir/src/navigation/index.tsx`. It is NOT Expo Router despite the CLAUDE.md template suggesting that structure. The entry point is `App.tsx` → `<AppNavigator>`. There is no `app/` directory.

**Why:** The app was scaffolded with bare React Navigation before the project documentation was written. The CLAUDE.md file structure template is aspirational, not actual.

**How to apply:** When designing screens, use `NativeStackNavigationProp` + `RouteProp` from `@react-navigation/native-stack`, add entries to `RootStackParamList` in `navigation/index.tsx`, and register the screen inside the `<Stack.Navigator>` in `AppNavigator`.

Related: [[project-tonir-admin-stack]]
