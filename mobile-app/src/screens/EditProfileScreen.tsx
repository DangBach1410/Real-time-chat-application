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
import { ArrowLeft } from "lucide-react-native";
import languages from "../constants/languages.json";
import { updateUser, type UserResponse } from "../api/authApi";
import { useChatContext } from "../context/ChatContext";
import { Dropdown } from "react-native-element-dropdown";

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, currentUserId, setUser } = useChatContext();

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    language: user.language || "English",
    languageCode: user.languageCode || "en",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    if (name === "language") {
      const selected = languages.find((lang) => lang.name === value);

      setForm({
        ...form,
        language: value,
        languageCode: selected?.code || "en",
      });
    } else {
      setForm({ ...form, [name]: value });
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    let valid = true;
    let newErrors = { firstName: "", lastName: "", email: "" };

    if (!form.firstName.trim()) {
      newErrors.firstName = "First name is required";
      valid = false;
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      valid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log("Submitting form:", form);
      const res = await updateUser(currentUserId, form);
      const data: UserResponse = res.data;
      console.log("Update profile response:", data);

      if (data.status === 200) {
        setUser({ ...user, ...form });
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", data.message || "Update failed");
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

        <Text style={styles.title}>Edit Profile</Text>
      </View>

      {/* FIRST NAME */}
      <Text style={styles.label}>First Name</Text>
      <View style={[styles.inputWrapper, errors.firstName && styles.errorBorder]}>
        <TextInput
          value={form.firstName}
          onChangeText={(v) => handleChange("firstName", v)}
          placeholder="First name is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
      </View>
      {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

      {/* LAST NAME */}
      <Text style={styles.label}>Last Name</Text>
      <View style={[styles.inputWrapper, errors.lastName && styles.errorBorder]}>
        <TextInput
          value={form.lastName}
          onChangeText={(v) => handleChange("lastName", v)}
          placeholder="Last name is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
      </View>
      {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

      {/* EMAIL */}
      <Text style={styles.label}>Email</Text>
      <View style={[styles.inputWrapper, errors.email && styles.errorBorder]}>
        <TextInput
          value={form.email}
          onChangeText={(v) => handleChange("email", v)}
          placeholder="Email is required"
          placeholderTextColor="#999"
          style={styles.input}
        />
      </View>
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

    {/* LANGUAGE */}
    <Text style={styles.label}>Language</Text>

      <Dropdown
        style={styles.dropdown}
        placeholderStyle={styles.placeholder}
        selectedTextStyle={styles.selectedText}
        data={languages.map((l) => ({ label: l.name, value: l.name }))}
        labelField="label"
        valueField="value"
        placeholder="Select language"
        value={form.language}
        onChange={(item) => handleChange("language", item.value)}
        autoScroll={false}
        flatListProps={{
          showsVerticalScrollIndicator: false,
        }}
      />

      {/* SUBMIT */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitText}>Save Changes</Text>
        )}
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
    marginRight: 30, // để title thật sự ở giữa
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
    backgroundColor: "#0c8ce9",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdown: {
  height: 50,
  borderColor: "#ccc",
  borderWidth: 1,
  borderRadius: 10,
  backgroundColor: "white",
  paddingHorizontal: 12,
  marginTop: 6,
  },

  placeholder: {
    color: "#999",
    fontSize: 14,
  },

  selectedText: {
    color: "#333",
    fontSize: 14,
  },
});
