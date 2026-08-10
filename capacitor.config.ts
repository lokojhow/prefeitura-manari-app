import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.gov.pe.manari.app',
  appName: 'Prefeitura de Manari',
  webDir: 'www',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f7f5ed'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
