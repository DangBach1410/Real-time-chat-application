import { useEffect, useState } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";

export function useChatAudioRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setReady(true);
    })();
  }, []);

  const start = async () => {
    if (!ready || state.isRecording) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    if (!state.isRecording) return null;
    await recorder.stop();
    return recorder.uri;
  };

  return {
    start,
    stop,
    isRecording: state.isRecording,
    duration: state.durationMillis,
  };
}
