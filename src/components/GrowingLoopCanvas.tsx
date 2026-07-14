/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Palette, SimulationStats, TimelinePhase } from '../types';
import { getTileColorForPalette } from '../palettes';
import { audioSynth } from '../audio';

interface GrowingLoopCanvasProps {
  palette: Palette;
  tileDensity: 'low' | 'medium' | 'high' | 'ultra';
  isMuted: boolean;
  volume: number;
  isPaused: boolean;
  growthSpeed: number; // Pixels per second
  autoCyclePalette: boolean;
  onPaletteCycle: (newPalette: Palette) => void;
  topHookText?: string;
  comments?: {
    range0_25: string;
    range25_50: string;
    range50_75: string;
    range75_90: string;
    range90_99: string;
    range100: string;
  };
  resolutionScale?: number;
  levelNumber?: string;
  levelName?: string;
  levelFont?: string;
  onStatsChange: (stats: SimulationStats) => void;
}

export interface GrowingLoopCanvasRef {
  restart: () => void;
  triggerManualZoomOut: () => void;
  clearAllTiles: () => void;
}

// Polar particle representing broken pieces flying outwards
class PolarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;

  constructor(x: number, y: number, color: string, angle: number) {
    this.x = x;
    this.y = y;
    
    // Spread in a narrow radial cone outward
    const spreadAngle = angle + (Math.random() - 0.5) * 0.4;
    const speed = Math.random() * 6 + 3;

    this.vx = Math.cos(spreadAngle) * speed;
    this.vy = Math.sin(spreadAngle) * speed;
    this.color = color;
    this.size = Math.random() * 4 + 2;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.02 + 0.015;
    this.gravity = 0.05; // slight trailing descent
  }

  update(timeMultiplier: number = 1.0) {
    this.x += this.vx * timeMultiplier;
    this.y += this.vy * timeMultiplier;
    this.vy += this.gravity * timeMultiplier;
    this.vx *= Math.pow(0.97, timeMultiplier); // air resistance
    this.vy *= Math.pow(0.97, timeMultiplier);
    this.alpha -= this.decay * timeMultiplier;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const currentAlpha = Math.max(0, this.alpha);
    
    // Ambient glow
    ctx.globalAlpha = currentAlpha * 0.35;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Sharp solid core
    ctx.globalAlpha = currentAlpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Representing a single mosaic tile in polar (circular) space
class PolarTile {
  ringIndex: number;
  sectorIndex: number;
  rStart: number;
  rEnd: number;
  thetaStart: number;
  thetaEnd: number;
  color: string;
  active: boolean;
  centerX: number;
  centerY: number;

  constructor(
    ringIndex: number,
    sectorIndex: number,
    rStart: number,
    rEnd: number,
    thetaStart: number,
    thetaEnd: number,
    color: string
  ) {
    this.ringIndex = ringIndex;
    this.sectorIndex = sectorIndex;
    this.rStart = rStart;
    this.rEnd = rEnd;
    this.thetaStart = thetaStart;
    this.thetaEnd = thetaEnd;
    this.color = color;
    this.active = true;

    // Calculate approximate Cartesian center for particle spawning
    const rMid = (rStart + rEnd) / 2;
    const thetaMid = (thetaStart + thetaEnd) / 2;
    this.centerX = rMid * Math.cos(thetaMid);
    this.centerY = rMid * Math.sin(thetaMid);
  }

  // Draw the annular sector (mosaic tile)
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number = 1.0) {
    if (!this.active) return;

    const rS = this.rStart * scale;
    const rE = this.rEnd * scale;
    const tS = this.thetaStart;
    const tE = this.thetaEnd;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    // Draw sector path
    ctx.arc(cx, cy, rS, tS, tE, false);
    ctx.arc(cx, cy, rE, tE, tS, true);
    ctx.closePath();
    ctx.fill();

    // Dark grout gap border between mosaic tiles
    ctx.strokeStyle = 'rgba(7, 7, 10, 0.45)';
    ctx.lineWidth = Math.max(0.75, 1.2 * scale);
    ctx.stroke();
    ctx.restore();
  }
}

