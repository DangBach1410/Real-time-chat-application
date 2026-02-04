import { useState, useEffect } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { saveNotificationToken } from "../api/notificationApi";
import { useNavigation } from "@react-navigation/native";
import { CallRequest } from "../api/callApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";

export const usePushNotifications = (
  userId: string,
  user: any | null,
  startOrJoinCall: (payload: CallRequest) => Promise<any>,
  setIncomingCall: (data: any) => void
) => {
  const navigation = useNavigation<any>();
  useEffect(() => {
    if (!userId || !user) return;

    async function registerAndSaveToken() {
      const expoPushToken = await registerForPushNotificationsAsync();
      if (expoPushToken) {
        try {
          await saveNotificationToken({ userId, expoPushToken });
          console.log("Push token saved to backend: ", expoPushToken);
        } catch (error) {
          console.error("Failed to save push token to backend", error);
        }
      }
    }

    registerAndSaveToken();

    // Lắng nghe khi có thông báo đến (khi app đang mở)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data.conversationId && data.type) {
           // Thay vì điều hướng thẳng, ta bật Modal lên
           setIncomingCall(data);
        }
      }
    );
    // Lắng nghe khi người dùng tương tác với thông báo (nhấn vào thông báo)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data;
          console.log("Notification Response Received:", data);

          // Kiểm tra nếu đây là payload cuộc gọi từ Backend
          if (data.conversationId && data.type) {
            try {
              console.log("☎️ Processing call from notification...");

              // 1. Dựng payload giống hệt hàm handleNavigateToCall của bạn
              const payload: CallRequest = {
                type: data.type as "audio" | "video",
                conversationId: data.conversationId as string,
                callerId: userId, // ID của chính mình khi tham gia
                callerName: user.fullName,
                callerImage: user.imageUrl || normalizeImageUrl(DEFAULT_AVATAR) || DEFAULT_AVATAR,
              };

              // 2. Gọi API để lấy Agora UID và tham gia cuộc gọi
              const callResponse = await startOrJoinCall(payload);

              console.log("☎️ Joined call via notification:", callResponse);
              // 3. Điều hướng vào màn hình CallScreen với các thông số cần thiết
              navigation.navigate("CallScreen", {
                channel: data.conversationId, // Channel chính là conversationId
                agoraUid: callResponse.agoraUid, // UID lấy từ kết quả API
                type: data.type, // 'audio' hoặc 'video'
                userName: user.fullName,
              });
            } catch (error) {
              console.error("❌ Failed to join call from notification:", error);
            }
          }
        },
      );
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [userId, user]);
};

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;0

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("incoming_calls_notifications", {
      name: "Incoming Calls Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'call_ringtone.wav',
      vibrationPattern: [0, 500, 500, 500],
      enableVibrate: true,
      lightColor: "#FF231F7C",
      showBadge: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;
    return pushTokenString;
  } catch (e) {
    console.error(e);
    return null;
  }
}
