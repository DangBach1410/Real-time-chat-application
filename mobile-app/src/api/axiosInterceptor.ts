import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://10.0.2.2:8762/api/v1",
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

// Refresh token when 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) throw error;

      try {
        const res = await axios.post(
          "http://10.0.2.2:8762/api/v1/auth/refresh-token",
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
