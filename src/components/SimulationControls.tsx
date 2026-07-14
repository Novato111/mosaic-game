/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PALETTES } from '../palettes';
import { Palette, SimulationStats, TimelinePhase } from '../types';
import { 
  Sparkles, Sliders, Volume2, VolumeX, RotateCcw, 
  Zap, Eye, Activity, Play, Pause, Layers, Circle,
  Video, Square
} from 'lucide-react';

interface SimulationControlsProps {
  currentPalette: Palette;
  onPaletteChange: (palette: Palette) => void;
  tileDensity: 'low' | 'medium' | 'high' | 'ultra';
  onTileDensityChange: (density: 'low' | 'medium' | 'high' | 'ultra') => void;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  autoProgression: boolean;
  onAutoProgressionChange: (auto: boolean) => void;
  selectedPhase: TimelinePhase | 'auto';
  onPhaseChange: (phase: TimelinePhase | 'auto') => void;
  manualSpeedMultiplier: number;
  onSpeedMultiplierChange: (multiplier: number) => void;
  scratchRadiusFactor: number;
  onScratchRadiusChange: (factor: number) => void;
  boosterPower: number;
  onBoosterPowerChange: (power: number) => void;
  stats: SimulationStats;
  isPaused: boolean;
  onPauseToggle: () => void;
  onRestart: () => void;
  onTriggerBoost: () => void;
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
  initialBallRadius: number;
  onInitialBallRadiusChange: (radius: number) => void;
  growBallOnBooster: boolean;
  onGrowBallOnBoosterChange: (grow: boolean) => void;
  ballGrowthType: 'additive' | 'multiplicative';
  onBallGrowthTypeChange: (type: 'additive' | 'multiplicative') => void;
  ballGrowthAmount: number;
  onBallGrowthAmountChange: (amount: number) => void;
  ballGrowthMultiplier: number;
  onBallGrowthMultiplierChange: (multiplier: number) => void;
  maxBallRadius: number;
  onMaxBallRadiusChange: (max: number) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  currentPalette,
  onPaletteChange,
  tileDensity,
  onTileDensityChange,
  isMuted,
  onMuteChange,
  volume,
  onVolumeChange,
  autoProgression,
  onAutoProgressionChange,
  selectedPhase,
  onPhaseChange,
  manualSpeedMultiplier,
  onSpeedMultiplierChange,
  scratchRadiusFactor,
  onScratchRadiusChange,
  boosterPower,
  onBoosterPowerChange,
  stats,
  isPaused,
  onPauseToggle,
  onRestart,
  onTriggerBoost,
  onClearAll,
  topHookText,
  onTopHookTextChange,
  levelNumber,
  onLevelNumberChange,
  levelName,
  onLevelNameChange,
  levelFont,
  onLevelFontChange,
  comments,
  onCommentsChange,
  isRecording,
  onStartRecording,
  onStopRecording,
  recordingSeconds,
  recordingPreset,
  onRecordingPresetChange,
  recordingFps,
  onRecordingFpsChange,
  recordingBitrate,
  onRecordingBitrateChange,
  initialBallRadius,
  onInitialBallRadiusChange,
  growBallOnBooster,
  onGrowBallOnBoosterChange,
  ballGrowthType,
  onBallGrowthTypeChange,
  ballGrowthAmount,
  onBallGrowthAmountChange,
  ballGrowthMultiplier,
  onBallGrowthMultiplierChange,
  maxBallRadius,
  onMaxBallRadiusChange
}) => {

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}.${ms}`;
  };

  return (
    <div id="simulation-controls" className="w-full h-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto text-zinc-100 p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
      
      {/* Title / Banner */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
            <Zap size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Shorts Simulator</h1>
            <p className="text-xs text-zinc-400">9:16 Satisfying ASMR Generator</p>
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
            title="Reset Simulation"
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
            Percent Cleared
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
            Ball Speed (FPS)
          </span>
          <span className="text-2xl font-extrabold font-mono tracking-tight text-cyan-400 mt-1">
            {stats.fps} <span className="text-xs text-zinc-600 font-normal">FPS</span>
          </span>
          <span className="text-[10px] text-zinc-400 truncate">
            Multiplier: {stats.speedMultiplier.toFixed(1)}x
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Active Tiles
          </span>
          <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">
            {stats.tilesRemaining}
          </div>
          <div className="text-[10px] text-zinc-500">
            of {stats.totalTiles} total
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Timeline / Phase
          </span>
          <div className="text-base font-bold text-amber-400 mt-0.5 truncate capitalize">
            {formatTime(stats.elapsedTime)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            Phase: {stats.phase}
          </div>
        </div>
      </div>

      {/* PALETTES */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Sparkles size={12} className="mr-1.5 text-yellow-500" />
          Color Theme Palette ({PALETTES.length})
        </h2>
        <div className="grid grid-cols-2 gap-2.5 max-h-[190px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
          {PALETTES.map((p) => {
            const isSelected = p.key === currentPalette.key;
            return (
              <button
                key={p.key}
                onClick={() => onPaletteChange(p)}
                className={`group flex items-center p-2 rounded-xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-zinc-800 border-zinc-500 ring-1 ring-zinc-500' 
                    : 'bg-zinc-950/60 border-zinc-800/50 hover:bg-zinc-800/40 hover:border-zinc-700'
                }`}
              >
                {/* Micro Color Dots for gradient preview */}
                <div className="flex -space-x-1 mr-2.5 shrink-0">
                  {p.colors.slice(0, 3).map((col, idx) => (
                    <div 
                      key={idx} 
                      className="w-3.5 h-3.5 rounded-full border border-zinc-950 shadow-sm"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TILE GRID DENSITY */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Layers size={12} className="mr-1.5 text-emerald-400" />
          Mosaic Tile Size (Density)
        </h2>
        <div className="grid grid-cols-4 gap-1.5 bg-zinc-950 p-1 rounded-xl">
          {(['low', 'medium', 'high', 'ultra'] as const).map((density) => {
            const isSelected = tileDensity === density;
            const labels = { low: 'Coarse', medium: 'Default', high: 'Fine', ultra: 'Dense' };
            return (
              <button
                key={density}
                onClick={() => onTileDensityChange(density)}
                className={`py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition uppercase ${
                  isSelected
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {labels[density]}
              </button>
            );
          })}
        </div>
      </div>

      {/* PROGRESSION CONTROLS */}
      <div className="space-y-3 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/60">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
            <Sliders size={12} className="mr-1.5 text-amber-500" />
            Progression Engine
          </h2>
          <button
            onClick={() => onAutoProgressionChange(!autoProgression)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase flex items-center transition ${
              autoProgression 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {autoProgression ? 'AUTOPLAY: NATURAL' : 'MANUAL LOCK'}
          </button>
        </div>

        {/* Phase Selectors (Available if Manual Lock) */}
        {!autoProgression && (
          <div className="space-y-2 pt-1">
            <label className="text-[11px] text-zinc-400">Lock Simulation Speed Phase:</label>
            <div className="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-xl">
              {(['slow', 'medium', 'fast', 'extreme', 'cleared'] as const).map((phase) => {
                const isSelected = selectedPhase === phase;
                return (
                  <button
                    key={phase}
                    onClick={() => onPhaseChange(phase)}
                    className={`py-1 rounded-md text-[9px] font-extrabold uppercase transition ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {phase}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sliders */}
        <div className="space-y-3 pt-2">
          {/* Base speed multiplier */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Velocity Multiplier</span>
              <span className="font-mono text-white font-bold">{manualSpeedMultiplier.toFixed(1)}x</span>
            </div>
            <input 
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={manualSpeedMultiplier}
              onChange={(e) => onSpeedMultiplierChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Scratch radius factor */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Scratch Brush Radius</span>
              <span className="font-mono text-white font-bold">{scratchRadiusFactor.toFixed(2)}x</span>
            </div>
            <input 
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={scratchRadiusFactor}
              onChange={(e) => onScratchRadiusChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Booster kick power */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Booster Rebound Power</span>
              <span className="font-mono text-white font-bold">{boosterPower.toFixed(2)}x</span>
            </div>
            <input 
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={boosterPower}
              onChange={(e) => onBoosterPowerChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* BALL SIZE & GROWTH MECHANICS */}
      <div className="space-y-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Circle size={13} className="mr-1.5 text-sky-400 fill-sky-400/20" />
          Ball Size & Growth Mechanics
        </h2>

        <div className="space-y-3.5">
          {/* Initial Ball Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Initial Ball Size</span>
              <span className="font-mono text-white font-bold">{initialBallRadius}px</span>
            </div>
            <input 
              type="range"
              min="10"
              max="40"
              step="1"
              value={initialBallRadius}
              onChange={(e) => onInitialBallRadiusChange(parseInt(e.target.value))}
              className="w-full accent-sky-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Grow on Booster Hit toggle switch */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">Grow on Booster Hit</span>
            <button
              onClick={() => onGrowBallOnBoosterChange(!growBallOnBooster)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                growBallOnBooster ? 'bg-sky-500' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  growBallOnBooster ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Conditional Growth Configs */}
          {growBallOnBooster && (
            <div className="space-y-3 pt-2.5 border-t border-zinc-800/40">
              {/* Growth Type Selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Growth Method</span>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => onBallGrowthTypeChange('additive')}
                    className={`py-1 text-[10px] font-bold rounded transition-all ${
                      ballGrowthType === 'additive'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Addition (+)
                  </button>
                  <button
                    onClick={() => onBallGrowthTypeChange('multiplicative')}
                    className={`py-1 text-[10px] font-bold rounded transition-all ${
                      ballGrowthType === 'multiplicative'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Multiplication (×)
                  </button>
                </div>
              </div>

              {/* Ball Growth Input */}
              {ballGrowthType === 'additive' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Growth per Hit</span>
                    <span className="font-mono text-white font-bold">+{ballGrowthAmount.toFixed(1)}px</span>
                  </div>
                  <input 
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.1"
                    value={ballGrowthAmount}
                    onChange={(e) => onBallGrowthAmountChange(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Growth Multiplier</span>
                    <span className="font-mono text-white font-bold">{ballGrowthMultiplier.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="1.01"
                    max="2.50"
                    step="0.01"
                    value={ballGrowthMultiplier}
                    onChange={(e) => onBallGrowthMultiplierChange(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Max Ball Size Limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Maximum Size Cap</span>
                  <span className="font-mono text-white font-bold">{maxBallRadius}px</span>
                </div>
                <input 
                  type="range"
                  min="20"
                  max="150"
                  step="2"
                  value={maxBallRadius}
                  onChange={(e) => onMaxBallRadiusChange(parseInt(e.target.value))}
                  className="w-full accent-sky-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SHORTS ENGAGEMENT HOOKS PANEL */}
      <div className="space-y-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
          <Eye size={13} className="mr-1.5 text-red-400" />
          Viral Scroll-Stopping Captions
        </h2>

        {/* Level Number & Level Name input */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              Level
            </label>
            <input 
              type="text"
              value={levelNumber}
              onChange={(e) => onLevelNumberChange(e.target.value)}
              placeholder="01"
              maxLength={5}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:border-zinc-500 focus:outline-none transition font-sans text-center"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              Level Name
            </label>
            <input 
              type="text"
              value={levelName}
              onChange={(e) => onLevelNameChange(e.target.value)}
              placeholder="NEON GRID"
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:border-zinc-500 focus:outline-none transition font-sans"
            />
          </div>
        </div>

        {/* Level Font selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Level Text Font (Gamified Styles)
          </label>
          <select
            value={levelFont}
            onChange={(e) => onLevelFontChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition cursor-pointer"
          >
            <option value="Outfit">Outfit (Clean Minimalist Tech)</option>
            <option value="Bebas Neue">Bebas Neue (Chunky Condensed)</option>
            <option value="Orbitron">Orbitron (Futuristic Sci-Fi)</option>
            <option value="Press Start 2P">Press Start 2P (Retro 8-Bit Arcade)</option>
            <option value="Rubik Mono One">Rubik Mono One (Chunky Blocky)</option>
            <option value="Bungee">Bungee (Chunky Rounded Arcade)</option>
            <option value="Syncopate">Syncopate (Wide Spaced Futuristic)</option>
            <option value="Russo One">Russo One (Cyber / Gaming)</option>
            <option value="Anton">Anton (Ultra-Condensed Impact)</option>
            <option value="Permanent Marker">Permanent Marker (Graffiti / Handwritten)</option>
          </select>
        </div>

        {/* Top hook input */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Top Bold Hook Question (ALL CAPS)
          </label>
          <input 
            type="text"
            value={topHookText}
            onChange={(e) => onTopHookTextChange(e.target.value)}
            placeholder="e.g. CAN IT HIT 100%?"
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:border-zinc-500 focus:outline-none transition font-sans"
          />
        </div>

        {/* Captions based on percent remaining */}
        <div className="space-y-3 pt-1 border-t border-zinc-800/60">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              Captions by % Cleared
            </label>
            <span className="text-[9px] text-zinc-500 italic">Dynamic capture</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {/* 0-25% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">0-25%:</span>
              <input 
                type="text"
                value={comments.range0_25}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range0_25: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* 25-50% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">25-50%:</span>
              <input 
                type="text"
                value={comments.range25_50}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range25_50: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* 50-75% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">50-75%:</span>
              <input 
                type="text"
                value={comments.range50_75}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range50_75: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* 75-90% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">75-90%:</span>
              <input 
                type="text"
                value={comments.range75_90}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range75_90: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* 90-99% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">90-99%:</span>
              <input 
                type="text"
                value={comments.range90_99}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range90_99: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* 100% */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-zinc-400 w-12 shrink-0 font-mono">100%:</span>
              <input 
                type="text"
                value={comments.range100}
                onChange={(e) => onCommentsChange(prev => ({ ...prev, range100: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AUDIO PANEL */}
      <div className="space-y-3 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/60">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
            {isMuted ? <VolumeX size={12} className="mr-1.5 text-red-400" /> : <Volume2 size={12} className="mr-1.5 text-cyan-400" />}
            Audio Synth Sound FX
          </h2>
          <button
            onClick={() => onMuteChange(!isMuted)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
              isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
            }`}
          >
            {isMuted ? 'Muted' : 'Enabled'}
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Synth Master Volume</span>
            <span className="font-mono text-white font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={isMuted}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-30"
          />
        </div>
        <p className="text-[10px] text-zinc-500 italic leading-snug">
          Real-time procedural synths play ASMR scrapes on mosaic breaks and swoosh sounds on booster impacts.
        </p>
      </div>

      {/* 4K VIDEO RECORDER CARD */}
      <div className="space-y-3 bg-zinc-950/75 p-4 rounded-2xl border border-red-500/20 shadow-lg shadow-red-500/5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
            <Video size={12} className="mr-1.5 text-red-500 animate-pulse" />
            4K Video & Audio Recorder
          </h2>
          {isRecording ? (
            <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
              🔴 RECORDING
            </span>
          ) : (
            <span className="bg-zinc-800 text-zinc-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
              IDLE
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Preset Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">Quality Preset</label>
            <select
              disabled={isRecording}
              value={recordingPreset}
              onChange={(e) => onRecordingPresetChange(e.target.value as '1080p' | '4k')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
            >
              <option value="1080p">HD (1080p)</option>
              <option value="4k">4K UHD (2160p)</option>
            </select>
          </div>

          {/* Framerate Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">Frame Rate</label>
            <select
              disabled={isRecording}
              value={recordingFps}
              onChange={(e) => onRecordingFpsChange(parseInt(e.target.value) as 30 | 60)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
            >
              <option value={60}>60 FPS</option>
              <option value={30}>30 FPS</option>
            </select>
          </div>
        </div>

        {/* Bitrate slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Target Video Bitrate</span>
            <span className="font-mono text-white font-bold">{recordingBitrate} Mbps</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            disabled={isRecording}
            value={recordingBitrate}
            onChange={(e) => onRecordingBitrateChange(parseInt(e.target.value))}
            className="w-full accent-red-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Recording buttons */}
        <div className="pt-1">
          {isRecording ? (
            <button
              onClick={onStopRecording}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] rounded-xl font-bold text-xs text-white shadow-lg shadow-red-600/10 flex items-center justify-center space-x-2 transition"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop & Save Video ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60) < 10 ? '0' : ''}{recordingSeconds % 60})</span>
            </button>
          ) : (
            <button
              onClick={onStartRecording}
              className="w-full py-3 bg-gradient-to-r from-red-700/80 to-rose-700/80 hover:from-red-600 hover:to-rose-600 active:scale-[0.98] rounded-xl font-bold text-xs text-red-100 hover:text-white border border-red-500/20 shadow-lg flex items-center justify-center space-x-2 transition"
            >
              <Circle size={10} fill="currentColor" className="text-red-500 animate-pulse" />
              <span>Start Capture Session</span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 italic leading-snug">
          Synthesized high-fidelity sound FX are mixed digitally into the 4K video container. Perfect for direct social media uploads!
        </p>
      </div>

      {/* DIRECT ACTIONS */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Immediate Physics Actions
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onTriggerBoost}
            className="flex items-center justify-center space-x-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-xs text-amber-400 hover:text-amber-300 transition active:scale-95 border border-zinc-700/50"
          >
            <Zap size={14} />
            <span>Force Boost!</span>
          </button>
          
          <button
            onClick={onClearAll}
            className="flex items-center justify-center space-x-2 py-2.5 bg-red-950/40 hover:bg-red-900/40 rounded-xl font-bold text-xs text-red-400 hover:text-red-300 transition active:scale-95 border border-red-500/20"
          >
            <Sparkles size={14} />
            <span>Explode Grid</span>
          </button>
        </div>
      </div>

      {/* INSTRUCTIONS */}
      <div className="bg-zinc-950 border border-zinc-800/40 p-4 rounded-2xl text-xs text-zinc-400 leading-relaxed">
        <div className="font-bold text-zinc-200 flex items-center mb-1 text-[11px]">
          💡 Interactive Tutorial
        </div>
        <span>Click or Drag on the mobile preview screen to manually scratch and explode tiles! Adjust velocity and palettes dynamically to curate a custom Short.</span>
      </div>

    </div>
  );
};
