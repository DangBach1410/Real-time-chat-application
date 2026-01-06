// screens/ConversationSearchScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { searchMessages, type MessageResponse } from "../api/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";

type RouteParams = {
  ConversationSearch: {
    conversation: any;
    onSelectMessage?: (message: any, query: string) => void;
  };
};

export default function ConversationSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, "ConversationSearch">>();
  const { conversation, onSelectMessage } = route.params;
  const conversationId = conversation.id;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = async (startPage = 0) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await searchMessages(conversationId, query.trim(), startPage, 20);
      if (startPage === 0) setResults(res);
      else setResults((prev) => [...prev, ...res]);

      setHasMore(res.length === 20);
      setPage(startPage + 1);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    doSearch(page);
  };

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderPreview(m: MessageResponse) {
    try {
      if (m.type === "text" || m.type === "text-translation") return m.content;
      if (m.type === "link") {
        const meta = JSON.parse(m.content);
        return meta.title || meta.url || m.content;
      }
      if (m.type === "media") {
        const meta = JSON.parse(m.content);
        return meta.originalName || meta.url || m.content;
      }
      return m.content;
    } catch {
      return m.content;
    }
  }

  function renderHighlightedText(preview: string, q: string) {
    if (!q) return <Text>{preview}</Text>;

    const parts = preview.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
    return (
      <Text>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <Text key={i} style={styles.highlight}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Enter keyword and press search"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => doSearch(0)}
        />
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              if (onSelectMessage) {
                onSelectMessage(item, query);
              }
            }}
          >
            <Image
              source={{ uri: normalizeImageUrl(item.sender.imageUrl || DEFAULT_AVATAR) }}
              style={styles.avatar}
            />

            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.sender}>{item.sender.fullName}</Text>
                <Text style={styles.time}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Text>
              </View>

              <Text numberOfLines={2} style={styles.preview}>
                {renderHighlightedText(renderPreview(item), query)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No results. Type keyword and search.</Text>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  item: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  sender: { fontSize: 13, fontWeight: "600", flex: 1 },

  time: { fontSize: 11, color: "#9ca3af" },

  preview: { fontSize: 13, color: "#374151", marginTop: 4 },

  highlight: {
    backgroundColor: "#fde68a",
    fontWeight: "600",
  },

  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
});
