import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ConversationResponse,
  fetchConversationMembers,
  MemberResponse,
  MessageResponse,
  removeConversationMember,
  fetchConversationMedia,
  fetchConversationFiles,
  fetchConversationLinks,
  updateConversationImage,
  updateConversationName,
} from "../api/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";
import { useChatContext } from "../context/ChatContext";
import { useWindowDimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RouteParams = {
  ConversationDetails: {
    conversation: ConversationResponse;
  };
};

function SectionHeader({
  title,
  open,
  onPress,
}: {
  title: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <MaterialIcons
        name={open ? "keyboard-arrow-up" : "keyboard-arrow-down"}
        size={20}
      />
    </TouchableOpacity>
  );
}

function MediaItem({ item }: { item: MessageResponse }) {
  const meta = JSON.parse(item.content);
  const { width } = useWindowDimensions();
  const size = width / 3;

  if (meta.mediaType === "image") {
    return (
      <Image
        source={{ uri: normalizeImageUrl(meta.url) }}
        style={{ width: size, height: size }}
      />
    );
  }

  if (meta.mediaType === "video") {
    const player = useVideoPlayer(normalizeImageUrl(meta.url)!, (p) => {
      p.loop = false;
    });

    return (
      <View style={{ width: size, height: size, backgroundColor: "#000" }}>
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          contentFit="cover"
          allowsPictureInPicture
        />
      </View>
    );
  }

  return null;
}

export default function ConversationDetailsScreen() {
  const [sectionsOpen, setSectionsOpen] = useState({
    members: true,
    media: false,
    files: false,
    links: false,
  });

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [media, setMedia] = useState<MessageResponse[]>([]);
  const [files, setFiles] = useState<MessageResponse[]>([]);
  const [links, setLinks] = useState<MessageResponse[]>([]);

  const mediaPage = useRef(0);
  const filesPage = useRef(0);
  const linksPage = useRef(0);

  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [filesHasMore, setFilesHasMore] = useState(true);
  const [linksHasMore, setLinksHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, "ConversationDetails">>();

  const { conversation } = route.params;
  // local mutable copy so we can update name/image locally
  const [conversationState, setConversation] =
    useState<ConversationResponse>(conversation);

  const { user, currentUserId, usersPresence } = useChatContext();
  const isPrivate = conversation.type === "private";

  const otherUser = isPrivate
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  // prefer members list (fetched) for admin check, fallback to original conversation prop
  const isAdmin =
    (members.find((u) => u.userId === currentUserId)?.role === "admin") ||
    (conversation.members?.find((u) => u.userId === currentUserId)?.role ===
      "admin");

  useFocusEffect(
    useCallback(() => {
      fetchConversationMembers(conversation.id)
        .then(setMembers)
        .catch(console.error);
    }, [conversation.id]),
  );

  // Editing group name states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(conversationState.name || "");

  // sync local newName when conversationState.name changes (e.g., after update)
  useEffect(() => {
    setNewName(conversationState.name || "");
  }, [conversationState.name]);

  // rest of your code (toggleSection, loadMore handlers, update image, remove member, leave group) largely unchanged
  const toggleSection = async (
    type: "members" | "media" | "files" | "links",
  ) => {
    setSectionsOpen((prev) => ({ ...prev, [type]: !prev[type] }));

    if (type === "media" && media.length === 0 && mediaHasMore) {
      const res = await fetchConversationMedia(conversation.id, 0, PAGE_SIZE);
      setMedia(res);
      mediaPage.current = 1;
      setMediaHasMore(res.length === PAGE_SIZE);
    }

    if (type === "files" && files.length === 0 && filesHasMore) {
      const res = await fetchConversationFiles(conversation.id, 0, PAGE_SIZE);
      setFiles(res);
      filesPage.current = 1;
      setFilesHasMore(res.length === PAGE_SIZE);
    }

    if (type === "links" && links.length === 0 && linksHasMore) {
      const res = await fetchConversationLinks(conversation.id, 0, PAGE_SIZE);
      setLinks(res);
      linksPage.current = 1;
      setLinksHasMore(res.length === PAGE_SIZE);
    }
  };

  const loadMoreMedia = async () => {
    if (!mediaHasMore) return;
    const res = await fetchConversationMedia(
      conversation.id,
      mediaPage.current,
      PAGE_SIZE,
    );
    setMedia((prev) => [...prev, ...res]);
    mediaPage.current += 1;
    setMediaHasMore(res.length === PAGE_SIZE);
  };

  const loadMoreFiles = async () => {
    if (!filesHasMore) return;
    const res = await fetchConversationFiles(
      conversation.id,
      filesPage.current,
      PAGE_SIZE,
    );
    setFiles((prev) => [...prev, ...res]);
    filesPage.current += 1;
    setFilesHasMore(res.length === PAGE_SIZE);
  };

  const loadMoreLinks = async () => {
    if (!linksHasMore) return;
    const res = await fetchConversationLinks(
      conversation.id,
      linksPage.current,
      PAGE_SIZE,
    );
    setLinks((prev) => [...prev, ...res]);
    linksPage.current += 1;
    setLinksHasMore(res.length === PAGE_SIZE);
  };

  const openLink = async (url?: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Invalid link", url);
      return;
    }
    await Linking.openURL(url);
  };

  const handleUpdateGroupImage = async () => {
    if (conversation.type !== "group") return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission denied", "Allow access to your images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    try {
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? "group-avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as any;

      const updated = await updateConversationImage(
        conversation.id,
        currentUserId,
        user?.fullName ?? "Unknown",
        file,
      );
      setConversation(updated);
    } catch (err) {
      console.error("Update group image failed", err);
      Alert.alert("Error", "Failed to update group image");
    }
  };

  const handleRemoveMember = (userId: string) => {
    Alert.alert("Remove member", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeConversationMember(conversation.id, userId);
            setMembers((prev) => prev.filter((m) => m.userId !== userId));
          } catch {
            Alert.alert("Error", "Failed to remove member");
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    if (conversation.type !== "group") return;
    Alert.alert("Leave group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await removeConversationMember(conversation.id, currentUserId);
            navigation.navigate("Chat");
          } catch (err) {
            Alert.alert("Error", "Failed to leave group");
          }
        },
      },
    ]);
  };

  // Save group name
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("Invalid name", "Group name cannot be empty.");
      return;
    }

    if (trimmed === conversationState.name) {
      setIsEditingName(false);
      setNewName(conversationState.name || "");
      return;
    }

    try {
      const updated = await updateConversationName(
        conversation.id,
        currentUserId,
        user?.fullName ?? "Unknown",
        trimmed,
      );
      setConversation(updated);
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update conversation name", err);
      Alert.alert("Error", "Failed to update group name");
    }
  };

  // UI
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#000000",
      }}
    >
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={{ position: "relative" }}>
              {/* avatar rendering logic same as before */}
              {isPrivate ? (
                <Image
                  source={{
                    uri: normalizeImageUrl(
                      otherUser?.imageUrl || DEFAULT_AVATAR,
                    ),
                  }}
                  style={styles.avatarLarge}
                />
              ) : conversationState.imageUrl ? (
                <Image
                  source={{ uri: normalizeImageUrl(conversationState.imageUrl) }}
                  style={styles.avatarLarge}
                />
              ) : (
                <View style={styles.groupAvatarLarge}>
                  {conversation.members.slice(-2).map((m, idx) => (
                    <Image
                      key={m.userId}
                      source={{
                        uri: normalizeImageUrl(m.imageUrl || DEFAULT_AVATAR),
                      }}
                      style={[
                        styles.groupAvatarItemLarge,
                        idx === 0 ? styles.avatarTop : styles.avatarBottom,
                      ]}
                    />
                  ))}
                </View>
              )}

              {!isPrivate && (
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handleUpdateGroupImage}
                >
                  <MaterialIcons name="photo-camera" size={18} color="#111" />
                </TouchableOpacity>
              )}
            </View>

            {/* Name / editing */}
            {!isPrivate && isEditingName ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  onSubmitEditing={handleSaveName}
                  style={styles.nameInput}
                  placeholder="Group name"
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveName} style={{ marginLeft: 8 }}>
                  <MaterialIcons name="check" size={22} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewName(conversationState.name || "");
                    setIsEditingName(false);
                  }}
                  style={{ marginLeft: 8 }}
                >
                  <MaterialIcons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.name}>{isPrivate ? otherUser?.fullName : (conversationState.name || "Unnamed group")}</Text>
                {!isPrivate && isAdmin && (
                  <TouchableOpacity
                    style={{ marginLeft: 8, marginTop: 12 }}
                    onPress={() => setIsEditingName(true)}
                  >
                    <MaterialIcons name="edit" size={18} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isPrivate && (
              <Text style={styles.sub}>{members.length} members</Text>
            )}
          </View>

          <View style={styles.actionRow}>
            {!isPrivate && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("AddMember", {
                    conversationId: conversation.id,
                    existingMemberIds: members.map((m) => m.userId),
                  })
                }
              >
                <MaterialIcons name="person-add" size={18} />
                <Text style={styles.actionText}>Add member</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate("ConversationSearch", {
                  conversation,
                  onSelectMessage: (message: any, query: string) => {
                    navigation.navigate("ConversationChat", {
                      conversation,
                      usersPresence,
                      jumpMessage: message,
                      jumpQuery: query,
                    });
                  },
                })
              }
            >
              <MaterialIcons name="search" size={18} />
              <Text style={styles.actionText}>Search</Text>
            </TouchableOpacity>
          </View>

          <SectionHeader
            title={`Members (${members.length})`}
            open={sectionsOpen.members}
            onPress={() => toggleSection("members")}
          />

          {sectionsOpen.members && (
            <View>
              {members.map((m) => (
                <View key={m.userId} style={styles.memberRow}>
                  <Image
                    source={{
                      uri: normalizeImageUrl(m.imageUrl || DEFAULT_AVATAR),
                    }}
                    style={styles.memberAvatar}
                  />
                  <Text style={styles.memberName}>{m.fullName}</Text>
                  {isAdmin && m.userId !== currentUserId && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m.userId)}
                      style={styles.removeBtn}
                      hitSlop={8}
                    >
                      <MaterialIcons name="close" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <SectionHeader
            title="Media"
            open={sectionsOpen.media}
            onPress={() => toggleSection("media")}
          />
          {sectionsOpen.media && (
            <FlatList
              data={media}
              numColumns={3}
              keyExtractor={(i) => i.id}
              onEndReached={loadMoreMedia}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => <MediaItem item={item} />}
            />
          )}

          <SectionHeader
            title="Files"
            open={sectionsOpen.files}
            onPress={() => toggleSection("files")}
          />
          {sectionsOpen.files && (
            <FlatList
              data={files}
              keyExtractor={(i) => i.id}
              onEndReached={loadMoreFiles}
              renderItem={({ item }) => {
                const meta = JSON.parse(item.content);
                return (
                  <TouchableOpacity style={styles.fileRow}>
                    <MaterialIcons name="insert-drive-file" size={22} />
                    <Text numberOfLines={1} style={{ marginLeft: 8 }}>
                      {meta.originalName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <SectionHeader
            title="Links"
            open={sectionsOpen.links}
            onPress={() => toggleSection("links")}
          />
          {sectionsOpen.links && (
            <FlatList
              data={links}
              keyExtractor={(i) => i.id}
              onEndReached={loadMoreLinks}
              renderItem={({ item }) => {
                const meta = JSON.parse(item.content);
                return (
                  <TouchableOpacity
                    style={styles.linkRow}
                    activeOpacity={0.7}
                    onPress={() => openLink(meta.url)}
                  >
                    {meta.image && (
                      <Image
                        source={{ uri: normalizeImageUrl(meta.image) }}
                        style={styles.linkThumb}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.linkTitle}>
                        {meta.title || meta.url}
                      </Text>
                      <Text numberOfLines={1} style={styles.linkUrl}>
                        {meta.url}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {!isPrivate && (
            <TouchableOpacity
              style={styles.leaveBtn}
              activeOpacity={0.7}
              onPress={handleLeaveGroup}
            >
              <MaterialIcons name="logout" size={20} color="#dc2626" />
              <Text style={styles.leaveText}>Leave Group</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  topSection: {
    alignItems: "center",
    paddingVertical: 24,
  },

  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  groupAvatarLarge: {
    width: 96,
    height: 96,
    position: "relative",
  },

  groupAvatarItemLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: "absolute",
  },

  avatarTop: {
    top: 0,
    right: 0,
  },

  avatarBottom: {
    bottom: 0,
    left: 0,
    zIndex: 10,
  },

  name: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
  },

  nameInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 180,
  },

  sub: {
    fontSize: 13,
    color: "#6b7280",
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
  },

  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },

  memberName: {
    flex: 1,
    fontSize: 14,
  },

  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
    backgroundColor: "#fff",
  },

  leaveText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 15,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  cameraBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    elevation: 3,
  },

  mediaItem: {
    width: "33.33%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#fff",
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },

  linkThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },

  linkTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  linkUrl: {
    fontSize: 12,
    color: "#6b7280",
  },
  removeBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 0,
    marginBottom: 16,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },

  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
