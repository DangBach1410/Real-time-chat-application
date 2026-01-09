import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { normalizeImageUrl } from "../utils/image";
// Audio inline player (basic)
function AudioMessage({
  url,
  isOwn,
}: {
  url?: string;
  isOwn?: boolean;
}) {
  if (!url) {
    return (
      <Text style={{ color: "#dc2626", fontSize: 12 }}>
        Invalid audio
      </Text>
    );
  }

  const player = useAudioPlayer({ uri: normalizeImageUrl(url) });
  const status = useAudioPlayerStatus(player);

  const isAtEnd =
    status.duration > 0 &&
    status.currentTime >= status.duration;

  const onPress = () => {
    if (isAtEnd) {
      player.seekTo(0);
    }

    status.playing
      ? player.pause()
      : player.play();
  };

  return (
    <View
      style={{
        alignSelf: isOwn ? "flex-end" : "flex-start",
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: isOwn ? "#3b82f6" : "#e5e7eb",
          gap: 8,
        }}
      >
        <MaterialIcons
          name={status.playing ? "pause" : "play-arrow"}
          size={20}
          color={isOwn ? "#fff" : "#000"}
        />

        <Text
          style={{
            fontSize: 12,
            color: isOwn ? "#fff" : "#000",
          }}
        >
          {formatTime(status.currentTime)} /{" "}
          {formatTime(status.duration)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioMessage;