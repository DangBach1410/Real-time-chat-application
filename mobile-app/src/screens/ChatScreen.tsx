// ChatScreen.tsx
import React, { useRef } from "react";
import { View, ScrollView } from "react-native";
import MainBottomTab from "../components/MainBottomTab";

export default function ChatScreen() {
  const scrollRef = useRef<ScrollView | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <MainBottomTab scrollRef={scrollRef} />
    </View>
  );
}
