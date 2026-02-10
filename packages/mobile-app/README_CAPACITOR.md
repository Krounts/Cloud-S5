# Building Android APK (CloudS5 mobile)

Prerequisites (local machine):
- Node >= 18
- npm or yarn
- Java JDK 11+
- Android SDK and Android Studio (for Gradle build)
- Capacitor (we use `npx cap`)

Quick steps:

1. Install dependencies

```bash
cd packages/mobile-app
npm install
```

2. Build web assets

```bash
npm run build:web
```

3. Add Android platform and sync

```bash
npx cap add android
npx cap sync android
```

4. Open Android Studio and build APK

```bash
npx cap open android
# In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

5. Release signing

Follow Android Studio docs to sign your APK for release. Use `./gradlew assembleRelease` inside `android/` if needed.

Notes:
- The `capacitor.config.json` file points to `dist/` as the webDir.
- I added npm scripts: `prepare:android` to build and sync in one step.
