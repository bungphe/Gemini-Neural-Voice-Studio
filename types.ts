export enum GeminiVoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface VoiceProfile {
  id: GeminiVoiceName;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
  color: string;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: GeminiVoiceName.Puck, name: 'Puck', gender: 'Male', description: 'Mischievous and energetic', color: 'bg-blue-500' },
  { id: GeminiVoiceName.Charon, name: 'Charon', gender: 'Male', description: 'Deep and authoritative', color: 'bg-purple-500' },
  { id: GeminiVoiceName.Kore, name: 'Kore', gender: 'Female', description: 'Calm and soothing', color: 'bg-emerald-500' },
  { id: GeminiVoiceName.Fenrir, name: 'Fenrir', gender: 'Male', description: 'Rough and intense', color: 'bg-red-500' },
  { id: GeminiVoiceName.Zephyr, name: 'Zephyr', gender: 'Female', description: 'Light and airy', color: 'bg-cyan-500' },
];

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  audioData: AudioBuffer | null;
}
