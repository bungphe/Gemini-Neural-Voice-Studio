import React from 'react';
import { VoiceProfile } from '../types';
import { Mic } from 'lucide-react';

interface VoiceCardProps {
  voice: VoiceProfile;
  isSelected: boolean;
  onSelect: (id: any) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({ voice, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(voice.id)}
      className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 text-left w-full group
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50' 
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
        }
      `}
    >
      <div className="flex items-center gap-3 z-10 relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${voice.color}`}>
          <Mic size={18} />
        </div>
        <div>
          <h3 className="font-medium text-white">{voice.name}</h3>
          <p className="text-xs text-zinc-400">{voice.gender} • {voice.description}</p>
        </div>
      </div>
    </button>
  );
};