# Building Lakshya as a Windows App and an Android App

Lakshya is a client-only app (all data is stored in the browser's
`localStorage` — nothing calls a server), which is why it can be wrapped
directly as a desktop app (Electron) and a mobile app (Capacitor) with no
backend needed. The AI/Gemini server code (`server.ts`) is not used by
either app and can be ignored — it was only ever a placeholder that the
UI never called.

You'll need to run these builds on your own machine, since they require
downloading Electron/Android build tools that aren't available in this
sandbox.

## 0. One-time setup

```bash
npm install
```

This installs Electron, electron-builder, and the Capacitor CLI (already
added to `package.json`), in addition to the app's normal dependencies.

---

## 1. Windows App (Electron)

### Try it locally first
```bash
npm run electron:dev
```
This builds the web app and opens it in a desktop window.

### Build the installer (.exe)
```bash
npm run electron:build:win
```
This produces a Windows installer (NSIS `.exe`) in the `release/` folder.
You can build this from Windows, macOS, or Linux — electron-builder cross-compiles.

**Optional:** replace `electron/icon.ico` with your own 256x256 `.ico` file
for a custom app icon (a default Electron icon is used otherwise).

---

## 2. Android App (Capacitor)

### Prerequisites
- [Android Studio](https://developer.android.com/studio) installed (this gives you the Android SDK and Gradle)
- JDK 17 (Android Studio bundles a compatible one)

### One-time: add the Android platform
```bash
npm run cap:add:android
```
This builds the web app and generates a native `android/` project.

### Every time you change the app
```bash
npm run cap:sync
```

### Open in Android Studio and build the APK
```bash
npm run cap:open:android
```
Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The `.apk` will appear under `android/app/build/outputs/apk/`.

To build a signed release APK/AAB for the Play Store, use
**Build → Generate Signed Bundle / APK** in Android Studio instead, which
will walk you through creating a signing key.

**Optional:** customize the app icon/splash screen using Android Studio's
Image Asset tool (`android/app/src/main/res`), or with
`npx @capacitor/assets generate` if you add source icon/splash images.

---

## What changed in the project

- `vite.config.ts` — set `base: './'` so the built `index.html` works when
  loaded from `file://` (Electron) or a WebView asset root (Android),
  not just from a web server root.
- `electron/main.cjs` — new Electron entry point; opens a desktop window
  loading `dist/index.html`.
- `capacitor.config.ts` — new Capacitor config pointing at the `dist/` build.
- `package.json` — added `electron:*` and `cap:*` scripts, an
  `electron-builder` config block, and Electron/Capacitor as dependencies.
- Nothing in `src/` was changed — the app's UI/logic is untouched.

## Notes
- All student/habit/goal data still lives in `localStorage`, exactly as in
  the browser version, so it stays on-device for both the Windows and
  Android apps (per-app storage — not shared between the two).
- If you later want AI insights on these apps, the cleanest path is a
  small hosted API (e.g. a serverless function) that both apps call over
  HTTPS with your Gemini key kept server-side — never bundle a Gemini API
  key inside the Windows/Android app itself, since it'd be extractable.
