# Neon Belt Drifter

Neon Belt Drifter is a mobile-first retro neon arcade dodger. Drag anywhere to steer, dodge asteroids, collect energy shards, build streaks, and replay instantly after a crash.

## GitHub repository name

Use: `neon-belt-drifter-android`

## Run locally

```bash
npm install
npm run dev
```

## Build web version

```bash
npm run build
```

## Android APK/AAB

This project is configured with Capacitor Android.

```bash
npm run android:sync
npm run android:apk:debug
npm run android:aab:release
```

Outputs:

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/bundle/release/app-release.aab
```

For GitHub Actions and Play Store signing steps, read:

```text
docs/ANDROID_RELEASE_GUIDE.md
```

Store listing copy and privacy policy are in:

```text
docs/GOOGLE_PLAY_STORE_LISTING.md
docs/PRIVACY_POLICY.md
```
