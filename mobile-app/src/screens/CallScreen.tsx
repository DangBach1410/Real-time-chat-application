// src/screens/CallScreen.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  FlatList,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Config from "react-native-config";
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
  IRtcEngineEventHandler,
  RtcConnection,
} from "react-native-agora";
import { useRoute, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import { leaveCall, getUserIdFromAgoraUid } from "../api/callApi";
import { useUser } from "../hooks/useUser";
import { useChatContext } from "../context/ChatContext";
import { fetchUserById } from "../api/userApi";
import { AGORA_APP_ID } from '../constants/common';

import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";


type RouteParams = {
  channel: string;
  agoraUid: number; // NEW: Now numeric (from backend)
  type: "audio" | "video";
  userName: string;
};

const PIP_THRESHOLD = 6; // Switch to PIP mode when more than 6 participants

const getPermission = async () => {
  if (Platform.OS === "android") {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);
  }
};

export default function CallScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { channel, agoraUid, type, userName } = route.params as RouteParams;

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(type === "video");
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [remoteUserIdMap, setRemoteUserIdMap] = useState<Record<number, string>>({}); // NEW: agoraUid -> userId mapping
  const [remoteUserAudioStateMap, setRemoteUserAudioStateMap] = useState<Record<number, boolean>>({}); // Track audio state
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [remoteVideoEnabledMap, setRemoteVideoEnabledMap] = useState<Record<number, boolean>>({});
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(type === "video");

  const agoraEngineRef = useRef<IRtcEngine | null>(null);
  const eventHandler = useRef<IRtcEngineEventHandler | null>(null);
  const hasLeftRef = useRef(false);

  const totalParticipants = remoteUids.length + 1; // Include local user
  const isLocalPIP = totalParticipants > PIP_THRESHOLD;
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  const {currentUserId} = useChatContext();

  // Fetch current user info
  useEffect(() => {
    const userId = currentUserId || localStorage?.getItem?.("userId");
    if (!userId) return;
    fetchUserById(userId)
      .then(data => setCurrentUser(data))
      .catch(() => console.warn("Cannot fetch current user info"));
  }, [currentUserId]);

  useEffect(() => {
    const init = async () => {
      try {
        await setupVideoSDKEngine();
        setupEventHandler();
        await join();
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize call");
      }
    };

    init();

    return () => {
      cleanupAgoraEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: Map remote agoraUids to userIds
  useEffect(() => {
    const mapRemoteUidsToUserIds = async () => {
      if (remoteUids.length === 0) {
        setRemoteUserIdMap({});
        return;
      }

      const newMapping: Record<number, string> = {};
      for (const agoraUid of remoteUids) {
        try {
          const userId = await getUserIdFromAgoraUid(channel, agoraUid);
          newMapping[agoraUid] = userId;
        } catch (err) {
          console.error(`Failed to map agoraUid ${agoraUid} to userId:`, err);
          newMapping[agoraUid] = `User ${agoraUid}`;
        }
      }
      setRemoteUserIdMap(newMapping);
    };

    mapRemoteUidsToUserIds();
  }, [remoteUids, channel]);

  // NEW: Fetch user info for all mapped userIds (memoized to prevent infinite loops)
  const mappedUserIds = useMemo(() => Object.values(remoteUserIdMap), [remoteUserIdMap]);
  const { users: remoteUserInfo } = useUser(mappedUserIds);

  // ---- Setup event handler ----
  const setupEventHandler = () => {
    eventHandler.current = {
      onJoinChannelSuccess: (_connection: RtcConnection, localUid: number) => {
        if (type === "video") setupLocalVideo();
        setIsJoined(true);
      },

      onUserJoined: (_connection: RtcConnection, remoteUid: number) => {
        setRemoteUids(prev => (prev.includes(remoteUid) ? prev : [...prev, remoteUid]));
        // mặc định assume video enabled khi vừa join
        setRemoteVideoEnabledMap(prev => ({ ...prev, [remoteUid]: true }));
      },

      onUserOffline: (_connection: RtcConnection, remoteUid: number) => {
        setRemoteUids(prev => prev.filter(id => id !== remoteUid));
        setRemoteVideoEnabledMap(prev => {
          const next = { ...prev };
          delete next[remoteUid];
          return next;
        });
      },

      // v4+ API: khi remote explicitly mute/unmute video publishing
      onUserMuteVideo: (_connection: RtcConnection, remoteUid: number, muted: boolean) => {
        setRemoteVideoEnabledMap(prev => ({ ...prev, [remoteUid]: !muted }));
      },

      // fallback: older callback - interpret remote video states
      onRemoteVideoStateChanged: (_connection: RtcConnection, remoteUid: number, state: number) => {
        // state: 0=STOPPED,1=STARTING,2=DECODING(playing),3=FROZEN,4=FAILED
        const VIDEO_PLAYING_STATE = 2;
        const isPlaying = state === VIDEO_PLAYING_STATE;
        setRemoteVideoEnabledMap(prev => ({ ...prev, [remoteUid]: isPlaying }));
      },

      onUserMuteAudio: (_connection: RtcConnection, remoteUid: number, muted: boolean) => {
        setRemoteUserAudioStateMap(prev => ({ ...prev, [remoteUid]: !muted }));
      },

      onError: (errorCode: number) => {
        console.error("Agora error:", errorCode);
        setError(`Agora error: ${errorCode}`);
      },
    };

    // register handler AFTER engine initialized
    // depending on your SDK version the method can be registerEventHandler or addListener
    if (agoraEngineRef.current?.registerEventHandler) {
      agoraEngineRef.current?.registerEventHandler(eventHandler.current);
    } else if (agoraEngineRef.current?.addListener) {
      // example adding many listeners is possible; keep this block if using v4 addListener API
      // (you can also call addListener for each event individually)
      // Left here as safe-fallback; real usage on v4: agoraEngineRef.current.addListener('onUserJoined', handler)
    }
  };

  // ---- Setup video SDK engine ----
  const setupVideoSDKEngine = async () => {
    try {
      if (Platform.OS === "android") {
        await getPermission();
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      if (!agoraEngine) throw new Error("Failed to create Agora engine");

      await agoraEngine.initialize({ appId: AGORA_APP_ID });

      // Always enable video capability (even if audio-only initially, user can toggle camera on)
      await agoraEngine.enableVideo();
      await agoraEngine.enableAudio();

      console.log("Agora engine initialized successfully with APP_ID:", AGORA_APP_ID);
    } catch (e) {
      console.error("Setup error:", e);
      setError("Failed to setup camera/microphone");
      throw e;
    }
  };

  // ---- Setup local video (enable + start preview) ----
  const setupLocalVideo = () => {
    try {
      agoraEngineRef.current?.enableVideo();
      agoraEngineRef.current?.startPreview();
      console.log("Local video preview started");
    } catch (e) {
      console.error("Setup local video error:", e);
      setError("Failed to start camera");
    }
  };

  // ---- Join channel with NUMERIC agoraUid ----
  const join = async () => {
    if (isJoined) {
      return;
    }
    try {
      console.log(`Joining channel: ${channel}, agoraUid: ${agoraUid}, type: ${type}`);

      const tokenOrNil = ""; // test mode; if security enabled use server token

      // joinChannel signature (token, channelId, uid, options)
      // Use numeric agoraUid from backend (works with both Web and Mobile)
      const result = await agoraEngineRef.current?.joinChannel(
        tokenOrNil,
        channel,
        agoraUid, // Numeric UID from backend
        {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: type === "video",
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        }
      );

      console.log("joinChannel result:", result);
      // Note: onJoinChannelSuccess will set isJoined and start preview for video
    } catch (e) {
      console.error("Join channel error:", e);
      setError("Failed to join channel");
    }
  };

  // ---- Leave channel ----
  const leave = () => {
    try {
      if (hasLeftRef.current) return;
      hasLeftRef.current = true;

      console.log("Leaving channel:", channel);
      agoraEngineRef.current?.leaveChannel();
      setRemoteUids([]);
      setIsJoined(false);
      handleLeave();
    } catch (e) {
      console.error("Leave channel error:", e);
      setError("Failed to leave channel");
    }
  };

  // ---- Cleanup Agora engine ----
  const cleanupAgoraEngine = () => {
    try {
      if (agoraEngineRef.current) {
        agoraEngineRef.current?.unregisterEventHandler(eventHandler.current!);
        agoraEngineRef.current?.leaveChannel();
        agoraEngineRef.current?.release();
        agoraEngineRef.current = null;
        console.log("Agora engine cleaned up");
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  };

  // ---- Toggle mic ----
  const toggleMic = () => {
    try {
      const newState = !isMicOn;
      agoraEngineRef.current?.enableLocalAudio(newState);
      setIsMicOn(newState);
      console.log(`Microphone ${newState ? "enabled" : "disabled"}`);
    } catch (e) {
      console.error("Toggle mic error:", e);
    }
  };

  // ---- Toggle camera ----
  const toggleCam = () => {
    try {
      const newState = !isLocalVideoEnabled;

      if (newState) {
        agoraEngineRef.current?.enableLocalVideo(true);
        agoraEngineRef.current?.startPreview();
        agoraEngineRef.current?.updateChannelMediaOptions({
          publishCameraTrack: true,
        });
      } else {
        // QUAN TRỌNG: unpublish trước → không còn frame để render
        agoraEngineRef.current?.updateChannelMediaOptions({
          publishCameraTrack: false,
        });
        agoraEngineRef.current?.stopPreview();
        agoraEngineRef.current?.enableLocalVideo(false);
      }

      setIsLocalVideoEnabled(newState);
      setIsCamOn(newState); // giữ sync với UI cũ
    } catch (e) {
      console.error("Toggle cam error:", e);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveCall(channel, currentUserId, userName);
      console.log("Left call successfully");
    } catch (err) {
      console.error("Leave call API error:", err);
    }
    navigation.goBack();
  };

  // ---- Render video item (remote or local) ----
  const renderVideoItem = ({ item }: { item: number | string }) => {
    // If item is "local", render local video; otherwise render remote user
    if (item === "local") {
      return (
        <View style={[styles.videoItem, { width: screenWidth / 2 - 4, height: screenHeight / 3 }]}>
          {isLocalVideoEnabled ? (
            <RtcSurfaceView
              canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
              style={styles.localVideo}
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder}>
              <Image
                source={{ uri: normalizeImageUrl(currentUser?.imageUrl || DEFAULT_AVATAR) }}
                style={styles.remoteAvatarLarge}
              />
              <Text style={styles.placeholderName}>You</Text>
            </View>
          )}

          <View style={styles.youBadge}>
            <Image
              source={{ uri: normalizeImageUrl(currentUser?.imageUrl || DEFAULT_AVATAR) }}
              style={styles.youAvatar}
            />
            <Text style={styles.youLabelText}>You</Text>
          </View>
        </View>
      );
    }

    // Render remote user
    const agoraUid = item as number;
    const userId = remoteUserIdMap[agoraUid];
    const userInfo = userId ? remoteUserInfo[userId] : null;
    const displayName = userInfo?.fullName || userInfo?.firstName || `User ${agoraUid}`;
    const avatarUrl = normalizeImageUrl(userInfo?.imageUrl) || normalizeImageUrl(DEFAULT_AVATAR);
    const hasAudio = remoteUserAudioStateMap[agoraUid] !== false;

    // default: nếu chưa biết trạng thái, cho hiển thị video (prevent flash)
    const isVideoEnabled = remoteVideoEnabledMap[agoraUid] ?? true;

    return (
      <View style={[styles.videoItem, { width: screenWidth / 2 - 4, height: screenHeight / 3 }]}>
        {isVideoEnabled ? (
          <RtcSurfaceView
            canvas={{
              uid: agoraUid,
              sourceType: VideoSourceType.VideoSourceRemote,
            }}
            // set renderMode to FIT để giữ tỷ lệ (letterbox), tránh crop portrait mobile
            // renderMode={2}
            style={styles.remoteVideo}
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Image source={{ uri: avatarUrl }} style={styles.remoteAvatarLarge} />
            <Text style={styles.placeholderName} numberOfLines={1}>{displayName}</Text>
          </View>
        )}

        {/* badges */}
        <View style={styles.remoteUserBadge}>
          <Image source={{ uri: avatarUrl }} style={styles.remoteAvatar} />
          <Text style={styles.remoteUserName} numberOfLines={1}>{displayName}</Text>
        </View>

        {!hasAudio && (
          <View style={styles.micOffIndicator}>
            <Icon name="mic-off" size={16} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  // ---- Combine remote UIDs and local video into single list ----
  const gridData = useMemo(() => {
    if (isLocalPIP || !isJoined) {
      return remoteUids;
    }
    // Include local video in grid when not in PIP mode
    return [...remoteUids, "local"];
  }, [remoteUids, isLocalPIP, isJoined]);

  // ---------- UI ----------
  return (
    <SafeAreaView style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.videoContainer}>

        {/* Display videos in grid (remote + local if not PIP) */}
        {gridData.length > 0 && (
          <FlatList
            data={gridData}
            renderItem={renderVideoItem}
            keyExtractor={(item) => (typeof item === "string" ? item : item.toString())}
            numColumns={2}
            scrollEnabled={false}
            style={styles.remoteGrid}
          />
        )}

        {/* Local PIP - show in corner when many participants */}
        {isJoined && isLocalPIP && (
          <View style={styles.localPip}>
            {isLocalVideoEnabled ? (
              <RtcSurfaceView
                canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                style={styles.localVideo}
              />
            ) : (
              <View style={styles.localVideoPlaceholder}>
                <Image
                  source={{ uri: normalizeImageUrl(currentUser?.imageUrl || DEFAULT_AVATAR) }}
                  style={styles.localAvatarLarge}
                />
                <Text style={styles.placeholderName}>You</Text>
              </View>
            )}

            <View style={styles.youBadgePip}>
              <Image
                source={{ uri: normalizeImageUrl(currentUser?.imageUrl || DEFAULT_AVATAR) }}
                style={styles.youAvatarPip}
              />
              <Text style={styles.youLabelTextPip}>You</Text>
            </View>
          </View>
        )}
      </View>

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <View style={styles.controlButtonsContainer}>
          <TouchableOpacity
            style={[styles.controlBtn, isMicOn ? styles.active : styles.disabled]}
            onPress={toggleMic}
          >
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.controlBtn, isCamOn ? styles.active : styles.disabled]}
            onPress={toggleCam}
          >
            <Icon name={isCamOn ? "video" : "video-off"} size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.controlBtn, styles.hangup]}
            onPress={leave}
          >
            <Icon name="phone" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    position: "relative",
  },
  remoteGrid: {
    width: "100%",
  },
  videoItem: {
    margin: 2,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "#444",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  remoteUserBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    zIndex: 10,
  },
  remoteAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#555",
    borderWidth: 1,
    borderColor: "#999",
  },
  remoteUserName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 100,
  },
  micOffIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#dc2626",
    padding: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  localPip: {
    position: "absolute",
    right: 12,
    bottom: 80,
    width: 120,
    height: 160,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2e6ef7",
    zIndex: 50,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  youBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 110, 247, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    zIndex: 10,
  },
  youAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#555",
    borderWidth: 1,
    borderColor: "#fff",
  },
  youLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  youBadgePip: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 110, 247, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    zIndex: 10,
  },
  youAvatarPip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#555",
    borderWidth: 1,
    borderColor: "#fff",
  },
  youLabelTextPip: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  participantCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 20,
  },
  participantCountText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  controlBar: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
  },
  controlButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(31, 41, 55, 0.95)",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 0,
  },
  controlBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#555",
    marginHorizontal: 4,
  },
  active: {
    backgroundColor: "#4b5563",
  },
  disabled: {
    backgroundColor: "#dc2626",
  },
  hangup: {
    backgroundColor: "#dc2626",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: "#dc2626",
    padding: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
  },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  audioText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  remoteVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#555',
    marginBottom: 8,
  },
  placeholderName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  localVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#555',
    marginBottom: 8,
  },
});
