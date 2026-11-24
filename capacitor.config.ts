import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wrapper for the Android APK (sideload — no Play Store).
//
// IMPORTANT: this app is NOT a fully offline bundle. The finance backend
// (Next.js API routes + Neon PostgreSQL) lives on Vercel, so the APK is
// a WebView wrapper that loads the live site at server.url below.
// That is why the APK needs internet to show live data.
// Live Vercel URL (verified 2026-11-24): https://expense-tracker-dusky-nine-25.vercel.app
// If the deployed URL ever changes, update server.url here, re-run
// `npx cap sync android` and rebuild the APK via GitHub Actions
// (.github/workflows/android.yml).
//
// Voice input in the APK does NOT use the browser Web Speech API
// (unavailable in a WebView). It uses the native speech plugin
// (@capacitor-community/speech-recognition) — see
// src/hooks/use-speech-recognition.ts. The browser keeps using the
// Web Speech API, so voice works in both places.
const config: CapacitorConfig = {
  appId: "com.kaung.myfinance",
  appName: "MyFinance",
  webDir: "out",
  server: {
    url: "https://expense-tracker-dusky-nine-25.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
