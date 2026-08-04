# Digital Chacho — Android app package

This is a ready-to-build Android Studio project that wraps the live Digital Chacho
store (https://www.digitalchacho.store) in a native shell: app icon, splash colors,
pull-to-refresh, hardware back navigation, and external links (WhatsApp, payments)
opened in their own apps.

## Build the APK

1. Install Android Studio (https://developer.android.com/studio).
2. `File > Open` and select this folder.
3. Let Gradle sync finish (it downloads the SDK bits it needs).
4. `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
5. The APK lands in `app/build/outputs/apk/debug/app-debug.apk` — copy it to a phone and install.

Command line alternative (needs JDK 17 + Android SDK):

```
./gradlew assembleDebug     # debug APK
./gradlew assembleRelease   # release APK (sign it first)
./gradlew bundleRelease     # .aab for Google Play
```

## Publishing to Google Play

1. Create a keystore: `keytool -genkey -v -keystore dc.keystore -alias dc -keyalg RSA -keysize 2048 -validity 10000`
2. Replace `signingConfig signingConfigs.debug` in `app/build.gradle` with your own signing config.
3. Upload the `.aab` from `app/build/outputs/bundle/release/`.

## Change the URL or name

- URL and app name: `app/src/main/res/values/strings.xml`
- Package id: `applicationId` / `namespace` in `app/build.gradle`
- Icon: replace `app/src/main/res/mipmap-*/ic_launcher.png`
