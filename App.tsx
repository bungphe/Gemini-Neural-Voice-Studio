import React, { useState, useRef } from 'react';
import { Play, Square, Sparkles, Users, User, Download, Volume2, Mic2, Upload, X } from 'lucide-react';
import { VOICE_PROFILES, GeminiVoiceName, GenerationState } from './types';
import { generateSpeech, generateConversation, generateClonedSpeech } from './services/gemini';
import { VoiceCard } from './components/VoiceCard';
import { Visualizer } from './components/Visualizer';

export default function App() {
  // Audio Context State
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // App Mode
  const [mode, setMode] = useState<'single' | 'multi' | 'clone'>('single');
  
  // Generation State
  const [text, setText] = useState('Hello! This is a demonstration of the Gemini neural text-to-speech capabilities. I can read any text you type here.');
  const [genState, setGenState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    audioData: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Single Speaker State
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoiceName>(GeminiVoiceName.Puck);

  // Multi Speaker State
  const [speaker1Name, setSpeaker1Name] = useState('Joe');
  const [speaker1Voice, setSpeaker1Voice] = useState<GeminiVoiceName>(GeminiVoiceName.Kore);
  const [speaker2Name, setSpeaker2Name] = useState('Jane');
  const [speaker2Voice, setSpeaker2Voice] = useState<GeminiVoiceName>(GeminiVoiceName.Puck);
  const [multiSpeakerText, setMultiSpeakerText] = useState(`Joe: Hi Jane, have you heard about the new Gemini update?\nJane: Yes Joe! The voice generation is incredible.\nJoe: It sounds so lifelike, doesn't it?`);

  // Cloning State
  const [cloneFile, setCloneFile] = useState<File | null>(null);

  // Initialize Audio Context on interaction
  const initAudio = () => {
    if (!audioCtx) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Gemini TTS native rate
      });
      const anal = ctx.createAnalyser();
      anal.fftSize = 2048;
      setAudioCtx(ctx);
      setAnalyser(anal);
    }
  };

  const handleGenerate = async () => {
    initAudio();
    
    // Ensure context exists
    let ctx = audioCtx;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const anal = ctx.createAnalyser();
      anal.fftSize = 2048;
      setAudioCtx(ctx);
      setAnalyser(anal);
    }
    
    await generate(ctx!);
  };

  const generate = async (ctx: AudioContext) => {
    setGenState({ ...genState, isLoading: true, error: null, audioData: null });
    stopAudio();

    try {
      let buffer: AudioBuffer;
      if (mode === 'single') {
        buffer = await generateSpeech(text, selectedVoice, ctx);
      } else if (mode === 'multi') {
        buffer = await generateConversation(
          multiSpeakerText,
          speaker1Name,
          speaker1Voice,
          speaker2Name,
          speaker2Voice,
          ctx
        );
      } else {
        // Clone Mode
        if (!cloneFile) throw new Error("Please upload a reference audio file.");
        
        const arrayBuffer = await cloneFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        buffer = await generateClonedSpeech(text, base64, cloneFile.type, ctx);
      }
      setGenState({ isLoading: false, error: null, audioData: buffer });
      playAudio(buffer, ctx);
    } catch (err: any) {
      console.error(err);
      setGenState({ 
        isLoading: false, 
        error: err.message || "Failed to generate audio. Please check your input and API key.", 
        audioData: null 
      });
    }
  };

  const playAudio = (buffer: AudioBuffer, ctx: AudioContext) => {
    if (!ctx || !analyser) return;
    
    // Stop previous
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    
    source.onended = () => setIsPlaying(false);
    
    sourceRef.current = source;
    source.start(0);
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!genState.audioData) return;
    alert("Download feature coming soon! (Requires WAV encoding implementation)");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File size too large. Please upload a file smaller than 10MB.");
        return;
      }
      setCloneFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Volume2 size={18} className="text-white" />
            </div>
            <h1 className="font-heading font-bold text-xl tracking-tight">Gemini <span className="text-blue-400">Voice Synth</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
             <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs">
               Model: {mode === 'clone' ? 'gemini-2.5-flash-native-audio' : 'gemini-2.5-flash-preview-tts'}
             </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar - Controls */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Mode Selector */}
          <div className="p-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col gap-1">
            <div className="flex gap-1">
                <button 
                onClick={() => setMode('single')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${mode === 'single' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                <User size={14} />
                Single
                </button>
                <button 
                onClick={() => setMode('multi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${mode === 'multi' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                <Users size={14} />
                Conv.
                </button>
                <button 
                onClick={() => setMode('clone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${mode === 'clone' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                <Mic2 size={14} />
                Clone
                </button>
            </div>
          </div>

          {/* Single Voice Selection */}
          {mode === 'single' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Select Voice</h2>
              <div className="grid grid-cols-1 gap-3">
                {VOICE_PROFILES.map(voice => (
                  <VoiceCard 
                    key={voice.id} 
                    voice={voice} 
                    isSelected={selectedVoice === voice.id}
                    onSelect={() => {
                      setSelectedVoice(voice.id);
                      stopAudio();
                    }} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Multi Voice Selection */}
          {mode === 'multi' && (
            <div className="space-y-6">
              {/* Speaker 1 */}
              <div className="space-y-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-blue-400 uppercase">Speaker 1</label>
                  <input 
                    type="text" 
                    value={speaker1Name}
                    onChange={(e) => setSpeaker1Name(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white text-xs px-2 py-1 rounded w-24 text-right focus:border-blue-500 outline-none"
                  />
                </div>
                <select 
                  value={speaker1Voice}
                  onChange={(e) => setSpeaker1Voice(e.target.value as GeminiVoiceName)}
                  className="w-full bg-zinc-950 text-zinc-200 text-sm p-2 rounded border border-zinc-800 focus:border-blue-500 outline-none"
                >
                  {VOICE_PROFILES.map(v => <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>)}
                </select>
              </div>

              {/* Speaker 2 */}
              <div className="space-y-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-purple-400 uppercase">Speaker 2</label>
                  <input 
                    type="text" 
                    value={speaker2Name}
                    onChange={(e) => setSpeaker2Name(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white text-xs px-2 py-1 rounded w-24 text-right focus:border-purple-500 outline-none"
                  />
                </div>
                <select 
                  value={speaker2Voice}
                  onChange={(e) => setSpeaker2Voice(e.target.value as GeminiVoiceName)}
                  className="w-full bg-zinc-950 text-zinc-200 text-sm p-2 rounded border border-zinc-800 focus:border-purple-500 outline-none"
                >
                  {VOICE_PROFILES.map(v => <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Clone Voice Selection */}
          {mode === 'clone' && (
            <div className="space-y-4">
               <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Reference Audio</h2>
               
               <div className="p-6 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/30 flex flex-col items-center justify-center text-center transition-colors hover:bg-zinc-900/50 hover:border-zinc-600 relative">
                  <input 
                    type="file" 
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {cloneFile ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                           <Volume2 size={20} />
                        </div>
                        <span className="text-sm text-white font-medium truncate max-w-[200px]">{cloneFile.name}</span>
                        <span className="text-xs text-zinc-500">{(cloneFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <button 
                           onClick={(e) => {
                             e.preventDefault();
                             setCloneFile(null);
                           }}
                           className="z-10 mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <X size={12} /> Remove
                        </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                       <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center">
                           <Upload size={20} />
                        </div>
                        <span className="text-sm text-zinc-300 font-medium">Upload Audio Reference</span>
                        <span className="text-xs text-zinc-500">MP3 or WAV, max 10MB</span>
                    </div>
                  )}
               </div>
               
               <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
                  <p><strong>Note:</strong> Cloning uses the Live API to mimic the tone and style of the reference audio. Results may vary depending on audio quality.</p>
               </div>
            </div>
          )}

        </aside>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Visualizer */}
          <div className="relative">
            <Visualizer analyser={analyser} isPlaying={isPlaying} />
            <div className="absolute bottom-4 right-4 flex gap-2">
              {genState.audioData && (
                <button 
                  onClick={() => playAudio(genState.audioData!, audioCtx!)}
                  disabled={isPlaying}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 transition-colors"
                >
                  <Play size={18} fill="currentColor" />
                </button>
              )}
              {isPlaying && (
                <button 
                  onClick={stopAudio}
                  className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/50"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              )}
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <label className="text-sm font-medium text-zinc-300">
                  {mode === 'multi' ? 'Conversation Script' : 'Text to Speech'}
               </label>
               {mode === 'multi' && (
                 <span className="text-xs text-zinc-500">Use Format: Name: Message</span>
               )}
            </div>
            <textarea
              value={mode === 'single' ? text : mode === 'multi' ? multiSpeakerText : text}
              onChange={(e) => {
                  if (mode === 'multi') setMultiSpeakerText(e.target.value);
                  else setText(e.target.value);
              }}
              className="w-full h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder={
                mode === 'multi' 
                  ? "Joe: Hello!\nJane: Hi there, how are you?" 
                  : mode === 'clone' 
                    ? "Enter the text you want the cloned voice to speak..."
                    : "Enter text here to generate speech..."
              }
            />
          </div>

          {/* Error Message */}
          {genState.error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {genState.error}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="text-xs text-zinc-500">
              {genState.audioData ? 
                `Generated ${genState.audioData.duration.toFixed(2)}s of audio` : 
                'Ready to generate'
              }
            </div>
            
            <div className="flex gap-3">
              {genState.audioData && (
                 <button 
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                 >
                   <Download size={16} />
                   Download WAV
                 </button>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={genState.isLoading || (mode === 'single' && !text) || (mode === 'multi' && !multiSpeakerText) || (mode === 'clone' && (!text || !cloneFile))}
                className={`px-6 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${genState.isLoading ? 'animate-pulse' : ''}
                `}
              >
                {genState.isLoading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Speech
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}