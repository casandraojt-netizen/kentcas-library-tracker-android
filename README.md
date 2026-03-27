# Kentcas Library Tracker Android

Android-first Library Tracker app built with React, Vite, and Capacitor.

It tracks physical books and web serials, syncs through Neon PostgreSQL, checks RSS feeds itself on Android, shows `NEW` badges when chapters drop, and can raise local notifications even if you have not opened the desktop app.

## What It Does

- Multi-shelf library management
- Reading history tracking for status changes and chapter progress
- Global search across all shelves and collections
- Dark and light theme toggle
- Swipe right on a card to increment chapter
- Swipe left on a card to open RSS
- RSS feed checking directly from Android
- Background local notifications for new chapter drops
- Neon-backed sync between devices

## Tech Stack

- React 18
- Vite
- Capacitor 6
- Neon PostgreSQL
- Android Studio / Gradle

## Repository Layout

```text
api/                       Vercel serverless endpoints for browser mode
android/                   Capacitor Android project
public/                    Static assets
src/                       React app
src/components/            UI views and modals
src/hooks/                 React hooks
src/lib/                   HTTP, RSS, notifications, helpers
src/db.js                  Neon schema + CRUD + reading history
capacitor.config.json      Capacitor app config
package.json               Scripts and dependencies
```

## Prerequisites

- Node.js 18+
- npm
- Android Studio
- Android SDK
- A Neon PostgreSQL database

## Database Setup

The app will create and migrate the remote schema it needs when it first connects, so you do not need to hand-create tables first if your Neon database is empty.

If you want to inspect what it expects, the main remote tables are:

- `books`
- `reading_history`

The Android app now writes both itself.

## Local Setup

```bash
npm install
```

If you need to refresh the Android project bindings:

```bash
npx cap sync android
```

## Running The Web App

```bash
npm run dev
```

The browser build is mainly for UI work and non-native flows. Android-native RSS and notification behavior is the primary target.

## Turning This Into An APK

### Option 1: Android Studio

1. Install dependencies:

```bash
npm install
```

2. Build the web bundle and sync Capacitor:

```bash
npm run build:android
```

3. Open the Android project:

```bash
npx cap open android
```

4. In Android Studio, let Gradle finish syncing.
5. Build the APK from:

`Build > Build Bundle(s) / APK(s) > Build APK(s)`

6. The debug APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Gradle From The Command Line

You need Java and the Android SDK configured first.

Windows example:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="C:\AndroidStudio"
$env:ANDROID_SDK_ROOT="C:\AndroidStudio"
npm run build:android
cd android
.\gradlew.bat assembleDebug
```

The resulting APK is the same:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Required Android Environment Notes

If Gradle complains about missing Java:

- set `JAVA_HOME` to Android Studio's bundled JBR, commonly:
  `C:\Program Files\Android\Android Studio\jbr`

If Gradle complains about missing SDK location:

- set `ANDROID_HOME` / `ANDROID_SDK_ROOT`
- or create `android/local.properties` with:

```properties
sdk.dir=C\:\\AndroidStudio
```

Do not commit `android/local.properties`; it is machine-specific and ignored in this repo.

## First Launch

On first launch the app asks for your Neon connection string.

Example:

```text
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

Once connected, the app will:

- ensure the remote schema exists
- sync books and reading history through Neon
- start checking RSS feeds itself on Android

## RSS And Notifications

This Android version is not dependent on the desktop app for RSS updates.

It does two separate things:

- foreground app polling:
  the React app checks tracked feeds on startup and while the app is active
- background notifications:
  the Android native side schedules feed checks and posts local notifications when a new latest chapter appears

That means:

- `NEW` badges can be discovered by Android itself
- the phone can alert you without the desktop app being open

## Main Scripts

```bash
npm run dev
npm run build
npm run build:android
npm run android
```

## Notes For Publishing

- Debug APKs are unsigned test builds
- For Play Store or normal distribution, create a release signing config in Android Studio
- Keep your Neon connection string out of source control
- `android/local.properties` and keystores are intentionally ignored

## License

No license file is included yet. Add one if you want the GitHub repository to be explicitly open source.
