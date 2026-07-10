# Android Release Guide — Neon Belt Drifter

## Recommended GitHub repository name
`neon-belt-drifter-android`

## App identity
- App name: `Neon Belt Drifter`
- Android package/application ID: `com.neonbeltdrifter.app`
- First release version: `1.0.0`

## Local commands

Local Android builds require JDK 21 and the Android SDK/Gradle environment. If you do not want to install those locally, use the GitHub Action below; it installs Java automatically.

Install dependencies:

```bash
npm install
```

Build the web game and sync Android:

```bash
npm run android:sync
```

Create a debug APK for testing on a phone:

```bash
npm run android:apk:debug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Create a release AAB:

```bash
npm run android:aab:release
```

Release AAB output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## GitHub setup steps

1. Create a new GitHub repository named `neon-belt-drifter-android`.
2. If GitHub web upload says “upload fewer than 100 files”, use `public/neon-belt-drifter-github-web-upload.zip`; it excludes generated Android files and lets the workflow create them.
3. Upload the extracted files to the repository, or use Git/GitHub Desktop for the full source.
4. Open the repository on GitHub.
5. Go to **Actions**.
6. Run **Android APK/AAB Build**.
7. Download the workflow artifacts:
   - `Neon-Belt-Drifter-debug-apk`
   - `Neon-Belt-Drifter-release-aab-unsigned`
   - `Neon-Belt-Drifter-release-aab-signed` once signing secrets are configured

## Signing for Google Play

Google Play requires a signed AAB. Do not commit keystores or passwords to GitHub.

Create an upload keystore locally:

```bash
keytool -genkeypair -v -keystore neon-belt-drifter-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias neon_belt_upload
```

Convert the keystore to Base64:

```bash
base64 -w 0 neon-belt-drifter-upload.jks
```

Add these GitHub repository secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Use `neon_belt_upload` as `ANDROID_KEY_ALIAS` if you used the command above.

After secrets are added, run the GitHub Action again and upload the signed AAB to Play Console.

## Play Store checklist

- Use `docs/GOOGLE_PLAY_STORE_LISTING.md` for title, short description, full description, and about copy.
- Use `docs/PRIVACY_POLICY.md` as your starting privacy policy and replace the contact line.
- A web privacy policy page is also included at `public/privacy-policy.html`. After enabling GitHub Pages, use a URL like `https://YOUR_USERNAME.github.io/neon-belt-drifter-android/privacy-policy.html` in Play Console.
- Upload the icon and screenshots from `public/generated-assets/`.
- Complete Play Console Data Safety truthfully. Current intended state: no ads, no account, local high score, no personal data collection by the game itself.
