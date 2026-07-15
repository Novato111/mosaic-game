/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PALETTES } from '../palettes';
import { Palette, SimulationStats } from '../types';
import { 
  Sparkles, Sliders, Volume2, VolumeX, RotateCcw, 
  Zap, Eye, Activity, Play, Pause, Layers, Circle,
  Video, Square, RefreshCw
} from 'lucide-react';

interface LoopControlsProps {
  currentPalette: Palette;
  onPaletteChange: (palette: Palette) => void;
  tileDensity: 'low' | 'medium' | 'high' | 'ultra';
  onTileDensityChange: (density: 'low' | 'medium' | 'high' | 'ultra') => void;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  growthSpeed: number;
  onGrowthSpeedChange: (speed: number) => void;
  autoCyclePalette: boolean;
  onAutoCyclePaletteChange: (auto: boolean) => void;
  stats: SimulationStats;
  isPaused: boolean;
  onPauseToggle: () => void;
  onRestart: () => void;
  onTriggerBoost: () => void; // For loop-mode, can act as a force zoom-out trigger!
  onClearAll: () => void;
  topHookText: string;
  onTopHookTextChange: (text: string) => void;
  levelNumber: string;
  onLevelNumberChange: (levelNum: string) => void;
  levelName: string;
  onLevelNameChange: (levelName: string) => void;
  levelFont: string;
  onLevelFontChange: (font: string) => void;
  comments: {
    range0_25: string;
    range25_50: string;
    range50_75: string;
    range75_90: string;
    range90_99: string;
    range100: string;
  };
  onCommentsChange: React.Dispatch<React.SetStateAction<{
    range0_25: string;
    range25_50: string;
    range50_75: string;
    range75_90: string;
    range90_99: string;
    range100: string;
  }>>;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingSeconds: number;
  recordingPreset: '1080p' | '4k';
  onRecordingPresetChange: (preset: '1080p' | '4k') => void;
  recordingFps: 30 | 60;
  onRecordingFpsChange: (fps: 30 | 60) => void;
  recordingBitrate: number;
  onRecordingBitrateChange: (bitrate: number) => void;
}

