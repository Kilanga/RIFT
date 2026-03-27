module.exports = {
  expo: {
    name:        'RIFT',
    slug:        'rift-roguelite',
    version:     '1.2.0',
    orientation: 'portrait',
    backgroundColor: '#0A0A0F',
    splash: {
      backgroundColor: '#0A0A0F',
      resizeMode:      'contain',
    },
    ios: {
      supportsTablet:    false,
      bundleIdentifier:  'com.rift.roguelite',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0A0A0F',
      },
      package:     'com.rift.roguelite',
      versionCode: 1,
      locales:     ['fr', 'en'],
    },
    web: {
      bundler: 'metro',
    },
    extra: {
      supabaseUrl:  process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnon: process.env.EXPO_PUBLIC_SUPABASE_ANON,
      eas: {
        projectId: '205dbe3e-d123-4aa1-9bdd-d77f6a6f19e0',
      },
    },
    plugins: [
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.rift.roguelite',
          enableGooglePay:    false,
        },
      ],
    ],
  },
};