// Represents an entire system of rings and particles
interface SystemState {
  tiles: PolarTile[];
  particles: PolarParticle[];
  palette: Palette;
  ballRadius: number;
  totalTiles: number;
  clearedTiles: number;
}

export const GrowingLoopCanvas = forwardRef<GrowingLoopCanvasRef, GrowingLoopCanvasProps>(({
  palette,
  tileDensity,
  isMuted,
  volume,
  isPaused,
  growthSpeed,
  autoCyclePalette,
  onPaletteCycle,
  topHookText = "CAN WE REACH THE NEXT LOOP?",
  comments,
  resolutionScale = 1.0,
  levelNumber = "01",
  levelName = "MOSAIC LOOP",
  levelFont = "Outfit",
  onStatsChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Animation/Simulation frames
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const isScratchingRef = useRef<boolean>(false);
  const lastSoundTimeRef = useRef<number>(0);

  // Layout Constants (Matches 9:16 vertical shorts layout)
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const CENTER_X = 540; // Perfectly centered inside 1080 horizontal
  const CENTER_Y = 960; // Perfectly centered inside 1920 vertical
  
  // Outer circle and inner ball starts
  const INNER_START_RADIUS = 44; // Matches the starting ball size
  const OUTER_BOUNDARY_RADIUS = 440; // Size of the main circle
  const TRANSITION_DURATION = 1.4; // 1.4 seconds of zoom out animation

  // References to keep props in sync with canvas thread
  const propsRef = useRef({ palette, tileDensity, isMuted, volume, isPaused, growthSpeed, autoCyclePalette, onPaletteCycle });
  useEffect(() => {
    propsRef.current = { palette, tileDensity, isMuted, volume, isPaused, growthSpeed, autoCyclePalette, onPaletteCycle };
  }, [palette, tileDensity, isMuted, volume, isPaused, growthSpeed, autoCyclePalette, onPaletteCycle]);

  // Multiple systems state for looping zoom effect
  // currentSystem (System 0): currently expanding center ball / being cleared
  // nextSystem (System 1): next outer layer appearing outside during zoom transition
  const systemsRef = useRef<{
    current: SystemState;
    next: SystemState | null;
    transitionProgress: number; // 0 to 1
    state: 'GROWING' | 'ZOOMING';
    loopCount: number;
    impactCount: number;
    elapsedTime: number;
  }>({
    current: createSystem(palette, tileDensity, INNER_START_RADIUS, OUTER_BOUNDARY_RADIUS, CENTER_X, CENTER_Y),
    next: null,
    transitionProgress: 0,
    state: 'GROWING',
    loopCount: 1,
    impactCount: 0,
    elapsedTime: 0
  });

  // Helper to build a concentric polar mosaic tile list
  function createSystem(
    p: Palette,
    density: 'low' | 'medium' | 'high' | 'ultra',
    rMin: number,
    rMax: number,
    cx: number,
    cy: number
  ): SystemState {
    const tiles: PolarTile[] = [];
    
    // Choose ring counts based on density preset
    let ringCount = 8;
    if (density === 'low') ringCount = 5;
    else if (density === 'medium') ringCount = 8;
    else if (density === 'high') ringCount = 12;
    else if (density === 'ultra') ringCount = 18;

    const ringWidth = (rMax - rMin) / ringCount;

    for (let j = 0; j < ringCount; j++) {
      const rStart = rMin + j * ringWidth;
      const rEnd = rMin + (j + 1) * ringWidth;
      const rMid = (rStart + rEnd) / 2;

      // Approximate circumference to keep tile aspect ratio close to 1:1
      const circumference = 2 * Math.PI * rMid;
      const sectorCount = Math.max(6, Math.round(circumference / ringWidth));
      const dTheta = (2 * Math.PI) / sectorCount;

      for (let k = 0; k < sectorCount; k++) {
        const thetaStart = k * dTheta;
        const thetaEnd = (k + 1) * dTheta;
        const thetaMid = (thetaStart + thetaEnd) / 2;

        // Calculate absolute position relative to center for the palette mapper
        const px = rMid * Math.cos(thetaMid);
        const py = rMid * Math.sin(thetaMid);

        // Map palette color
        const color = getTileColorForPalette(p, px, py, rMax);

        tiles.push(new PolarTile(j, k, rStart, rEnd, thetaStart, thetaEnd, color));
      }
    }

    return {
      tiles,
      particles: [],
      palette: p,
      ballRadius: rMin,
      totalTiles: tiles.length,
      clearedTiles: 0
    };
  }

  // Get next palette when cycling is enabled
  function getNextPalette(currentP: Palette): Palette {
    // Import PALETTES dynamically or require it. Since it's imported in palettes.ts, let's find the index
    const { PALETTES } = require('../palettes');
    const idx = PALETTES.findIndex((p: Palette) => p.key === currentP.key);
    const nextIdx = (idx + 1) % PALETTES.length;
    return PALETTES[nextIdx];
  }

  // Expose control actions via ref
  useImperativeHandle(ref, () => ({
    restart() {
      const p = propsRef.current.palette;
      const d = propsRef.current.tileDensity;
      systemsRef.current = {
        current: createSystem(p, d, INNER_START_RADIUS, OUTER_BOUNDARY_RADIUS, CENTER_X, CENTER_Y),
        next: null,
        transitionProgress: 0,
        state: 'GROWING',
        loopCount: 1,
        impactCount: 0,
        elapsedTime: 0
      };
      audioSynth.playRebuildWave();
    },
    triggerManualZoomOut() {
      if (systemsRef.current.state === 'GROWING') {
        triggerZoomOut();
      }
    },
    clearAllTiles() {
      const state = systemsRef.current;
      if (state.state === 'GROWING') {
        state.current.tiles.forEach(t => {
          if (t.active) {
            t.active = false;
            state.current.clearedTiles++;
            state.impactCount++;
            for (let i = 0; i < 2; i++) {
              state.current.particles.push(new PolarParticle(CENTER_X + t.centerX, CENTER_Y + t.centerY, t.color, Math.atan2(t.centerY, t.centerX)));
            }
          }
        });
        audioSynth.playTntExplosion();
      }
    }
  }));

  // Trigger the looping zoom transition outward
  function triggerZoomOut() {
    const state = systemsRef.current;
    const currentP = state.current.palette;
    
    // Choose next palette: either auto-cycled or keeping the current selection
    let nextP = currentP;
    if (propsRef.current.autoCyclePalette) {
      nextP = getNextPalette(currentP);
      propsRef.current.onPaletteCycle(nextP);
    }

    // Initialize the next outer system (System 1)
    state.next = createSystem(
      nextP,
      propsRef.current.tileDensity,
      INNER_START_RADIUS,
      OUTER_BOUNDARY_RADIUS,
      CENTER_X,
      CENTER_Y
    );
    
    state.transitionProgress = 0;
    state.state = 'ZOOMING';

    // Play sound of massive swell booster
    audioSynth.playBooster(OUTER_BOUNDARY_RADIUS);
  }

  // Main high-performance render and update cycle
  useEffect(() => {
    const updateAndRender = (timestamp: number) => {
      if (!previousTimeRef.current) {
        previousTimeRef.current = timestamp;
      }
      const dt = (timestamp - previousTimeRef.current) / 1000;
      previousTimeRef.current = timestamp;

      // Handle Framerate throttling or pause
      const isPaused = propsRef.current.isPaused;
      const timeMultiplier = isPaused ? 0 : Math.min(2.5, dt * 60);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const state = systemsRef.current;

        // Synchronize volumes and mute state to the audio manager
        audioSynth.setMuted(propsRef.current.isMuted);
        audioSynth.setVolume(propsRef.current.volume);

        if (!isPaused) {
          state.elapsedTime += dt;

          // ----------------------------------------
          // 1. STATE MACHINE UPDATES
          // ----------------------------------------
          if (state.state === 'GROWING') {
            const currentSystem = state.current;
            
            // Smoothly grow the ball radius
            currentSystem.ballRadius += propsRef.current.growthSpeed * dt;

            // Check boundaries and break tiles
            let newlyShatteredCount = 0;
            const now = Date.now();

            currentSystem.tiles.forEach(tile => {
              if (tile.active && currentSystem.ballRadius >= tile.rStart) {
                tile.active = false;
                currentSystem.clearedTiles++;
                state.impactCount++;
                newlyShatteredCount++;

                // Spawn beautiful fireworks-like radial sparks
                const spawnX = CENTER_X + tile.centerX;
                const spawnY = CENTER_Y + tile.centerY;
                const radialAngle = Math.atan2(tile.centerY, tile.centerX);

                const sparkCount = propsRef.current.tileDensity === 'low' ? 5 : 3;
                for (let i = 0; i < sparkCount; i++) {
                  currentSystem.particles.push(
                    new PolarParticle(spawnX, spawnY, tile.color, radialAngle)
                  );
                }
              }
            });

            // Trigger granular satisfying ASMR sound with rate limiter to avoid ear fatigue
            if (newlyShatteredCount > 0) {
              if (now - lastSoundTimeRef.current > 18) {
                audioSynth.playScratch();
                lastSoundTimeRef.current = now;
              }
            }

            // Update particles
            currentSystem.particles.forEach(p => p.update(timeMultiplier));
            currentSystem.particles = currentSystem.particles.filter(p => p.alpha > 0);

            // Once the center ball grows to outer boundary size, trigger zoom!
            if (currentSystem.ballRadius >= OUTER_BOUNDARY_RADIUS) {
              triggerZoomOut();
            }

          } else if (state.state === 'ZOOMING' && state.next) {
            // Smoothly advance the zoom-out transition
            state.transitionProgress += (dt / TRANSITION_DURATION);

            // Update particles in both systems to preserve continuity
            state.current.particles.forEach(p => p.update(timeMultiplier));
            state.current.particles = state.current.particles.filter(p => p.alpha > 0);

            state.next.particles.forEach(p => p.update(timeMultiplier));
            state.next.particles = state.next.particles.filter(p => p.alpha > 0);

            if (state.transitionProgress >= 1.0) {
              // Transition complete! System 1 (next) becomes the new active System 0 (current)
              state.current = state.next;
              state.next = null;
              state.transitionProgress = 0;
              state.state = 'GROWING';
              state.loopCount++;

              // Play a lovely bell sound indicating a successful loop cycle
              audioSynth.playFinalClear();
            }
          }
        }

        // ----------------------------------------
        // 2. RENDERING PIPELINE
        // ----------------------------------------
        // High-contrast deep dark theme backdrop
        ctx.fillStyle = '#07070a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Add a very subtle, high-end organic radial gradient background to feel spacious
        const radialBg = ctx.createRadialGradient(CENTER_X, CENTER_Y, 100, CENTER_X, CENTER_Y, OUTER_BOUNDARY_RADIUS * 1.5);
        radialBg.addColorStop(0, '#0f0f18');
        radialBg.addColorStop(1, '#050508');
        ctx.fillStyle = radialBg;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw cosmic star points for ambient visual enrichment (Tech-Larp anti-pattern avoided, human artistic style)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 30; i++) {
          const sx = (Math.sin(i * 99.9) * 0.5 + 0.5) * CANVAS_WIDTH;
          const sy = (Math.cos(i * 33.3) * 0.5 + 0.5) * CANVAS_HEIGHT;
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Calculate seamless scaling factors for infinite loop zoom
        let s0 = 1.0;
        let s1 = 1.0;
        const k = OUTER_BOUNDARY_RADIUS / INNER_START_RADIUS; // Scale ratio, e.g., 440 / 44 = 10.0

        if (state.state === 'ZOOMING') {
          // Use a smooth sinusoidal ease-in-out curve for natural, satisfying camera inertia
          const ease = Math.sin(state.transitionProgress * Math.PI / 2);
          
          // System 0 shrinks down to INNER_START_RADIUS
          s0 = 1.0 - (1.0 - 1 / k) * ease;
          // System 1 shrinks from outward down to taking over the screen boundary
          s1 = k - (k - 1.0) * ease;
        }

        // --- DRAW SYSTEM 1 (Outer Ring System during Zoom) ---
        if (state.state === 'ZOOMING' && state.next) {
          ctx.save();
          // Render tiles of outer ring
          state.next.tiles.forEach(tile => tile.draw(ctx, CENTER_X, CENTER_Y, s1));
          
          // Render particles of outer ring
          state.next.particles.forEach(p => p.draw(ctx));
          ctx.restore();
        }

        // --- DRAW SYSTEM 0 (Current / Shrunken center system) ---
        ctx.save();
        
        // Draw the tiles of System 0
        state.current.tiles.forEach(tile => tile.draw(ctx, CENTER_X, CENTER_Y, s0));

        // Draw the center white ball
        // Since we scale the system manually by s0, drawing at ballRadius * s0 renders perfectly
        const screenBallRadius = state.state === 'ZOOMING'
          ? OUTER_BOUNDARY_RADIUS * s0
          : state.current.ballRadius;

        // Draw the glowing white ball
        ctx.save();
        ctx.shadowBlur = 45;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, Math.max(INNER_START_RADIUS, screenBallRadius), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw the particles of System 0
        state.current.particles.forEach(p => p.draw(ctx));
        
        ctx.restore();

        // Draw the boundary ring container
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, OUTER_BOUNDARY_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Draw thin subtle helper boundary of inner start radius to show standard
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, INNER_START_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // ----------------------------------------
        // 3. CAPTIONS & YOUTUBE SHORTS HEADERS
        // ----------------------------------------
        // Top Hook Text
        ctx.fillStyle = '#ffffff';
        ctx.font = `black 54px "${levelFont}", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillText(topHookText.toUpperCase(), CENTER_X, 220);

        // Bottom comments panel / Satisfaction indicator
        const curCleared = state.current.clearedTiles;
        const total = state.current.totalTiles;
        const ratio = total > 0 ? curCleared / total : 0;
        const percent = Math.floor(ratio * 100);

        let activeComment = comments?.range0_25 || "Mesmerizing... 😱";
        if (percent >= 100) activeComment = comments?.range100 || "PERFECT CALM! 🎉";
        else if (percent >= 90) activeComment = comments?.range90_99 || "INFINITE SATISFACTION!!! 🔥";
        else if (percent >= 75) activeComment = comments?.range75_90 || "Almost there... 👀";
        else if (percent >= 50) activeComment = comments?.range50_75 || "Crunching it down... ✨";
        else if (percent >= 25) activeComment = comments?.range25_50 || "So clean! ✨";

        // Draw level and loop indicators
        ctx.font = `bold 32px "${levelFont}", "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(`LEVEL ${levelNumber} • LOOP ${state.loopCount}`, CENTER_X, 1550);

        // Progress comment bar
        ctx.font = `900 48px "${levelFont}", "Inter", sans-serif`;
        ctx.fillStyle = palette.glowColor || '#ffffff';
        ctx.fillText(activeComment.toUpperCase(), CENTER_X, 1630);

        // Horizontal progress bar under the circle
        const barW = 600;
        const barH = 14;
        const barX = CENTER_X - barW / 2;
        const barY = 1680;

        // Background
        ctx.fillStyle = '#16161f';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 7);
        ctx.fill();

        // Filled progression
        ctx.fillStyle = palette.glowColor || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * Math.min(1.0, ratio), barH, 7);
        ctx.fill();

        // Draw percentage text
        ctx.font = `900 36px "${levelFont}", "Inter", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${percent}%`, CENTER_X, 1740);

        // ----------------------------------------
        // 4. METRIC CALLBACKS
        // ----------------------------------------
        onStatsChange({
          clearedPercent: percent,
          tilesRemaining: total - curCleared,
          totalTiles: total,
          fps: 60,
          phase: state.state === 'ZOOMING' ? 'extreme' : 'slow',
          elapsedTime: state.elapsedTime,
          speedMultiplier: propsRef.current.growthSpeed / 100,
          impactCount: state.impactCount
        });
      }

      requestRef.current = requestAnimationFrame(updateAndRender);
    };

    requestRef.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Support manual scratching/shattering inside the Polar Coordinate space
  const handleInteractiveScratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaledX = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const scaledY = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    const dx = scaledX - CENTER_X;
    const dy = scaledY - CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Scratching works in the Polar Mosaic boundary
    if (dist <= OUTER_BOUNDARY_RADIUS) {
      const state = systemsRef.current;
      const scratchBrushSize = 48; // thick ASMR brush

      // Map touch coord to System scale if zooming
      let localDist = dist;
      let s1 = 1.0;
      if (state.state === 'ZOOMING' && state.next) {
        // We're zooming, let's map scratching directly onto System 1's local coordinates
        const ease = Math.sin(state.transitionProgress * Math.PI / 2);
        const k = OUTER_BOUNDARY_RADIUS / INNER_START_RADIUS;
        s1 = k - (k - 1.0) * ease;
        localDist = dist / s1;
      }

      const checkSystem = state.state === 'ZOOMING' && state.next ? state.next : state.current;

      checkSystem.tiles.forEach(tile => {
        if (!tile.active) return;

        // Check if pointer radial coordinates overlap tile
        const tMidR = (tile.rStart + tile.rEnd) / 2;
        const tMidTheta = (tile.thetaStart + tile.thetaEnd) / 2;
        const tx = tMidR * Math.cos(tMidTheta);
        const ty = tMidR * Math.sin(tMidTheta);

        const screenTx = CENTER_X + tx * (state.state === 'ZOOMING' ? s1 : 1.0);
        const screenTy = CENTER_Y + ty * (state.state === 'ZOOMING' ? s1 : 1.0);

        const scratchDx = scaledX - screenTx;
        const scratchDy = scaledY - screenTy;

        if (scratchDx * scratchDx + scratchDy * scratchDy < scratchBrushSize * scratchBrushSize) {
          tile.active = false;
          checkSystem.clearedTiles++;
          state.impactCount++;
          audioSynth.playScratch();

          // Spawn particles
          for (let i = 0; i < 3; i++) {
            checkSystem.particles.push(
              new PolarParticle(screenTx, screenTy, tile.color, Math.atan2(ty, tx))
            );
          }
        }
      });
    }
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isScratchingRef.current = true;
    handleInteractiveScratch(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current) return;
    handleInteractiveScratch(e.clientX, e.clientY);
  };

  const stopScratching = () => {
    isScratchingRef.current = false;
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isScratchingRef.current = true;
    if (e.touches.length > 0) {
      handleInteractiveScratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current) return;
    if (e.touches.length > 0) {
      handleInteractiveScratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden select-none">
      <canvas
        id="shorts-canvas"
        ref={canvasRef}
        width={CANVAS_WIDTH * resolutionScale}
        height={CANVAS_HEIGHT * resolutionScale}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopScratching}
        onMouseLeave={stopScratching}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={stopScratching}
        className="w-full h-full object-contain cursor-crosshair shadow-2xl transition-all duration-300"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
});

GrowingLoopCanvas.displayName = 'GrowingLoopCanvas';
