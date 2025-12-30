import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from "react-native";

function ImageMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    if (!url) return;
    let mounted = true;
    Image.getSize(
      url,
      (w, h) => {
        if (!mounted) return;
        // cap to a more reasonable width so images don't dominate the chat
        const maxW = Math.min(screenWidth * 0.6, w, 320);
        const ratio = h / w;
        setSize({ width: maxW, height: Math.round(maxW * ratio) });
      },
      () => {
        if (!mounted) return;
        setSize({ width: Math.min(screenWidth * 0.6, 320), height: 200 });
      }
    );
    return () => {
      mounted = false;
    };
  }, [url, screenWidth]);

  return (
    <>
      {url ? (
        <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Image source={{ uri: url }} style={[{ width: size?.width || 200, height: size?.height || 200, borderRadius: 8 }, { resizeMode: "cover" }]} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ color: "#dc2626" }}>Invalid image</Text>
      )}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity style={{ position: "absolute", top: 40, right: 20 }} onPress={() => setModalVisible(false)}>
            <Text style={{ color: "#fff", fontSize: 18 }}>Close</Text>
          </TouchableOpacity>
          <Image source={{ uri: url }} style={{ width: screenWidth, height: screenWidth, resizeMode: "contain" }} />
        </View>
      </Modal>
    </>
  );
}

export default ImageMessage;