export const LoopControls: React.FC<LoopControlsProps> = (props) => {
  const currentPalette = props.currentPalette;
  const onPaletteChange = props.onPaletteChange;
  const tileDensity = props.tileDensity;
  const onTileDensityChange = props.onTileDensityChange;
  const isMuted = props.isMuted;
  const onMuteChange = props.onMuteChange;
  const volume = props.volume;
  const onVolumeChange = props.onVolumeChange;
  const growthSpeed = props.growthSpeed;
  const onGrowthSpeedChange = props.onGrowthSpeedChange;
  const autoCyclePalette = props.autoCyclePalette;
  const onAutoCyclePaletteChange = props.onAutoCyclePaletteChange;
  const stats = props.stats;
  const isPaused = props.isPaused;
  const onPauseToggle = props.onPauseToggle;
  const onRestart = props.onRestart;
  const onTriggerBoost = props.onTriggerBoost;
  const onClearAll = props.onClearAll;
  const topHookText = props.topHookText;
  const onTopHookTextChange = props.onTopHookTextChange;
  const levelNumber = props.levelNumber;
  const onLevelNumberChange = props.onLevelNumberChange;
  const levelName = props.levelName;
  const onLevelNameChange = props.onLevelNameChange;
  const levelFont = props.levelFont;
  const onLevelFontChange = props.onLevelFontChange;
  const comments = props.comments;
  const onCommentsChange = props.onCommentsChange;
  const isRecording = props.isRecording;
  const onStartRecording = props.onStartRecording;
  const onStopRecording = props.onStopRecording;
  const recordingSeconds = props.recordingSeconds;
  const recordingPreset = props.recordingPreset;
  const onRecordingPresetChange = props.onRecordingPresetChange;
  const recordingFps = props.recordingFps;
  const onRecordingFpsChange = props.onRecordingFpsChange;
  const recordingBitrate = props.recordingBitrate;
  const onRecordingBitrateChange = props.onRecordingBitrateChange;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}.${ms}`;
  };

  const handleCommentChange = (key: keyof typeof comments, value: string) => {
    onCommentsChange(prev => {
      const updated = { ...prev };
      updated[key] = value;
      return updated;
    });
  };

  const FONTS_AVAILABLE = [
    "Outfit",
    "Press Start 2P",
    "Inter",
    "Space Grotesk",
    "JetBrains Mono"
  ];

  return (
    <div id="simulation-controls" className="w-full h-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto text-zinc-100 p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
      
      {/* Title / Banner */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
            <Zap size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Endless Loop Mode</h1>
            <p className="text-xs text-zinc-400">Fixed Ball Growing Mosaic Loop</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onPauseToggle}
            className={`p-2 rounded-xl transition flex items-center justify-center ${
              isPaused 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title={isPaused ? "Play Simulation" : "Pause Simulation"}
          >
            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>
          <button
            onClick={onRestart}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition text-zinc-300 hover:text-white"
            title="Reset Loop"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* QUICK STATS DASHBOARD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center">
            <Circle size={8} className="mr-1 text-red-500 fill-red-500" />
            Loop Clearance
          </span>
          <span className="text-3xl font-black font-mono tracking-tight text-white mt-1">
            {stats.clearedPercent}%
          </span>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${stats.clearedPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center">
            <Activity size={10} className="mr-1 text-cyan-400" />
            Growth Speed
          </span>
          <span className="text-2xl font-extrabold font-mono tracking-tight text-cyan-400 mt-1">
            {growthSpeed} <span className="text-xs text-zinc-600 font-normal">px/s</span>
          </span>
          <span className="text-[10px] text-zinc-400 truncate">
            Total clears: {stats.impactCount}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Mosaic Tiles
          </span>
          <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">
            {stats.tilesRemaining}
          </div>
          <div className="text-[10px] text-zinc-500">
            of {stats.totalTiles} in ring
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Active Duration
          </span>
          <div className="text-base font-bold text-amber-400 mt-0.5 truncate">
            {formatTime(stats.elapsedTime)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            Loop status: {stats.phase === 'extreme' ? 'Zooming' : 'Expanding'}
          </div>
        </div>
      </div>

      {/* CORE LOOP PARAMS */}
      <div className="space-y-4 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Sliders size={12} className="mr-1.5 text-indigo-400" />
          Loop Control Parameters
        </h2>

        {/* Growth Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-medium">Ball Growth Pacing</span>
            <span className="font-mono text-white font-bold">{growthSpeed} px/sec</span>
          </div>
          <input
            type="range"
            min="60"
            max="350"
            step="10"
            value={growthSpeed}
            onChange={(e) => onGrowthSpeedChange(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
          />
        </div>

        {/* Density Select Buttons */}
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium block">Mosaic Tile Ring Density</span>
          <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/50">
            {(['low', 'medium', 'high', 'ultra'] as const).map((d) => (
              <button
                key={d}
                onClick={() => onTileDensityChange(d)}
                className={`py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all ${
                  tileDensity === d
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Action triggers */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={onTriggerBoost}
            className="py-2.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs rounded-xl border border-indigo-500/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
            title="Force camera zoom-out immediately"
          >
            <Zap size={13} />
            <span>Force Zoom</span>
          </button>
          <button
            onClick={onClearAll}
            className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
            title="Shatter all tiles instantly"
          >
            <RefreshCw size={13} />
            <span>Shatter All</span>
          </button>
        </div>
      </div>

      {/* PALETTES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
            <Sparkles size={12} className="mr-1.5 text-yellow-500" />
            Color Theme Palette
          </h2>
          {/* Auto cycle toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCyclePalette}
              onChange={(e) => onAutoCyclePaletteChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white relative"></div>
            <span className="text-[10px] font-bold text-zinc-400 peer-checked:text-indigo-400 uppercase">Auto-Cycle</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {PALETTES.map((p) => {
            const isSelected = currentPalette.key === p.key;
            return (
              <button
                key={p.key}
                disabled={autoCyclePalette}
                onClick={() => onPaletteChange(p)}
                className={`flex flex-col p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-zinc-800 border-indigo-500/80 shadow-md shadow-indigo-500/5'
                    : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800'
                } ${autoCyclePalette ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-xs font-semibold text-zinc-100 truncate">{p.name}</span>
                <div className="flex space-x-0.5 mt-2 h-2.5 w-full rounded-full overflow-hidden">
                  {p.colors.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ASMR SOUND VOLUME CONTROLS */}
      <div className="space-y-3 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Volume2 size={12} className="mr-1.5 text-teal-400" />
          Acoustic Volume (ASMR Synth)
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onMuteChange(!isMuted)}
            className={`p-2 rounded-xl transition ${
              isMuted ? 'bg-red-500/10 text-red-400' : 'bg-zinc-900 text-teal-400 hover:bg-zinc-800'
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div className="flex-1 space-y-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                onVolumeChange(parseFloat(e.target.value));
                if (isMuted) onMuteChange(false);
              }}
              className="w-full accent-teal-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
            />
          </div>
          <span className="font-mono text-[10px] text-zinc-400 w-8 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      {/* SHORTS VIDEO MAKER OVERLAYS */}
      <div className="space-y-4 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Eye size={12} className="mr-1.5 text-emerald-400" />
          Shorts Dynamic Caption Overlay
        </h2>

        {/* Caption Fonts */}
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Typography Font Pairings</span>
          <select
            value={levelFont}
            onChange={(e) => onLevelFontChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/60"
          >
            {FONTS_AVAILABLE.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        {/* Text Captions */}
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Top Hook Text Caption (multi-line supported)</span>
            <textarea
              rows={3}
              value={topHookText}
              onChange={(e) => onTopHookTextChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none font-sans"
              placeholder="e.g. CAN WE HIT 100%?"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Level Title</span>
              <input
                type="text"
                value={levelName}
                onChange={(e) => onLevelNameChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                placeholder="MOSAIC GRID"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Level ID</span>
              <input
                type="text"
                value={levelNumber}
                onChange={(e) => onLevelNumberChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                placeholder="01"
              />
            </div>
          </div>
        </div>

        {/* Progression Captions */}
        <div className="space-y-2 pt-1 border-t border-zinc-800/60">
          <span className="text-[10px] text-zinc-500 uppercase font-bold block">Satisfying Dynamic Comments</span>
          
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">0-25%</span>
              <input
                type="text"
                value={comments.range0_25}
                onChange={(e) => handleCommentChange('range0_25', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">25-50%</span>
              <input
                type="text"
                value={comments.range25_50}
                onChange={(e) => handleCommentChange('range25_50', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">50-75%</span>
              <input
                type="text"
                value={comments.range50_75}
                onChange={(e) => handleCommentChange('range50_75', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">75-90%</span>
              <input
                type="text"
                value={comments.range75_90}
                onChange={(e) => handleCommentChange('range75_90', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">90-99%</span>
              <input
                type="text"
                value={comments.range90_99}
                onChange={(e) => handleCommentChange('range90_99', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-zinc-400 w-11 shrink-0">100%</span>
              <input
                type="text"
                value={comments.range100}
                onChange={(e) => handleCommentChange('range100', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4K EXPORT RECORDER */}
      <div className="space-y-4 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
            <Video size={12} className="mr-1.5 text-red-500" />
            4K Video Rendering Exporter
          </h2>
          {isRecording && (
            <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full animate-pulse">
              RECORDING
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Preset selector */}
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-zinc-500">Quality Preset</span>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              {(['1080p', '4k'] as const).map((p) => (
                <button
                  key={p}
                  disabled={isRecording}
                  onClick={() => onRecordingPresetChange(p)}
                  className={`py-1 text-[9px] font-bold rounded transition ${
                    recordingPreset === p
                      ? 'bg-red-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Framerate selector */}
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-zinc-500">Video Framerate</span>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              {([30, 60] as const).map((fps) => (
                <button
                  key={fps}
                  disabled={isRecording}
                  onClick={() => onRecordingFpsChange(fps)}
                  className={`py-1 text-[9px] font-bold rounded transition ${
                    recordingFps === fps
                      ? 'bg-red-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bitrate slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span className="font-bold uppercase">Export Bitrate</span>
            <span className="font-mono text-white font-bold">{recordingBitrate} Mbps</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            disabled={isRecording}
            value={recordingBitrate}
            onChange={(e) => onRecordingBitrateChange(parseInt(e.target.value))}
            className="w-full accent-red-600 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none disabled:opacity-50"
          />
        </div>

        {/* Trigger Record Button */}
        {isRecording ? (
          <button
            onClick={onStopRecording}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition cursor-pointer shadow-lg shadow-white/5"
          >
            <Square size={14} className="fill-zinc-950" />
            <span>STOP RECORDING & DOWNLOAD ({Math.floor(recordingSeconds)}s)</span>
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition cursor-pointer shadow-lg shadow-red-600/10"
          >
            <Video size={14} />
            <span>START HIGH-SPEED RECORDING</span>
          </button>
        )}
      </div>

    </div>
  );
};
