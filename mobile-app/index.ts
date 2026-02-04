import { registerRootComponent } from 'expo';
import { AGORA_APP_ID, API_URL } from './src/constants/common';

const APP_ID = AGORA_APP_ID;
const BASE_URL = API_URL;

console.log("App ID:", APP_ID);
console.log("Base URL:", BASE_URL);

import App from './App';
registerRootComponent(App);
