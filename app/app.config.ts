import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SchriftInzicht',
  slug: 'schriftinzicht',
  owner: 'dex-appmaker',
  scheme: 'schriftinzicht',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'nl.schriftinzicht.app',
    versionCode: 2,
    permissions: ['INTERNET'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'schriftinzicht.nl' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  ios: {
    bundleIdentifier: 'nl.schriftinzicht.app',
    supportsTablet: true,
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: false,
        },
      },
    ],
  ],
  extra: {
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://schriftinzicht.nl',
    eas: { projectId: '12ffcc59-9785-4468-9dc9-0da76cc3284e' },
  },
});
