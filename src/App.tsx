/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { PALETTES } from './palettes';
import { Palette, SimulationStats, TimelinePhase } from './types';
import { ShortsCanvas, ShortsCanvasRef } from './components/ShortsCanvas';
import { PhoneMockup } from './components/PhoneMockup';
import { SimulationControls } from './components/SimulationControls';
import { Sparkles, Youtube, Play, Pause, RefreshCw, Zap } from 'lucide-react';
import { audioSynth } from './audio';

export default function App() {
  // State variables for controlling simulation
  const [palette, setPalette] = useState<Palette>(PALETTES[0]); // Starts with Rainbow
  const [tileDensity, setTileDensity] = useState<'low' | 'medium' | 'high' | 'ultra'>('medium');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.4);
  const [autoProgression, setAutoProgression] = useState<boolean>(true);
  const [selectedPhase, setSelectedPhase] = useState<TimelinePhase | 'auto'>('auto');
  const [manualSpeedMultiplier, setManualSpeedMultiplier] = useState<number>(1.0);
  const [scratchRadiusFactor, setScratchRadiusFactor] = useState<number>(1.35);
  const [boosterPower, setBoosterPower] = useState<number>(1.4);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Ball Size and Dynamic Growth Settings
  const [initialBallRadius, setInitialBallRadius] = useState<number>(16);
  const [growBallOnBooster, setGrowBallOnBooster] = useState<boolean>(false);
  const [ballGrowthType, setBallGrowthType] = useState<'additive' | 'multiplicative'>('additive');
  const [ballGrowthAmount, setBallGrowthAmount] = useState<number>(2.0);
  const [ballGrowthMultiplier, setBallGrowthMultiplier] = useState<number>(1.1);
  const [maxBallRadius, setMaxBallRadius] = useState<number>(50);

  // Custom visual caption variables
  const [topHookText, setTopHookText] = useState<string>("CAN IT HIT 100%?");
  const [levelNumber, setLevelNumber] = useState<string>("01");
  const [levelName, setLevelName] = useState<string>("NEON GRID");
  const [levelFont, setLevelFont] = useState<string>("Outfit");
  const [comments, setComments] = useState({
    range0_25: "Wait for the end! 😱",
    range25_50: "Looking good! 😉",
    range50_75: "Keep watching... 👀",
    range75_90: "So close! 😱",
    range90_99: "ALMOST FINISHED!!! 🔥",
    range100: "PERFECT CALM! 🎉"
  });

  // Real-time metrics emitted from the 60 FPS Canvas thread
  const [stats, setStats] = useState<SimulationStats>({
    clearedPercent: 0,
    tilesRemaining: 1000,
    totalTiles: 1000,
    fps: 60,
    phase: 'slow',
    elapsedTime: 0,
    speedMultiplier: 1.0,
    impactCount: 0
  });
  
  // Synchronize top caption settings when Minecraft theme is selected
  React.useEffect(() => {
    if (palette.key === 'minecraft') {
      setTopHookText("ONE BALL. ENDLESS DESTRUCTION.");
      setLevelNumber("64");
      setLevelName("CRAFT WORLD");
      setLevelFont("Press Start 2P");
      setComments({
        range0_25: "Mining diamonds... 💎",
        range25_50: "Creeper? Aw man... 💚",
        range50_75: "Sssss... watch out! 🧨",
        range75_90: "ALMOST CLEARED!!! 🔥",
        range90_99: "DON'T LOOK AT THE ENDERMAN! 💜",
        range100: "MINECRAFT WORLD SAVED! 🏆"
      });
    } else {
      setTopHookText("CAN IT HIT 100%?");
      setLevelNumber("01");
      setLevelName("NEON GRID");
      setLevelFont("Outfit");
      setComments({
        range0_25: "Wait for the end! 😱",
        range25_50: "Looking good! 😉",
        range50_75: "Keep watching... 👀",
        range75_90: "So close! 😱",
        range90_99: "ALMOST FINISHED!!! 🔥",
        range100: "PERFECT CALM! 🎉"
      });
    }
  }, [palette]);

  // 4K Video Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingPreset, setRecordingPreset] = useState<'1080p' | '4k'>('1080p');
  const [recordingFps, setRecordingFps] = useState<30 | 60>(60);
  const [recordingBitrate, setRecordingBitrate] = useState<number>(30); // in Mbps
  const [resolutionScale, setResolutionScale] = useState<number>(1.0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioDestNodeRef = useRef<any | null>(null);

  // Reference to call canvas actions directly
  const canvasRef = useRef<ShortsCanvasRef | null>(null);

  // 4K Video Recording Handler Functions
  const handleStartRecording = () => {
    // 1. Rescale canvas buffer to meet target quality preset
    const targetScale = recordingPreset === '4k' ? 2.0 : 1.0;
    setResolutionScale(targetScale);

    // 2. Wait 150ms for canvas buffer to reallocate before starting stream capture
    setTimeout(() => {
      const canvas = document.getElementById('shorts-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      recordedChunksRef.current = [];
      setRecordingSeconds(0);

      // Capture Canvas visual stream
      const videoStream = canvas.captureStream(recordingFps);

      // Connect Web Audio API synth output
      const audioContext = audioSynth.getAudioContext();
      const masterVolume = audioSynth.getMasterVolume();
      let combinedStream: MediaStream = videoStream;

      if (audioContext && masterVolume) {
        try {
          const dest = audioContext.createMediaStreamDestination();
          masterVolume.connect(dest);
          audioDestNodeRef.current = dest;

          // Merge Video and Synth Audio tracks
          const combinedTracks = [
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ];
          combinedStream = new MediaStream(combinedTracks);
        } catch (err) {
          console.warn("Could not capture synthesizer audio track:", err);
        }
      }

      // Determine matching mime types
      let selectedMimeType = "video/webm;codecs=vp9";

      if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
        selectedMimeType = "video/mp4;codecs=avc1";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        selectedMimeType = "video/webm;codecs=vp9";
      } else {
        selectedMimeType = "video/webm";
      }

      try {
        const options = {
          mimeType: selectedMimeType,
          videoBitsPerSecond: recordingBitrate * 1000000,
          audioBitsPerSecond: 192000
        };

        const mediaRecorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Disconnect recorder audio destination
          if (audioDestNodeRef.current && masterVolume) {
            try {
              masterVolume.disconnect(audioDestNodeRef.current);
            } catch (err) {
              console.warn("Error disconnecting recording node:", err);
            }
            audioDestNodeRef.current = null;
          }

          // Restore canvas resolution to 1.0 to preserve power
          setResolutionScale(1.0);

          // Build output file
          const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
          const url = URL.createObjectURL(blob);
          const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';

          const a = document.createElement('a');
          a.href = url;
          a.download = `shorts_satisfying_mosaic_render_${recordingPreset === '4k' ? '4k' : '1080p'}.${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setIsRecording(false);
          setRecordingSeconds(0);
        };

        mediaRecorder.start(250);
        setIsRecording(true);

        let secs = 0;
        timerRef.current = setInterval(() => {
          secs += 1;
          setRecordingSeconds(secs);
        }, 1000);

      } catch (err) {
        console.error("Failed to start MediaRecorder session:", err);
        setIsRecording(false);
        setResolutionScale(1.0);
      }
    }, 150);
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Restart trigger helper
  const handleRestart = () => {
    if (canvasRef.current) {
      canvasRef.current.restart();
    }
  };

  // Immediate boost force helper
  const handleTriggerBoost = () => {
    if (canvasRef.current) {
      canvasRef.current.triggerManualBoost();
    }
  };

  // Immediate clear grid helper
  const handleClearAll = () => {
    if (canvasRef.current) {
      canvasRef.current.clearAllTiles();
    }
  };

  // Sync canvas phase changes to top-level stats
  const handlePhaseChange = (phase: TimelinePhase) => {
    setStats(prev => ({ ...prev, phase }));
  };

  return (
    <div className="w-screen min-h-screen bg-[#07070a] text-zinc-100 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* MAIN VIEWPORT (Phone Mockup + Header) */}
      <div className="flex-1 flex flex-col items-center p-4 md:p-6 lg:p-8 space-y-4 justify-between h-screen overflow-y-auto">
        
        {/* Aesthetic App Header */}
        <div className="w-full max-w-lg flex items-center justify-between bg-zinc-900/50 border border-zinc-800/60 p-3.5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Youtube size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide uppercase text-white flex items-center">
                ASMR MOSAIC SCRATCH
                <span className="ml-1.5 bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                  SHORTS
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400">Mesmerizing Generative Ball Physics Simulation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(prev => !prev)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg active:scale-95 text-xs font-bold transition ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/40'
              }`}
              title={isPaused ? "Play Simulation" : "Pause Simulation"}
            >
              {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
              <span>{isPaused ? 'Play' : 'Pause'}</span>
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-zinc-200 hover:text-white rounded-lg transition border border-zinc-700/40"
              title="Reset Simulation"
            >
              <RefreshCw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Dynamic Center Stage: Smartphone Container */}
        <div className="flex-1 w-full flex items-center justify-center py-2 max-h-[80vh]">
          <PhoneMockup
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(prev => !prev)}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
          >
            <ShortsCanvas
              ref={canvasRef}
              palette={palette}
              tileDensity={tileDensity}
              isMuted={isMuted}
              volume={volume}
              autoProgression={autoProgression}
              manualSpeedMultiplier={manualSpeedMultiplier}
              onStatsChange={setStats}
              selectedPhase={selectedPhase}
              onPhaseChange={handlePhaseChange}
              scratchRadiusFactor={scratchRadiusFactor}
              boosterPower={boosterPower}
              isPaused={isPaused}
              topHookText={topHookText}
              levelNumber={levelNumber}
              levelName={levelName}
              levelFont={levelFont}
              comments={comments}
              resolutionScale={resolutionScale}
              initialBallRadius={initialBallRadius}
              growBallOnBooster={growBallOnBooster}
              ballGrowthType={ballGrowthType}
              ballGrowthAmount={ballGrowthAmount}
              ballGrowthMultiplier={ballGrowthMultiplier}
              maxBallRadius={maxBallRadius}
            />
          </PhoneMockup>
        </div>

        {/* Footer info tip */}
        <div className="w-full max-w-lg text-center text-[11px] text-zinc-500 leading-normal bg-zinc-950/30 py-2 px-4 rounded-xl border border-zinc-900">
          Created with <span className="text-red-500">❤️</span> for YouTube Shorts creators. Set your parameters on the right and record/capture directly.
        </div>

      </div>

      {/* RIGHT SIDEBAR (Interactive Configuration Controls) */}
      <div className="w-full md:w-[410px] xl:w-[450px] shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/40 h-auto md:h-screen flex flex-col shadow-2xl">
        <SimulationControls
          currentPalette={palette}
          onPaletteChange={setPalette}
          tileDensity={tileDensity}
          onTileDensityChange={setTileDensity}
          isMuted={isMuted}
          onMuteChange={setIsMuted}
          volume={volume}
          onVolumeChange={setVolume}
          autoProgression={autoProgression}
          onAutoProgressionChange={setAutoProgression}
          selectedPhase={selectedPhase}
          onPhaseChange={setSelectedPhase}
          manualSpeedMultiplier={manualSpeedMultiplier}
          onSpeedMultiplierChange={setManualSpeedMultiplier}
          scratchRadiusFactor={scratchRadiusFactor}
          onScratchRadiusChange={setScratchRadiusFactor}
          boosterPower={boosterPower}
          onBoosterPowerChange={setBoosterPower}
          stats={stats}
          isPaused={isPaused}
          onPauseToggle={() => setIsPaused(prev => !prev)}
          onRestart={handleRestart}
          onTriggerBoost={handleTriggerBoost}
          onClearAll={handleClearAll}
          topHookText={topHookText}
          onTopHookTextChange={setTopHookText}
          levelNumber={levelNumber}
          onLevelNumberChange={setLevelNumber}
          levelName={levelName}
          onLevelNameChange={setLevelName}
          levelFont={levelFont}
          onLevelFontChange={setLevelFont}
          comments={comments}
          onCommentsChange={setComments}
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          recordingSeconds={recordingSeconds}
          recordingPreset={recordingPreset}
          onRecordingPresetChange={setRecordingPreset}
          recordingFps={recordingFps}
          onRecordingFpsChange={setRecordingFps}
          recordingBitrate={recordingBitrate}
          onRecordingBitrateChange={setRecordingBitrate}
          initialBallRadius={initialBallRadius}
          onInitialBallRadiusChange={setInitialBallRadius}
          growBallOnBooster={growBallOnBooster}
          onGrowBallOnBoosterChange={setGrowBallOnBooster}
          ballGrowthType={ballGrowthType}
          onBallGrowthTypeChange={setBallGrowthType}
          ballGrowthAmount={ballGrowthAmount}
          onBallGrowthAmountChange={setBallGrowthAmount}
          ballGrowthMultiplier={ballGrowthMultiplier}
          onBallGrowthMultiplierChange={setBallGrowthMultiplier}
          maxBallRadius={maxBallRadius}
          onMaxBallRadiusChange={setMaxBallRadius}
        />
      </div>

    </div>
  );
}
