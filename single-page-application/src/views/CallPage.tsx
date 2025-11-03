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
import { leaveCall } from "../helpers/callApi";
import { fetchUserById } from "../helpers/userApi";

export default function CallPage() {
  const url = new URL(window.location.href);
  const channel = url.searchParams.get("channel")!;
  const uid = url.searchParams.get("uid")!;
  const type = url.searchParams.get("type")!; // "audio" | "video"

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(type === "video");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const hasLeftRef = useRef(false);

  const PIP_THRESHOLD = 6;
  const remoteUserIds = useMemo(() => remoteUsers.map(u => u.uid.toString()), [remoteUsers]);
  const { users: remoteUserInfo } = useUser(remoteUserIds);
  const userId = localStorage.getItem("userId");

  // fetch current user
  useEffect(() => {
    if (!userId) return;
    fetchUserById(userId)
      .then(data => setCurrentUser(data))
      .catch(() => console.warn("Cannot fetch current user info"));
  }, []);

  // ---- Join Agora channel ----
  useEffect(() => {
    const init = async () => {
      try {
        AgoraRTC.setLogLevel(3);
        AgoraRTC.checkSystemRequirements();

        await agoraClient.join(APP_ID, channel, null, uid);
        localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();

        if (type === "video") {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play("local-player");
          await agoraClient.publish([localAudioTrack.current, localVideoTrack.current]);
        } else {
          await agoraClient.publish([localAudioTrack.current]);
        }

        // subscribe sẵn remote users
        for (const user of agoraClient.remoteUsers) {
          await agoraClient.subscribe(user, "video").catch(() => {});
          await agoraClient.subscribe(user, "audio").catch(() => {});
          user.videoTrack?.play(`remote-${user.uid}`);
          user.audioTrack?.play();
        }
        setRemoteUsers([...agoraClient.remoteUsers]);

        // remote user events
        const updateRemoteUsers = () => setRemoteUsers([...agoraClient.remoteUsers]);
        agoraClient.on("user-published", async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          if (mediaType === "video") user.videoTrack?.play(`remote-${user.uid}`);
          if (mediaType === "audio") user.audioTrack?.play();
          updateRemoteUsers();
        });
        agoraClient.on("user-unpublished", updateRemoteUsers);
        agoraClient.on("user-left", updateRemoteUsers);

        // republish local track nếu có user mới join
        agoraClient.on("user-joined", async () => {
          if (localVideoTrack.current) {
            await agoraClient.unpublish([localVideoTrack.current]);
            localVideoTrack.current.stop();
            localVideoTrack.current.close();
          }
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play("local-player");
          await agoraClient.publish([localVideoTrack.current]);
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

  // ---- Toggle Mic / Cam ----
  const toggleMic = async () => {
    if (!localAudioTrack.current) return;
    await localAudioTrack.current.setEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleCam = async () => {
    if (!isCamOn) {
      if (!localVideoTrack.current) {
        localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
      }
      localVideoTrack.current.play("local-player");
      await agoraClient.publish([localVideoTrack.current]);
    } else {
      await agoraClient.unpublish([localVideoTrack.current!]);
      localVideoTrack.current?.stop();
      localVideoTrack.current?.close();
      localVideoTrack.current = null;
    }
    setIsCamOn(!isCamOn);
  };

  // ---- Leave call ----
  const handleLeaveCall = async () => {
    try {
      if (currentUser && channel) {
        await leaveCall(channel, uid, currentUser.fullName);
      }
      hasLeftRef.current = true;
    } catch (err) {
      console.error("Leave call failed:", err);
    } finally {
    
      window.close();
    }
  };

  // ---- Leave call khi tab đóng ----
  useEffect(() => {
    const leaveCallKeepalive = () => {
      if (!currentUser || !channel) return;
      if (hasLeftRef.current) return;

      const accessToken = localStorage.getItem("accessToken");
      const url = `http://localhost:8762/api/v1/chat/calls/leave/${channel}/${uid}?userName=${encodeURIComponent(currentUser.fullName)}`;

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

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* --- GRID VIDEO --- */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-2 overflow-auto">
        {remoteUsers.map(user => {
          const info = remoteUserInfo[user.uid.toString()];
          return (
            <div
              key={user.uid}
              id={`remote-${user.uid}`}
              className="relative w-full aspect-video bg-gray-700 rounded-lg overflow-hidden"
            >
              <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded flex items-center gap-1 z-10">
                <img src={info?.imageUrl || DEFAULT_AVATAR} alt={info?.fullName || "User"} className="w-4 h-4 rounded-full" />
                {info?.fullName || `User ${user.uid}`}
              </span>
            </div>
          );
        })}

        {!isLocalPIP && (
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <div id="local-player" className="w-full h-full"></div>
            <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded">You</span>
          </div>
        )}
      </div>

      {/* --- LOCAL PIP --- */}
      {isLocalPIP && (
        <div className="absolute bottom-4 right-4 w-40 h-28 bg-black rounded-lg overflow-hidden shadow-lg z-50">
          <div id="local-player" className="w-full h-full"></div>
          <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded">You</span>
        </div>
      )}

      {/* --- CONTROL BAR --- */}
      <div className="flex justify-center gap-6 p-4">
        <button onClick={toggleMic} className={`p-3 rounded-full transition ${isMicOn ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-600"}`}>
          {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        <button onClick={toggleCam} className={`p-3 rounded-full transition ${isCamOn ? "bg-green-500 hover:bg-green-600" : "bg-gray-600"}`}>
          {isCamOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        <button onClick={handleLeaveCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition">
          <Phone size={22} />
        </button>
      </div>
    </div>
  );
}
