import React from "react";
import {
  View,
  Text,
  useWindowDimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { normalizeImageUrl } from "../utils/image";

function VideoMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const { width: screenWidth } = useWindowDimensions();

  if (!url) {
    return (
      <Text style={{ color: "#dc2626", fontSize: 12 }}>
        Invalid video
      </Text>
    );
  }

  const videoWidth = Math.min(screenWidth * 0.6, 320);
  const videoHeight = Math.round(videoWidth * (9 / 16));

  // ✅ expo-video đúng cách
  const player = useVideoPlayer(normalizeImageUrl(url)!, (player) => {
    player.loop = false;
  });

  return (
    <View
      style={{
        alignSelf: isOwn ? "flex-end" : "flex-start",
        marginVertical: 6,
      }}
    >
      <View
        style={{
          width: videoWidth,
          height: videoHeight,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          contentFit="contain"
          fullscreenOptions={{
            enable: true,
          }}
          allowsPictureInPicture
        />
      </View>
    </View>
  );
}

export default VideoMessage;