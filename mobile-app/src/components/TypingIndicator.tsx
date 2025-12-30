import React, { useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet } from "react-native";
import { normalizeImageUrl } from "../utils/image";
import { DEFAULT_AVATAR } from "../constants/common";

type TypingIndicatorProps = {
  users: { userId: string; imageUrl?: string }[];
};

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  if (!users.length) return null;

  return (
    <View style={styles.container}>
      {/* Avatar group */}
      <View style={styles.avatarGroup}>
        {users.map((u) => (
          <Image
            key={u.userId}
            source={{ uri: normalizeImageUrl(u.imageUrl) || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
        ))}
      </View>

      {/* Typing dots */}
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  avatarGroup: {
    flexDirection: "row",
    marginRight: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9ca3af",
  },
});
