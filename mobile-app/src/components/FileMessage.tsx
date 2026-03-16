import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { normalizeImageUrl } from "../utils/image";
import { StyleSheet } from "react-native";
import { File, Directory, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { Alert } from "react-native";

const styles = StyleSheet.create({
  fileRow: { position: "relative", paddingLeft: 20 },
  fileIcon: {
    position: "absolute",
    left: 0,
    top: 2,
  },
  fileText: {
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: "underline",
  },
});

async function handleFilePress(url: string, fileName: string) {
  try {
    const safeUrl = encodeURI(url);
    // 1️⃣ Thư mục chat-files
    const dir = new Directory(Paths.document, "chat-files");
    if (!dir.exists) {
      await dir.create();
    }

    // 2️⃣ File local
    const file = new File(dir, fileName);

    // 3️⃣ Chưa tồn tại → tải
    if (!file.exists) {
      Alert.alert("Loading", "File is being downloaded...");
      const downloaded = await File.downloadFileAsync(safeUrl, file);

      Alert.alert("Complete", "File downloaded", [
        {
          text: "Open file",
          onPress: () => openFile(downloaded.uri),
        },
      ]);
      return;
    }

    // 4️⃣ Đã tồn tại → hỏi người dùng
    Alert.alert(fileName, "File already downloaded", [
      {
        text: "Open file",
        onPress: () => openFile(file.uri),
      },
      {
        text: "Redownload",
        onPress: async () => {
          const downloaded = await File.downloadFileAsync(url, file, {
            idempotent: false,
          });
          openFile(downloaded.uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  } catch (err) {
    console.error("File error:", err);
    Alert.alert("Error", "Unable to process file");
  }
}

async function openFile(uri: string) {
  if (Platform.OS === "android") {
    const contentUri = await FileSystemLegacy.getContentUriAsync(uri);

    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: 1,
    });
  } else {
    await Sharing.shareAsync(uri);
  }
}

function FileMessage({
  url,
  name,
  isOwn,
}: {
  url?: string;
  name?: string;
  isOwn?: boolean;
}) {
  return (
    <View
      style={{
        alignSelf: isOwn ? "flex-end" : "flex-start",
        marginVertical: 6,
        minWidth: 140,
      }}
    >
      <TouchableOpacity
        style={styles.fileRow}
        onPress={() => handleFilePress(normalizeImageUrl(url)!, name!)}
      >
        <MaterialIcons
          style={styles.fileIcon}
          name="description"
          size={15}
          color="#fff"
        />
        <Text
          style={[styles.fileText, { color: isOwn ? "#ffffff" : "#000000" }]}
        >
          {name || "Download file"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default FileMessage;
