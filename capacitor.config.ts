import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lakshya.app',
  appName: 'Lakshya',
  // Vite build output — Capacitor copies this into the native Android project.
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#0b0f19',
};

export default config;
