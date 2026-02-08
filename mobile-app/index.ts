import { registerRootComponent } from 'expo';

console.log("App ID:", process.env.EXPO_PUBLIC_AGORA_APP_ID);
console.log("Base URL:", process.env.EXPO_PUBLIC_API_URL);

import App from './App';
registerRootComponent(App);
