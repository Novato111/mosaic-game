/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface PhoneMockupProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  children: React.ReactNode;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  isMuted,
  onToggleMute,
  isRecording = false,
  recordingSeconds = 0,
  children
}) => {
  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div id="phone-mockup" className="relative w-full max-w-[430px] aspect-[9/16] bg-black rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-zinc-800 overflow-hidden flex flex-col select-none transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
      {/* Screen Container */}
      <div className="relative w-full h-full flex-1 overflow-hidden bg-black flex flex-col">
        {/* Dynamic REC Badge Overlay */}
        {isRecording && (
          <div className="absolute top-6 left-6 z-30 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 flex items-center space-x-1.5 pointer-events-none animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[11px] font-bold font-mono text-zinc-100 tracking-wider">REC {formatSeconds(recordingSeconds)}</span>
          </div>
        )}

        {/* Mute/Unmute Float Control (Overlays nicely on bottom margin of phone screen) */}
        <button
          onClick={onToggleMute}
          className="absolute bottom-6 right-6 z-30 p-2.5 bg-black/70 hover:bg-black/90 active:scale-90 text-zinc-100 hover:text-white rounded-full border border-zinc-700/30 backdrop-blur-md transition-all duration-200"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Content Children (The WebGL/2D ShortsCanvas itself) */}
        <div className="w-full h-full flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
