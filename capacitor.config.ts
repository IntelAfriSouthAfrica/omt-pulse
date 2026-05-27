import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.intelafri.omtpulse',
  appName: 'OMT Pulse',
  webDir: 'dist/public',
  server: {
    url: 'https://omtpulse.com/login',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
