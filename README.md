# Box Cricket Score

A React Native scorecard for live box cricket matches. Quick Mode works offline; Stats Mode adds Google sign-in, player statistics, and community features backed by a separate PHP API.

## Development

Requirements: Node.js 22.11+, Android Studio for Android, and Xcode plus CocoaPods for iOS.

```sh
yarn install
yarn start
yarn android # or yarn ios
```

For iOS, run `bundle install` and `bundle exec pod install` after installing JavaScript packages or changing native dependencies.

## Checks and release builds

```sh
yarn lint
yarn test
yarn android-AAB
```

## Stats Mode setup

Set the API host in `src/config/api.ts` and the Web client ID in `src/config/googleAuth.ts`. The API accepts that same client ID at `POST /api/v1/auth/google` and checks the Google ID token itself. iOS also needs the reversed client ID as a URL scheme.

The PHP 8.2+/MariaDB API lives in a separate backend repository and is deployed locally to `C:\wamp64\www\bcs`. Follow that repository's setup guide and API documentation.
