import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { changePassword, type UserResponse } from "../api/authApi";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useChatContext } from "../context/ChatContext";

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { currentUserId } = useChatContext();

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: "" }); // clear error khi user nhập lại
  };

  const validateForm = () => {
    let valid = true;
    let newErrors = { oldPassword: "", newPassword: "", confirmPassword: "" };

    if (!form.oldPassword) {
      newErrors.oldPassword = "Old password is required";
      valid = false;
    }

    if (!form.newPassword) {
      newErrors.newPassword = "New password is required";
      valid = false;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
      valid = false;
    }

    if (
      form.newPassword &&
      form.confirmPassword &&
      form.newPassword !== form.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const res = await changePassword(currentUserId, form);
      const data: UserResponse = res.data;

      if (data.status === 200) {
        Alert.alert("Success", data.message || "Password changed successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to change password");
      }
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Change Password</Text>
      </View>

      {/* OLD PASSWORD */}
      <Text style={styles.label}>Old Password</Text>
      <View style={[styles.inputWrapper, errors.oldPassword && styles.errorBorder]}>
        <TextInput
          secureTextEntry={!showOld}
          value={form.oldPassword}
          onChangeText={(v) => handleChange("oldPassword", v)}
          placeholder="Old password is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowOld((p) => !p)}>
          {showOld ? <EyeOff size={22} color="#444" /> : <Eye size={22} color="#444" />}
        </TouchableOpacity>
      </View>
      {errors.oldPassword ? <Text style={styles.errorText}>{errors.oldPassword}</Text> : null}

      {/* NEW PASSWORD */}
      <Text style={styles.label}>New Password</Text>
      <View style={[styles.inputWrapper, errors.newPassword && styles.errorBorder]}>
        <TextInput
          secureTextEntry={!showNew}
          value={form.newPassword}
          onChangeText={(v) => handleChange("newPassword", v)}
          placeholder="New password is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowNew((p) => !p)}>
          {showNew ? <EyeOff size={22} color="#444" /> : <Eye size={22} color="#444" />}
        </TouchableOpacity>
      </View>
      {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}

      {/* CONFIRM PASSWORD */}
      <Text style={styles.label}>Confirm New Password</Text>
      <View style={[styles.inputWrapper, errors.confirmPassword && styles.errorBorder]}>
        <TextInput
          secureTextEntry={!showConfirm}
          value={form.confirmPassword}
          onChangeText={(v) => handleChange("confirmPassword", v)}
          placeholder="Confirm password is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowConfirm((p) => !p)}>
          {showConfirm ? <EyeOff size={22} color="#444" /> : <Eye size={22} color="#444" />}
        </TouchableOpacity>
      </View>
      {errors.confirmPassword ? (
        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
      ) : null}

      {/* SUBMIT */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Change Password</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    backgroundColor: "#f5f6f7",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    padding: 6,
    marginRight: 12,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginRight: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 14,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
  },

  /* ❗ Error styles */
  errorBorder: {
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#dc2626",
    marginTop: 4,
    fontSize: 13,
    marginLeft: 4,
  },

  submitBtn: {
    marginTop: 28,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
