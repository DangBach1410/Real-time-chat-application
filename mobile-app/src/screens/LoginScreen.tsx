import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList, MainStackParamList } from "../navigation/types";
import { login as callLoginApi } from "../api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "../context/AuthContext";
import { Linking } from "react-native";
import { useRoute } from "@react-navigation/native";

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList & MainStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const route = useRoute();
  const [success, setSuccess] = useState((route.params as any)?.successMessage || "");

  // -------------------------------
  // Username/password login
  const handleLogin = async () => {
    setError("");      // clear error
    setSuccess("");    // clear success message
    try {
      const response = await callLoginApi({ username, password });
      const { accessToken, refreshToken, userId } = response.data;

      await AsyncStorage.setItem("accessToken", accessToken);
      await AsyncStorage.setItem("refreshToken", refreshToken);
      await AsyncStorage.setItem("userId", userId);

      login();
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  // -------------------------------
  // OAuth login using Linking (web-style)
  const googleUrl = "http://10.0.2.2:8762/oauth2/authorize/google?redirect_uri=mychatapp://oauth2redirect";
  const githubUrl = "http://10.0.2.2:8762/oauth2/authorize/github?redirect_uri=mychatapp://oauth2redirect";

  const openOAuthUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn("Cannot open URL:", url);
      }
    } catch (err) {
      console.error("Failed to open URL:", err);
    }
  };

  const handleGoogleLogin = () => openOAuthUrl(googleUrl);
  const handleGithubLogin = () => openOAuthUrl(githubUrl);

  // -------------------------------
  // Listen for redirect back to app
  const getQueryParams = (url: string) => {
    const params: Record<string, string> = {};
    const splitUrl = url.split("?");
    if (splitUrl.length > 1) {
      const queryString = splitUrl[1];
      queryString.split("&").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) params[key] = decodeURIComponent(value);
      });
    }
    return params;
  };

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async (event) => {
      const queryParams = getQueryParams(event.url);
      const { accessToken, refreshToken, userId } = queryParams;

      if (accessToken && refreshToken && userId) {
        await AsyncStorage.setItem("accessToken", accessToken);
        await AsyncStorage.setItem("refreshToken", refreshToken);
        await AsyncStorage.setItem("userId", userId);
        login();
      }
    });

    return () => subscription.remove();
  }, []);

  const iconName = showPassword ? "eye-off" : "eye";

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Login</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter password"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={iconName} size={22} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>or</Text>

        {/* Google button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
          <Image
            source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
            style={{ width: 20, height: 20 }}
          />
          <Text style={styles.googleText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* GitHub button */}
        <TouchableOpacity style={styles.githubBtn} onPress={handleGithubLogin}>
          <Image
            source={{ uri: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" }}
            style={{
              width: 22,
              height: 22,
              borderWidth: 0,
              borderColor: "black",
              borderRadius: 30,
            }}
          />
          <Text style={styles.githubText}>Sign in with GitHub</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.registerText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f3f3", justifyContent: "center", alignItems: "center" },
  box: { width: "90%", backgroundColor: "white", padding: 24, borderRadius: 10, elevation: 3 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  error: { backgroundColor: "#ffe5e5", color: "#cc0000", textAlign: "center", padding: 8, borderRadius: 6, marginBottom: 10 },
  label: { marginBottom: 4, color: "#333" },
  inputGroup: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 },
  loginButton: { backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 6, marginTop: 10 },
  loginButtonText: { color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 },
  orText: { textAlign: "center", color: "#666", marginVertical: 12 },
  googleBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", paddingVertical: 10, borderRadius: 6, justifyContent: "center", marginBottom: 10 },
  googleText: { color: "#333", marginLeft: 8 },
  githubBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "black", paddingVertical: 10, borderRadius: 6, justifyContent: "center", marginBottom: 10 },
  githubText: { color: "white", marginLeft: 8 },
  registerText: { textAlign: "center", marginTop: 14, color: "#2563eb" },
  passwordWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", paddingHorizontal: 10, borderRadius: 6 },
  passwordInput: { flex: 1, paddingVertical: 10 },
  success: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    padding: 10,
    borderRadius: 6,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "500",
  },
});
