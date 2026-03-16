import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { navigationRef } from "../navigation/AppNavigator";
import { globalLogout } from "../context/AuthContext";

const api = axios.create({
  // baseURL: process.env.API_URL + ":8762/api/v1",
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}:8762/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach accessToken
api.interceptors.request.use(async (config) => {
  const accessToken = await AsyncStorage.getItem("accessToken");

  const isAuth =
    config.url?.includes("/login") || config.url?.includes("/register");

  if (accessToken && !isAuth) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Response interceptor: refresh token on 401, handle banned on 403
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Handle banned user
    if (error.response?.status === 403) {
      Alert.alert('Your account has been banned. Please contact support.');
      if (globalLogout) await globalLogout();
      if (navigationRef.isReady()) {
        navigationRef.navigate('Login' as never);
      }
      return Promise.reject(error);
    }

    // Refresh token on 401
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) throw error;

      try {
        const res = await axios.post(
          `${process.env.EXPO_PUBLIC_API_URL}:8762/api/v1/auth/refresh-token`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const { accessToken: newAT, refreshToken: newRT } = res.data;

        await AsyncStorage.setItem("accessToken", newAT);
        await AsyncStorage.setItem("refreshToken", newRT);

        original.headers.Authorization = `Bearer ${newAT}`;

        return api(original);
      } catch (err) {
        await AsyncStorage.clear();
        throw err;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
