// pages/CallPage.tsx
import { useEffect, useState, useRef, useMemo } from "react";
import AgoraRTC, {
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { APP_ID, agoraClient } from "../helpers/agora";
import { Mic, MicOff, Video, VideoOff, Phone } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { DEFAULT_AVATAR } from "../constants/common";
import { leaveCall, getUserIdFromAgoraUid } from "../helpers/callApi";
import { fetchUserById } from "../helpers/userApi";

export default function CallPage() {
  const url = new URL(window.location.href);
  const channel = url.searchParams.get("channel")!;
  const agoraUid = parseInt(url.searchParams.get("agoraUid")!);
  const type = url.searchParams.get("type")!; // "audio" | "video"

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(type === "video");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [remoteUserIdMap, setRemoteUserIdMap] = useState<Record<number, string>>({}); // Map agoraUid → userId

  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const hasLeftRef = useRef(false);

  const PIP_THRESHOLD = 6;
  // Convert agoraUids to userIds using the mapping
  const remoteUserIds = useMemo(() => 
    remoteUsers
      .map(u => remoteUserIdMap[u.uid as number])
      .filter(Boolean), 
    [remoteUsers, remoteUserIdMap]
  );
  const { users: remoteUserInfo } = useUser(remoteUserIds);
  const userId = localStorage.getItem("userId");

  // fetch current user
  useEffect(() => {
    if (!userId) return;
    fetchUserById(userId)
      .then(data => setCurrentUser(data))
      .catch(() => console.warn("Cannot fetch current user info"));
  }, []);

  // Map remote agoraUids to userIds
  useEffect(() => {
    const mapRemoteUsersToIds = async () => {
      const mapping: Record<number, string> = {};
      
      for (const remoteUser of remoteUsers) {
        try {
          const mappedUserId = await getUserIdFromAgoraUid(channel, remoteUser.uid as number);
          if (mappedUserId) {
            mapping[remoteUser.uid as number] = mappedUserId;
          }
        } catch (err) {
          console.warn(`Failed to map agoraUid ${remoteUser.uid} to userId:`, err);
        }
      }
      
      setRemoteUserIdMap(mapping);
    };

    if (remoteUsers.length > 0) {
      mapRemoteUsersToIds();
    }
  }, [remoteUsers, channel]);

  // ---- Join Agora channel with NUMERIC uid ----
  useEffect(() => {
    const init = async () => {
      try {
        AgoraRTC.setLogLevel(3);
        AgoraRTC.checkSystemRequirements();

        // Use numeric agoraUid from backend (works on Web, compatible with Mobile)
        await agoraClient.join(APP_ID, channel, null, agoraUid);
        localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();

        if (type === "video") {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play("local-player", {
            fit: "contain",
            mirror: true
          }
          );
          await agoraClient.publish([localAudioTrack.current, localVideoTrack.current]);
        } else {
          await agoraClient.publish([localAudioTrack.current]);
        }

        // subscribe to remote users - just subscribe, don't play yet
        for (const user of agoraClient.remoteUsers) {
          await agoraClient.subscribe(user, "video").catch(() => {});
          await agoraClient.subscribe(user, "audio").catch(() => {});
        }
        setRemoteUsers([...agoraClient.remoteUsers]);
        // remote user events
        const updateRemoteUsers = () => setRemoteUsers([...agoraClient.remoteUsers]);
        agoraClient.on("user-published", async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          updateRemoteUsers();
        });
        agoraClient.on("user-unpublished", updateRemoteUsers);
        agoraClient.on("user-left", updateRemoteUsers);

        agoraClient.on("user-joined", async (user) => {
          console.log("New user joined:", user.uid);
        });
      } catch (err) {
        console.error("Agora join error:", err);
      }
    };

    init();

    return () => {
      localAudioTrack.current?.close();
      localVideoTrack.current?.close();
      agoraClient.removeAllListeners();
      agoraClient.leave();
    };
  }, []);

  // ---- Play videos when remote users are ready ----
  useEffect(() => {
    remoteUsers.forEach(user => {
      const videoContainer = document.getElementById(`remote-${user.uid}`);

      if (videoContainer && user.videoTrack) {
        try {
          user.videoTrack.play(videoContainer, {
            fit: "contain",
            mirror: true
          });
        } catch (err) {
          console.warn(`Failed to play video for user ${user.uid}:`, err);
        }
      }

      if (user.audioTrack) {
        user.audioTrack.play();
      }
    });
  }, [remoteUsers]);

  // ---- Toggle Mic / Cam ----
  const toggleMic = async () => {
    if (!localAudioTrack.current) return;
    // Use setMuted() for better audio track management
    // When isMicOn is true, we want to mute (setMuted(true))
    // When isMicOn is false, we want to unmute (setMuted(false))
    await localAudioTrack.current.setMuted(isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleCam = async () => {
    try {
      if (!isCamOn) {
        // Enable camera
        if (!localVideoTrack.current) {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
        }
        localVideoTrack.current.play("local-player", {
          fit: "contain",
          mirror: true
        });
        await agoraClient.publish([localVideoTrack.current]);
        setIsCamOn(true);
      } else {
        // Disable camera - unsubscribe before closing
        if (localVideoTrack.current) {
          await agoraClient.unpublish([localVideoTrack.current]);
          localVideoTrack.current.stop();
          localVideoTrack.current.close();
          localVideoTrack.current = null;
        }
        setIsCamOn(false);
      }
    } catch (err) {
      console.error("Camera toggle error:", err);
    }
  };

  // ---- Leave call ----
  const handleLeaveCall = async () => {
    try {
      // Clean up media tracks before leaving
      if (localAudioTrack.current) {
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
      if (localVideoTrack.current) {
        localVideoTrack.current.close();
        localVideoTrack.current = null;
      }

      // Notify server about call end
      if (currentUser && channel) {
        await leaveCall(channel, userId!, currentUser.fullName);
      }
      hasLeftRef.current = true;
    } catch (err) {
      console.error("Leave call failed:", err);
    } finally {
      window.close();
    }
  };

  // ---- Leave call when tab closes ----
  useEffect(() => {
    const leaveCallKeepalive = () => {
      if (!currentUser || !channel) return;
      if (hasLeftRef.current) return;

      const accessToken = localStorage.getItem("accessToken");
      const url = `${APP_ID}:8762/api/v1/chat/calls/leave/${channel}/${userId}?userName=${encodeURIComponent(currentUser.fullName)}`;

      fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        keepalive: true,
      }).catch(err => console.error("Leave call on unload failed:", err));
    };

    const handleTabClose = () => leaveCallKeepalive();
    window.addEventListener("beforeunload", handleTabClose);
    return () => window.removeEventListener("beforeunload", handleTabClose);
  }, [currentUser, channel]);

  const totalParticipants = remoteUsers.length + 1;
  const isLocalPIP = totalParticipants > PIP_THRESHOLD;

  // Determine grid layout based on number of participants
  const getGridColsClass = () => {
    const count = remoteUsers.length + (isLocalPIP ? 0 : 1);
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3 || count === 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* --- VIDEO GRID CONTAINER --- */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className={`w-full h-full grid ${getGridColsClass()} gap-3 auto-rows-max content-center`}>
          {remoteUsers.map(user => {
            const mappedUserId = remoteUserIdMap[user.uid as number];
            const info = mappedUserId ? remoteUserInfo[mappedUserId] : null;
            return (
              <div
                key={user.uid}
                className="relative bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 aspect-video max-w-full border-2 border-gray-500"
              >
                <div
                  id={`remote-${user.uid}`}
                  className="w-full h-full bg-gray-900 flex items-center justify-center"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
                {/* User Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black bg-opacity-60 px-3 py-2 rounded-lg backdrop-blur-sm z-20 hover:bg-opacity-80 transition">
                  <img
                    src={info?.imageUrl || DEFAULT_AVATAR}
                    alt={info?.fullName || "User"}
                    className="w-6 h-6 rounded-full border border-gray-300"
                  />
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {info?.fullName || `User ${user.uid}`}
                  </span>
                </div>

                {/* Mic Status Indicator */}
                {!user.audioTrack && (
                  <div className="absolute top-3 right-3 bg-red-600 p-2 rounded-full z-20">
                    <MicOff size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Local Video - Grid View */}
          {!isLocalPIP && (
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 aspect-video max-w-full border-2 border-blue-500">
              <div 
                id="local-player" 
                className="w-full h-full bg-gray-900 flex items-center justify-center"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-blue-600 bg-opacity-80 px-3 py-2 rounded-lg backdrop-blur-sm z-20">
                <img
                  src={currentUser?.imageUrl || DEFAULT_AVATAR}
                  alt="You"
                  className="w-6 h-6 rounded-full border border-white"
                />
                <span className="text-sm font-medium">You</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- LOCAL PIP (Picture in Picture) --- */}
      {isLocalPIP && (
        <div className="absolute bottom-24 right-4 w-56 h-40 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500 z-50 hover:shadow-lg transition-shadow">
          <div id="local-player" className="w-full h-full bg-gray-900" />
          <div className="absolute bottom-2 left-2 bg-blue-600 bg-opacity-80 px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
            <img
              src={currentUser?.imageUrl || DEFAULT_AVATAR}
              alt="You"
              className="w-5 h-5 rounded-full border border-white"
            />
            <span className="text-xs font-medium">You</span>
          </div>
        </div>
      )}

      {/* --- FLOATING CONTROL BAR (Google Meet Style) --- */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex justify-center gap-3 p-6 z-40">
        <div className="flex gap-3 bg-gray-800 bg-opacity-90 backdrop-blur-md px-4 py-3 rounded-full shadow-2xl border border-gray-700">
          {/* Mic Button */}
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
              isMicOn
                ? "bg-gray-600 hover:bg-gray-500 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            title={isMicOn ? "Mute microphone (Ctrl+M)" : "Unmute microphone"}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Divider */}
          <div className="w-px bg-gray-600" />

          {/* Camera Button */}
          <button
            onClick={toggleCam}
            className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
              isCamOn
                ? "bg-gray-600 hover:bg-gray-500 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            title={isCamOn ? "Stop camera (Ctrl+E)" : "Start camera"}
          >
            {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Divider */}
          <div className="w-px bg-gray-600" />

          {/* Leave Call Button */}
          <button
            onClick={handleLeaveCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200 flex items-center justify-center text-white"
            title="Leave call (Alt+F4)"
          >
            <Phone size={20} />
          </button>
        </div>
      </div>

      {/* Participant Count - Top Right */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium z-20">
        {totalParticipants} {totalParticipants === 1 ? "participant" : "participants"}
      </div>
    </div>
  );
}