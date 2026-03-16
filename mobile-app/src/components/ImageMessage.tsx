import React, { useEffect, useState, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from "react-native";
// Nhập MaterialIcons
// Nếu bạn dùng Expo, dùng dòng này:
import { MaterialIcons } from '@expo/vector-icons';
// Nếu bạn dùng React Native không có Expo, dùng dòng này:
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

function ImageMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setHasError] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    if (!url) return;
    
    let mounted = true;
    setHasError(false);

    Image.getSize(
      url,
      (w, h) => {
        if (!mounted) return;
        const maxW = Math.min(screenWidth * 0.6, w, 320);
        const ratio = h / w;
        setSize({ width: maxW, height: Math.round(maxW * ratio) });
      },
      () => {
        if (!mounted) return;
        setHasError(true);
      }
    );
    return () => {
      mounted = false;
    };
  }, [url, screenWidth]);

  // Cập nhật thông báo lỗi URL không hợp lệ
  if (!url) {
    return (
      <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
        <Text style={{ color: "#dc2626" }}>Invalid image URL</Text>
      </View>
    );
  }

  // Cập nhật thông báo lỗi tiếng Anh và dùng MaterialIcons
  if (hasError) {
    return (
      <View 
        style={{ 
          alignSelf: isOwn ? "flex-end" : "flex-start", 
          marginVertical: 6,
          padding: 12,
          backgroundColor: isOwn ? "#f87171" : "#f3f4f6", 
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          maxWidth: screenWidth * 0.75,
        }}
      >
        <View style={{ marginRight: 6 }}>
          <MaterialIcons name="broken-image" size={20} color={isOwn ? "#fff" : "#dc2626"} />
        </View>
        <Text 
          style={{ 
            color: isOwn ? "#fff" : "#6b7280", 
            fontStyle: "italic",
            flexShrink: 1
          }}
        >
          Format not supported
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Image 
            source={{ uri: url }} 
            style={[
              { width: size?.width || 200, height: size?.height || 200, borderRadius: 8 }, 
              { resizeMode: "cover" }
            ]} 
            onError={() => setHasError(true)}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity 
            style={{ 
                position: "absolute", 
                top: 50, // Điều chỉnh lại một chút cho đẹp
                right: 25, // Điều chỉnh lại một chút cho đẹp
                zIndex: 1, 
                padding: 10,
                // Làm cho nút X nổi bật hơn một chút
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
            }} 
            onPress={() => setModalVisible(false)}
          >
            {/* Thay chữ Close thành dấu X bằng MaterialIcons */}
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image 
            source={{ uri: url }} 
            style={{ width: screenWidth, height: screenWidth, resizeMode: "contain" }} 
          />
        </View>
      </Modal>
    </>
  );
}

export default memo(ImageMessage);