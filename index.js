/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerPushBackground } from './src/notifications/push';

registerPushBackground();

AppRegistry.registerComponent(appName, () => App);
