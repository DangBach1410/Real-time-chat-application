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

export default function CallPage() {
  const url = new URL(window.location.href);
  const channel = url.searchParams.get("channel")!;
  const uid = url.searchParams.get("uid")!;
  const type = url.searchParams.get("type")!; // "audio" | "video"

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(type === "video");

  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);

  const PIP_THRESHOLD = 6;

  const remoteUserIds = useMemo(() => remoteUsers.map(u => u.uid.toString()), [remoteUsers]);
  const { users: remoteUserInfo } = useUser(remoteUserIds);

  useEffect(() => {
    const init = async () => {
      try {
        AgoraRTC.setLogLevel(3);
        AgoraRTC.checkSystemRequirements();

        // 1️⃣ Join vào kênh
        await agoraClient.join(APP_ID, channel, null, uid);

        // 2️⃣ Tạo local audio
        localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();

        // 3️⃣ Tạo local video nếu là video call
        if (type === "video") {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play("local-player");
          await agoraClient.publish([
            localAudioTrack.current,
            localVideoTrack.current,
          ]);
        } else {
          await agoraClient.publish([localAudioTrack.current]);
        }

        // 4️⃣ Khi có sẵn user trong phòng → subscribe hết
        for (const user of agoraClient.remoteUsers) {
          await agoraClient.subscribe(user, "video").catch(() => {});
          await agoraClient.subscribe(user, "audio").catch(() => {});
          user.videoTrack?.play(`remote-${user.uid}`);
          user.audioTrack?.play();
        }
        setRemoteUsers([...agoraClient.remoteUsers]);

        // 5️⃣ Khi user mới publish media
        agoraClient.on("user-published", async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          if (mediaType === "video") user.videoTrack?.play(`remote-${user.uid}`);
          if (mediaType === "audio") user.audioTrack?.play();
          setRemoteUsers([...agoraClient.remoteUsers]);
        });

        // 6️⃣ Khi user rời hoặc unpublish
        const handleUserChange = () => setRemoteUsers([...agoraClient.remoteUsers]);
        agoraClient.on("user-unpublished", handleUserChange);
        agoraClient.on("user-left", handleUserChange);

        // 7️⃣ Khi có user mới join, republish lại local track (đảm bảo họ thấy mình)
        agoraClient.on("user-joined", async () => {
          // tắt
          await agoraClient.unpublish([localVideoTrack.current!]);
          localVideoTrack.current?.stop();
          localVideoTrack.current?.close();
          localVideoTrack.current = null;
          // bật lại
          if (!localVideoTrack.current) {
            localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          }
          localVideoTrack.current.play("local-player");
          await agoraClient.publish([localVideoTrack.current]);
        });
      } catch (err) {
        console.error("Agora join error:", err);
      }
    };

    init();

    // cleanup
    return () => {
      localAudioTrack.current?.close();
      localVideoTrack.current?.close();
      agoraClient.removeAllListeners();
      agoraClient.leave();
    };
  }, []);

  // 🎤 Toggle mic
  const toggleMic = async () => {
    if (!localAudioTrack.current) return;
    await localAudioTrack.current.setEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  // 🎥 Toggle cam
  const toggleCam = async () => {
    if (!isCamOn) {
      // bật lại
      if (!localVideoTrack.current) {
        localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
      }
      localVideoTrack.current.play("local-player");
      await agoraClient.publish([localVideoTrack.current]);
    } else {
      // tắt
      await agoraClient.unpublish([localVideoTrack.current!]);
      localVideoTrack.current?.stop();
      localVideoTrack.current?.close();
      localVideoTrack.current = null;
    }
    setIsCamOn(!isCamOn);
  };

  const totalParticipants = remoteUsers.length + 1;
  const isLocalPIP = totalParticipants > PIP_THRESHOLD;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* --- GRID VIDEO --- */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-2 overflow-auto">
        {remoteUsers.map((user) => {
          const info = remoteUserInfo[user.uid.toString()];
          return (
            <div
              key={user.uid}
              id={`remote-${user.uid}`}
              className="relative w-full aspect-video bg-gray-700 rounded-lg overflow-hidden"
            >
              <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded flex items-center gap-1 z-10">
                <img
                  src={info?.imageUrl || DEFAULT_AVATAR}
                  alt={info?.fullName || "User"}
                  className="w-4 h-4 rounded-full"
                />
                {info?.fullName || `User ${user.uid}`}
              </span>
            </div>
          );
        })}

        {!isLocalPIP && (
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <div id="local-player" className="w-full h-full"></div>
            <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded">
              You
            </span>
          </div>
        )}
      </div>

      {/* --- LOCAL PIP --- */}
      {isLocalPIP && (
        <div className="absolute bottom-4 right-4 w-40 h-28 bg-black rounded-lg overflow-hidden shadow-lg z-50">
          <div id="local-player" className="w-full h-full"></div>
          <span className="absolute bottom-1 left-1 px-1 bg-black bg-opacity-50 text-xs rounded">
            You
          </span>
        </div>
      )}

      {/* --- CONTROL BAR --- */}
      <div className="flex justify-center gap-6 p-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition ${
            isMicOn ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-600"
          }`}
        >
          {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        <button
          onClick={toggleCam}
          className={`p-3 rounded-full transition ${
            isCamOn ? "bg-green-500 hover:bg-green-600" : "bg-gray-600"
          }`}
        >
          {isCamOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        <button
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition"
          onClick={() => window.close()}
        >
          <Phone size={22} />
        </button>
      </div>
    </div>
  );
}
