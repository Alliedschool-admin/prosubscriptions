# Plan: Build & publish the fully native Android app in the admin panel

## Current state
- The previous WebView-based Android app (v1.3) is already published in `public/downloads/` and linked from Admin → Mobile App.
- A new fully native Android app was created under `android-native/` (Kotlin + Jetpack Compose), but it has **not been compiled** yet. There is no APK output, and the admin panel still links to the old v1.3 package.

## Goal
Build the native Android app, produce an APK, and update the admin panel so the owner can download the new native app directly from Admin → Mobile App.

## Steps

1. **Compile the native project**
   - Run the Gradle build inside `android-native/` to compile the Kotlin source and produce the APK.
   - Fix any compile errors that surface (missing imports, syntax issues, dependency resolution, etc.).

2. **Package the project for Android Studio**
   - Create a clean ZIP of the `android-native/` folder (excluding `build/` and `.gradle/` caches) so the owner can open it in Android Studio later.

3. **Publish assets to the web app**
   - Copy the generated APK and the project ZIP to `public/downloads/` with versioned names.

4. **Update Admin → Mobile App panel**
   - Modify `MobileAppPanel.tsx` to:
     - Show the new native app as the primary download.
     - Keep the old WebView v1.3 as a fallback/legacy option, or clearly replace it with the new version.
     - Update version labels, package ID, and description to reflect the native app.

5. **Verify the admin panel renders correctly**
   - Open the admin panel in the preview and confirm the Mobile App tab displays the new download buttons and information.

## Out of scope
- No changes to the web app store logic, checkout, auth, or admin business logic.
- No changes to the native app source code beyond build fixes.
- No Google Play signing or release build configuration (debug APK only).

## Expected result
Admin → Mobile App will show a downloadable **Digital Chacho Native v2.0** APK and a matching Android Studio project ZIP, replacing or supplementing the existing v1.3 WebView package.
