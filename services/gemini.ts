import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { GeminiVoiceName } from "../types";
import { decode, decodeAudioData } from "../utils/audio";

let genAI: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing from environment");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export async function generateSpeech(
  text: string,
  voiceName: GeminiVoiceName,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const ai = getAI();

  // Single speaker request
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error("No audio data returned from Gemini.");
  }

  // Decode the raw PCM data
  return await decodeAudioData(
    decode(base64Audio),
    audioContext,
    24000, // Standard sample rate for Gemini TTS
    1
  );
}

export async function generateConversation(
  text: string,
  speaker1Name: string,
  speaker1Voice: GeminiVoiceName,
  speaker2Name: string,
  speaker2Voice: GeminiVoiceName,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const ai = getAI();

  // Multi-speaker request
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: speaker1Name,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: speaker1Voice },
              },
            },
            {
              speaker: speaker2Name,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: speaker2Voice },
              },
            },
          ],
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error("No audio data returned from Gemini.");
  }

  return await decodeAudioData(
    decode(base64Audio),
    audioContext,
    24000,
    1
  );
}

// Helper: Convert Float32 AudioBuffer data to Int16 PCM
function floatTo16BitPCM(float32Arr: Float32Array): Uint8Array {
  const int16Arr = new Int16Array(float32Arr.length);
  for (let i = 0; i < float32Arr.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Arr[i]));
    int16Arr[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Uint8Array(int16Arr.buffer);
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateClonedSpeech(
  text: string,
  referenceAudioBase64: string,
  mimeType: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const ai = getAI();

  // 1. Decode the input reference file (MP3/WAV) to a generic AudioBuffer
  const audioBytes = decode(referenceAudioBase64);
  const refAudioBuffer = await audioContext.decodeAudioData(audioBytes.buffer.slice(0));
  
  // 2. Convert to PCM (Int16) for Gemini Input
  const pcmData = floatTo16BitPCM(refAudioBuffer.getChannelData(0));
  const pcmBase64 = arrayBufferToBase64(pcmData.buffer);

  return new Promise((resolve, reject) => {
    const audioChunks: Uint8Array[] = [];
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        // Inject the instructions into the system instruction to avoid needing session.send()
        systemInstruction: `You are a professional voice actor. 
        I am sending you a continuous audio stream which contains a voice sample. 
        Your task is to listen to this sample to analyze the speaker's voice, tone, pitch, and cadence.
        
        Then, strictly speak the following text mimicking that exact voice:
        "${text}"
        
        Do not respond to the content of the audio sample. Do not say anything else. Just speak the target text in the cloned voice.`,
      },
      callbacks: {
        onopen: () => {
          sessionPromise.then(async (session) => {
            try {
              // Send the Audio Data
              await session.sendRealtimeInput({
                media: {
                  mimeType: `audio/pcm;rate=${refAudioBuffer.sampleRate}`,
                  data: pcmBase64
                }
              });
              // We rely on the VAD (Voice Activity Detection) to pick up the end of the stream and the system instruction to trigger the response.
            } catch (e) {
              console.error("Error sending input:", e);
              reject(e);
              if (session) session.close();
            }
          });
        },
        onmessage: (msg: LiveServerMessage) => {
           const data = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
           if (data) {
             audioChunks.push(decode(data));
           }
           
           if (msg.serverContent?.turnComplete) {
             sessionPromise.then(session => session && session.close());
           }
        },
        onclose: () => {
           if (audioChunks.length === 0) {
             // Only reject if we haven't received any audio and closed unexpectedly
             reject(new Error("Connection closed without generating audio."));
             return;
           }
           
           const totalLength = audioChunks.reduce((acc, curr) => acc + curr.length, 0);
           const combined = new Uint8Array(totalLength);
           let offset = 0;
           for(const chunk of audioChunks) {
             combined.set(chunk, offset);
             offset += chunk.length;
           }

           decodeAudioData(combined, audioContext, 24000, 1)
             .then(resolve)
             .catch(reject);
        },
        onerror: (e: any) => {
          console.error("Gemini Live Error:", e);
          // Don't immediately reject, allow onclose to handle partial data if any
          // But if fatal, it will trigger close
        }
      }
    });
  });
}