# Spotlight — Flutter app

Student Android app for Spotlight ([Google Play](https://play.google.com/store/apps/details?id=com.spotlight.connect)).

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api   # against a local API
flutter build appbundle --release                                  # Play Store bundle
```

Without `--dart-define` the app talks to the production API. Release signing reads `android/key.properties` and the upload keystore, which are kept out of git.

Code layout: `lib/core` (API client, providers, theme), `lib/models`, `lib/screens`, `lib/widgets`.

See the [root README](../README.md) for the full project overview.
