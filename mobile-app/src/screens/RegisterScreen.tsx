import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { register } from "../api/authApi";
import type { RegisterRequest } from "../api/authApi";
import type { AuthStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();

  const [formData, setFormData] = useState<RegisterRequest>({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const handleChange = (field: keyof RegisterRequest, value: string) => {
    setFormData({ ...formData, [field]: value });
    setFieldErrors({ ...fieldErrors, [field]: "" });
  };

  const handleSubmit = async () => {
    setError("");
    setFieldErrors({});

    try {
      await register(formData);

      navigation.navigate("Login", {
        successMessage: "Register successfully. Please login.",
      });
    } catch (err: any) {
      if (err?.response?.data) {
        if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setFieldErrors(err.response.data);
        }
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Register</Text>

          {error !== "" && <Text style={styles.errorBox}>{error}</Text>}

          {/* Username */}
          <View style={styles.inputBox}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(t) => handleChange("username", t)}
              autoCapitalize="none"
            />
            {fieldErrors.username && (
              <Text style={styles.fieldError}>{fieldErrors.username}</Text>
            )}
          </View>

          {/* First Name */}
          <View style={styles.inputBox}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(t) => handleChange("firstName", t)}
            />
            {fieldErrors.firstName && (
              <Text style={styles.fieldError}>{fieldErrors.firstName}</Text>
            )}
          </View>

          {/* Last Name */}
          <View style={styles.inputBox}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(t) => handleChange("lastName", t)}
            />
            {fieldErrors.lastName && (
              <Text style={styles.fieldError}>{fieldErrors.lastName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputBox}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(t) => handleChange("email", t)}
              autoCapitalize="none"
            />
            {fieldErrors.email && (
              <Text style={styles.fieldError}>{fieldErrors.email}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputBox}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1, paddingRight: 40 }]}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(t) => handleChange("password", t)}
                autoCapitalize="none"
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff size={22} color="#555" />
                ) : (
                  <Eye size={22} color="#555" />
                )}
              </TouchableOpacity>
            </View>

            {fieldErrors.password && (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleSubmit} style={styles.button}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 10, elevation: 3 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 20 },

  inputBox: { marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 5 },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    borderColor: "#ccc",
  },

  passwordContainer: { position: "relative" },

  eyeIcon: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -11 }],
  },

  button: {
    backgroundColor: "green",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },

  footerText: { marginTop: 15, textAlign: "center", color: "#1d4ed8" },

  errorBox: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    textAlign: "center",
  },

  fieldError: { color: "#dc2626", marginTop: 4, fontSize: 12 },
});
