import React from "react";
import { View, Text, Modal, Image, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Phone, X } from "lucide-react-native";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image"

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  callerImage?: string;
  callType: "audio" | "video";
  conversationName?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  open,
  callerName,
  callerImage,
  callType,
  conversationName,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <Image
            source={{ uri: callerImage || normalizeImageUrl(DEFAULT_AVATAR) }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{callerName}</Text>
          <Text style={styles.subText}>
            Incoming {callType} call {conversationName ? `to ${conversationName}` : ""}...
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onDecline} style={[styles.button, styles.declineBtn]}>
              <X color="white" size={32} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onAccept} style={[styles.button, styles.acceptBtn]}>
              <Phone color="white" size={32} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  container: { alignItems: "center", width: "100%" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, borderWidth: 2, borderColor: "white" },
  name: { fontSize: 24, fontWeight: "bold", color: "white" },
  subText: { color: "#ccc", marginTop: 10, fontSize: 16 },
  buttonContainer: { flexDirection: "row", marginTop: 50, gap: 50 },
  button: { width: 70, height: 70, borderRadius: 35, justifyContent: "center", alignItems: "center" },
  acceptBtn: { backgroundColor: "#22C55E" },
  declineBtn: { backgroundColor: "#EF4444" },
});