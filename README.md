# Kentcas Library Tracker Android

Android-first Library Tracker app built with React, Vite, and Capacitor.

It is meant to be a personal cross-device reading tracker for:

- physical books
- web novels
- manga / manhwa / manhua
- forum fiction and other RSS-trackable serials

The app stores your library in Neon PostgreSQL, syncs changes between devices, checks RSS feeds directly on Android, shows `NEW` badges when chapters drop, and can raise local notifications without depending on the desktop app being open.

## Intended Use

Use this app if you want one place to keep track of:

- what you own
- what you are reading
- what shelf or collection something belongs to
- your current chapter / volume progress
- status changes over time
- RSS-backed update tracking for web fiction
- reading history across devices

It is designed for people who mix normal books with ongoing online reading and want mobile access without losing the richer tracking workflow.

## Features

### Library Organization

- Separate physical and web collections
- Custom shelves on top of those collections
- Multi-shelf support for a single book
- Global search across all shelves and collections
- Sorting by recent RSS update, last modified, title, or status
- Filtering by status and genre
- Favorites
- R18 flagging and hide/show toggle

### Book Metadata

- Title
- Author
- Cover image URL
- Genre
- Status
- Published year
- Notes
- Tags
- Favorite flag
- R18 flag
- Source URL
- RSS feed URL
- Web content type

### Progress Tracking

- Current chapter / volume tracking
- Total chapter / volume tracking
- Progress bars on cards
- One-tap `+1` chapter
- Swipe right on cards to increment chapter

### Web Reading Features

- RSS reader panel for tracked web titles
- Direct Android-side RSS checking
- `NEW` badges when a feed's latest chapter changes
- Mark-as-read handling for RSS updates
- Swipe left on cards to open RSS
- Background local notifications when a new chapter appears
- Threadmarks/story quick-open fallback from the RSS panel

### History And Sync

- Reading history for:
  - books added
  - status changes
  - chapter progress changes
- Neon PostgreSQL sync
- Remote schema creation and migration from the app
- Shared cloud-backed library state across devices using the same connection string

### Mobile UX

- Dark theme
- Light theme
- Adjustable card sizes
- Shelf-based mobile navigation
- Stats view
- Refresh control to force sync / RSS refresh
- Android packaging through Capacitor

### Data Quality / Convenience

- Duplicate detection when adding books
- Saved RSS metadata even when live feed loading fails
- Search across title, author, tags, notes, genre, source URL, and shelves

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
