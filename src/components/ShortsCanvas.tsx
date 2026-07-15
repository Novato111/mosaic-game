/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Palette, SimulationConfig, TimelinePhase, SimulationStats } from '../types';
import { getTileColorForPalette } from '../palettes';
import { audioSynth } from '../audio';

interface ShortsCanvasProps {
  palette: Palette;
  tileDensity: 'low' | 'medium' | 'high' | 'ultra';
  isMuted: boolean;
  volume: number;
  autoProgression: boolean;
  manualSpeedMultiplier: number;
  onStatsChange: (stats: SimulationStats) => void;
  selectedPhase: TimelinePhase | 'auto';
  onPhaseChange?: (phase: TimelinePhase) => void;
  boosterPower: number; // multiplier for booster velocity increase
  scratchRadiusFactor: number;
  isPaused: boolean;
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
  initialBallRadius?: number;
  growBallOnBooster?: boolean;
  ballGrowthAmount?: number;
  ballGrowthType?: 'additive' | 'multiplicative';
  ballGrowthMultiplier?: number;
  maxBallRadius?: number;
  startEmpty?: boolean;
}

export interface ShortsCanvasRef {
  restart: () => void;
  triggerManualBoost: () => void;
  clearAllTiles: () => void;
}

// Particle class for satisfying sparks
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;

  constructor(x: number, y: number, color: string, isBooster: boolean = false) {
    this.x = x;
    this.y = y;
    
    // Spread velocity in 360 degrees
    const angle = Math.random() * Math.PI * 2;
    const speed = isBooster 
      ? Math.random() * 8 + 6 
      : Math.random() * 4 + 2;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.size = isBooster ? Math.random() * 5 + 3 : Math.random() * 3 + 1.5;
    this.alpha = 1.0;
    this.decay = isBooster ? Math.random() * 0.02 + 0.015 : Math.random() * 0.04 + 0.025;
    this.gravity = 0.08; // slight falling effect
  }

  update(timeMultiplier: number = 1.0) {
    this.x += this.vx * timeMultiplier;
    this.y += this.vy * timeMultiplier;
    this.vy += this.gravity * timeMultiplier;
    this.vx *= Math.pow(0.98, timeMultiplier); // slight drag
    this.alpha -= this.decay * timeMultiplier;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const currentAlpha = Math.max(0, this.alpha);
    
    // Fast outer glow (semi-transparent filled circle)
    ctx.globalAlpha = currentAlpha * 0.3;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Sharp core particle
    ctx.globalAlpha = currentAlpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Tile representation
class Tile {
  x: number;
  y: number;
  size: number;
  color: string;
  active: boolean;
  row: number;
  col: number;
  appearScale: number = 1.0;
  isTNT?: boolean;
  fuseTimer?: number;
  isPrimed?: boolean;

  constructor(row: number, col: number, x: number, y: number, size: number, color: string) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.active = true;
  }

  draw(ctx: CanvasRenderingContext2D, isRebuilding: boolean = false) {
    if (!this.active && !isRebuilding) return;
    const currentScale = isRebuilding ? this.appearScale : 1.0;
    if (currentScale <= 0) return;

    let currentSize = this.size * currentScale;

    // Swell if primed TNT to build explosive tension
    if (this.isTNT && this.isPrimed && this.fuseTimer !== undefined) {
      const progress = 1.0 - this.fuseTimer; // 0 to 1
      const swell = 1.0 + Math.sin(progress * Math.PI * 8) * 0.16; // rapid pulse
      currentSize *= swell;
    }

    const rx = this.x - currentSize / 2;
    const ry = this.y - currentSize / 2;

    if (this.isTNT) {
      ctx.save();
      
      // Determine if we should flash white
      let isFlashingWhite = false;
      if (this.isPrimed && this.fuseTimer !== undefined) {
        // Flash frequency increases as fuse timer approaches zero
        const flashRate = this.fuseTimer < 0.3 ? 20 : 10;
        isFlashingWhite = Math.floor(this.fuseTimer * flashRate) % 2 === 0;
      }

      if (isFlashingWhite) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx + 0.5, ry + 0.5, currentSize - 1, currentSize - 1);
        
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, currentSize - 1, currentSize - 1);
      } else {
        // Draw red background
        ctx.fillStyle = '#cc1100'; // Minecraft red
        ctx.fillRect(rx + 0.5, ry + 0.5, currentSize - 1, currentSize - 1);

        // Draw white middle banner
        const bannerHeight = currentSize * 0.35;
        const bannerY = ry + (currentSize - bannerHeight) / 2;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(rx + 0.5, bannerY, currentSize - 1, bannerHeight);

        // Draw TNT text if big enough
        if (currentSize >= 12) {
          ctx.fillStyle = '#111111';
          ctx.font = `bold ${Math.floor(currentSize * 0.28)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText("TNT", this.x, ry + currentSize / 2 + 1);
        } else {
          // Just draw a dark spot for small tiles
          ctx.fillStyle = '#111111';
          ctx.fillRect(this.x - 1, ry + currentSize/2 - 1, 2, 2);
        }
        
        // Top and bottom dark red borders
        ctx.fillStyle = '#8c0b00';
        ctx.fillRect(rx + 0.5, ry + 0.5, currentSize - 1, currentSize * 0.12);
        ctx.fillRect(rx + 0.5, ry + currentSize - currentSize * 0.12 - 0.5, currentSize - 1, currentSize * 0.12);
      }

      ctx.restore();
      return;
    }

    ctx.fillStyle = this.color;
    // Draw tiles with a microscopic gap for grid feel, scaled nicely
    ctx.fillRect(this.x - currentSize / 2 + 0.5, this.y - currentSize / 2 + 0.5, currentSize - 1, currentSize - 1);
  }
}

// Trail position
interface TrailNode {
  x: number;
  y: number;
  radius: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export const ShortsCanvas = forwardRef<ShortsCanvasRef, ShortsCanvasProps>(({
  palette,
  tileDensity,
  isMuted,
  volume,
  autoProgression,
  manualSpeedMultiplier,
  onStatsChange,
  selectedPhase,
  onPhaseChange,
  boosterPower,
  scratchRadiusFactor,
  isPaused,
  topHookText,
  comments,
  resolutionScale = 1.0,
  levelNumber = "01",
  levelName = "NEON GRID",
  levelFont = "Outfit",
  initialBallRadius = 16,
  growBallOnBooster = false,
  ballGrowthAmount = 1.5,
  ballGrowthType = 'additive',
  ballGrowthMultiplier = 1.1,
  maxBallRadius = 50,
  startEmpty = true
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ topHookText, comments, levelNumber, levelName, levelFont });
  useEffect(() => {
    propsRef.current = { topHookText, comments, levelNumber, levelName, levelFont };
  });
  
  // Simulation Constants
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const CENTER_X = 480; // Centered within x = 60 to 900 safe zone
  const CENTER_Y = 920; // Centered within y = 480 to 1400 safe zone, shifted down/re-centered slightly
  const BOUNDARY_RADIUS = 430; // Increased size slightly to make the container a bit bigger

  // Simulation State Refs to avoid re-renders on rapid 60 FPS loops
  const stateRef = useRef({
    balls: [
      {
        id: Math.random(),
        type: 'white' as 'white' | 'mosaic',
        x: CENTER_X - 100,
        y: CENTER_Y - 50,
        vx: 4.5,
        vy: 6.0,
        radius: initialBallRadius,
        glowIntensity: 15,
        impactGlow: 0,
        trail: [] as TrailNode[],
        color: '#ffffff'
      }
    ],
    boosterPad: {
      angle: 0, // angular center position [0, 2PI]
      speed: 0.006, // speed of movement around the rim
      arcLength: 0.85, // radians, approx 49 degrees
      width: 22,
      flashIntensity: 0,
      color: palette.boosterColor
    },
    boosterPad1: {
      angle: 0, // angular center position [0, 2PI]
      speed: 0.006, // speed of movement around the rim
      arcLength: 0.85, // radians, approx 49 degrees
      width: 22,
      flashIntensity: 0,
      color: '#00e5ff' // Neon cyan/white
    },
    boosterPad2: {
      angle: Math.PI, // Start directly opposite!
      speed: 0.006, // speed of movement around the rim
      arcLength: 0.85, // radians, approx 49 degrees
      width: 22,
      flashIntensity: 0,
      color: '#ff007f' // Neon pink/magenta
    },
    tiles: [] as Tile[],
    particles: [] as Particle[],
    isGeneratingTiles: false,
    timelineSeconds: 0,
    phase: 'slow' as TimelinePhase,
    frameCount: 0,
    fps: 60,
    lastTime: performance.now(),
    impactCount: 0,
        screenShake: 0,
    manuallyScratchedPercent: 0,
    totalTilesCount: 0,
    currentCommentText: '',
    prevCommentText: '',
    commentAnimTime: 1.0,
    lastClearedPercent: 0,
    percentPulseTime: 1.0,
    rebuildAnim: {
      active: false,
      timer: 0,
      duration: 2.0
    }
  });

  // Track user interactive scratching
  const isScratchingRef = useRef(false);

  // Initialize Audio
  useEffect(() => {
    audioSynth.setMuted(isMuted);
    audioSynth.setVolume(volume);
  }, [isMuted, volume]);

  // Restart trigger
  const restart = () => {
    const state = stateRef.current;
    state.timelineSeconds = 0;
    
    // Determine the initial phase
    const initialPhase = autoProgression ? 'slow' : (selectedPhase || 'slow');
    state.phase = initialPhase;
    state.impactCount = 0;
    state.screenShake = 0;
    state.particles = [];
    state.rebuildAnim.active = false;
    state.rebuildAnim.timer = 0;
    
    // Smooth natural falling start from the upper portion
    const bx = CENTER_X + (Math.random() - 0.5) * 120;
    const by = CENTER_Y - 260; // Elevated start
    
    // Instantly set velocity matching target speed for a proper, crisp reset!
    let targetSpeed = 8;
    switch (initialPhase) {
      case 'slow':
        targetSpeed = 7 * manualSpeedMultiplier;
        break;
      case 'medium':
        targetSpeed = 13 * manualSpeedMultiplier;
        break;
      case 'fast':
        targetSpeed = 22 * manualSpeedMultiplier;
        break;
      case 'extreme':
        targetSpeed = 34 * manualSpeedMultiplier;
        break;
      case 'cleared':
        targetSpeed = 40 * manualSpeedMultiplier;
        break;
    }
    
    const angle = Math.PI / 4 + Math.random() * (Math.PI / 2); // downward arc [45deg, 135deg]
    const bvx = Math.cos(angle) * targetSpeed;
    const bvy = Math.sin(angle) * targetSpeed;

    state.balls = [{
      id: Math.random(),
      type: 'white' as 'white' | 'mosaic',
      x: bx,
      y: by,
      vx: bvx,
      vy: bvy,
      radius: initialBallRadius,
      glowIntensity: 15,
      impactGlow: 0,
      trail: [] as TrailNode[],
      color: '#ffffff'
    }];
    state.ball = state.balls[0];
    
    // Reset booster pads
    state.boosterPad1.angle = 0;
    state.boosterPad2.angle = Math.PI;
    state.boosterPad1.flashIntensity = 0;
    state.boosterPad2.flashIntensity = 0;
    
    generateTiles();
  };

  // Imperative actions for parent
  useImperativeHandle(ref, () => ({
    restart,
    triggerManualBoost: () => {
      triggerBoostEffect(true);
    },
    clearAllTiles: () => {
      // Deactivate all active tiles in an explosion of sparks
      const state = stateRef.current;
      let count = 0;
      state.tiles.forEach(tile => {
        if (tile.active) {
          tile.active = false;
          count++;
          if (count % 8 === 0) {
            state.particles.push(new Particle(tile.x, tile.y, tile.color, false));
          }
        }
      });
      audioSynth.playFinalClear();
    }
  }));

  // Re-generate tiles when density or palette changes
  const generateTiles = () => {
    const state = stateRef.current;
    
    // Determine grid spacing based on density - scaled proportionally (~13% down)
    let size = 14;
    if (tileDensity === 'low') size = 21;
    else if (tileDensity === 'medium') size = 14;
    else if (tileDensity === 'high') size = 9.5;
    else if (tileDensity === 'ultra') size = 6.5;

    const tiles: Tile[] = [];
    
    // Compute boundary bounding box
    const startX = CENTER_X - BOUNDARY_RADIUS;
    const endX = CENTER_X + BOUNDARY_RADIUS;
    const startY = CENTER_Y - BOUNDARY_RADIUS;
    const endY = CENTER_Y + BOUNDARY_RADIUS;

    let colIdx = 0;
    for (let x = startX + size/2; x < endX; x += size) {
      let rowIdx = 0;
      for (let y = startY + size/2; y < endY; y += size) {
        const dx = x - CENTER_X;
        const dy = y - CENTER_Y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Add tile if its bounding area is fully or mostly within the circle
        if (distToCenter + size/2 < BOUNDARY_RADIUS) {
          const color = getTileColorForPalette(palette, dx, dy, BOUNDARY_RADIUS);
          const t = new Tile(rowIdx, colIdx, x, y, size, color);
          if (startEmpty) {
            t.active = false;
          }
          tiles.push(t);
        }
        rowIdx++;
      }
      colIdx++;
    }

    if (palette.key === 'minecraft') {
      // Find tiles closest to our left-upper and left-lower TNT targets
      const target1 = { x: CENTER_X - 180, y: CENTER_Y - 80 };
      const target2 = { x: CENTER_X - 160, y: CENTER_Y + 140 };
      
      let closest1: Tile | null = null;
      let closest2: Tile | null = null;
      let minDist1 = Infinity;
      let minDist2 = Infinity;
      
      tiles.forEach(tile => {
        const d1 = Math.hypot(tile.x - target1.x, tile.y - target1.y);
        const d2 = Math.hypot(tile.x - target2.x, tile.y - target2.y);
        
        if (d1 < minDist1) {
          minDist1 = d1;
          closest1 = tile;
        }
        if (d2 < minDist2) {
          minDist2 = d2;
          closest2 = tile;
        }
      });
      
      if (closest1) (closest1 as Tile).isTNT = true;
      if (closest2) (closest2 as Tile).isTNT = true;
    }

    state.tiles = tiles;
    state.totalTilesCount = tiles.length;
  };

  // Restart and re-generate on density, palette, or startEmpty changes (proper reset)
  useEffect(() => {
    restart();
  }, [tileDensity, palette, startEmpty]);

  // Dynamically update ball radius when initial radius changes
  useEffect(() => {
    stateRef.current.balls.forEach(b => {
      b.radius = initialBallRadius;
    });
    stateRef.current.ball.radius = initialBallRadius;
  }, [initialBallRadius]);

  // Synchronously and instantly adjust ball speed when settings like progression engine, speed phase, or multiplier change
  useEffect(() => {
    const state = stateRef.current;
    
    if (!autoProgression && selectedPhase) {
      state.phase = selectedPhase;
      if (selectedPhase === 'cleared') {
        state.tiles.forEach(tile => { tile.active = false; });
      }
    }
    
    // Calculate target speed for current phase instantly
    let targetSpeed = 8;
    switch (state.phase) {
      case 'slow':
        targetSpeed = 7 * manualSpeedMultiplier;
        break;
      case 'medium':
        targetSpeed = 13 * manualSpeedMultiplier;
        break;
      case 'fast':
        targetSpeed = 22 * manualSpeedMultiplier;
        break;
      case 'extreme':
        targetSpeed = 34 * manualSpeedMultiplier;
        break;
      case 'cleared':
        targetSpeed = 40 * manualSpeedMultiplier;
        break;
    }

    // Adjust velocities for all active balls
    state.balls.forEach(ball => {
      const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (curSpeed > 0) {
        ball.vx = (ball.vx / curSpeed) * targetSpeed;
        ball.vy = (ball.vy / curSpeed) * targetSpeed;
      }
    });
  }, [manualSpeedMultiplier, autoProgression, selectedPhase]);

  // Trigger the booster kick for a single ball (including splitting into multiple balls)
  const triggerBoostEffectForBall = (ball: any, manual: boolean = false, nx?: number, ny?: number, boosterType?: 'booster1' | 'booster2') => {
    const state = stateRef.current;
    state.impactCount++;
    
    if (boosterType === 'booster1') {
      state.boosterPad1.flashIntensity = 0.5;
    } else if (boosterType === 'booster2') {
      state.boosterPad2.flashIntensity = 0.5;
    } else {
      state.boosterPad1.flashIntensity = 0.5;
      state.boosterPad2.flashIntensity = 0.5;
    }
    
    ball.impactGlow = 0.8;
    state.screenShake = manual ? 3.5 : 5.0; // subtle snap shake
    
    // Increase size when hitting booster pad if enabled
    if (growBallOnBooster) {
      if (ballGrowthType === 'multiplicative') {
        ball.radius = Math.min(maxBallRadius, ball.radius * ballGrowthMultiplier);
      } else {
        ball.radius = Math.min(maxBallRadius, ball.radius + ballGrowthAmount);
      }
    }

    // Play satisfying whoosh booster sound scaled dynamically to the ball's size
    audioSynth.playBooster(ball.radius);

    // Determine speed boost - moderate and satisfying instead of extreme
    let boostFactor = 1.15 * boosterPower;
    if (state.phase === 'extreme') boostFactor = 1.05 * boosterPower;

    const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const maxSpeed = state.phase === 'slow' ? 11 : state.phase === 'medium' ? 18 : state.phase === 'fast' ? 28 : 42;
    const newSpeed = Math.min(maxSpeed, curSpeed * boostFactor);

    if (curSpeed > 0) {
      if (nx !== undefined && ny !== undefined) {
        // Hitting the booster pad changes the ball's direction completely!
        const inwardAngle = Math.atan2(-ny, -nx);
        
        // Multiply: split and spawn another ball without any limit
        if (!manual) {
          const angle1 = inwardAngle - 0.22; // Slightly left
          const angle2 = inwardAngle + 0.22; // Slightly right
          
          ball.vx = Math.cos(angle1) * newSpeed;
          ball.vy = Math.sin(angle1) * newSpeed;

          // Determine the spawned ball type based on which booster we hit
          const spawnedType = boosterType === 'booster2' ? 'mosaic' : 'white';
          const spawnedColor = spawnedType === 'mosaic' 
            ? (palette.boosterColor || palette.glowColor || '#ff00aa') 
            : '#ffffff';

          const newBall = {
            id: Math.random(),
            type: spawnedType,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(angle2) * newSpeed,
            vy: Math.sin(angle2) * newSpeed,
            radius: ball.radius,
            glowIntensity: 15,
            impactGlow: 0.8,
            trail: [] as TrailNode[],
            color: spawnedColor
          };
          state.balls.push(newBall);
        } else {
          // Fallback to simple bounce with randomized spread of +/- 30 degrees
          const spreadAngle = (Math.random() - 0.5) * (Math.PI / 3);
          const finalAngle = inwardAngle + spreadAngle;
          ball.vx = Math.cos(finalAngle) * newSpeed;
          ball.vy = Math.sin(finalAngle) * newSpeed;
        }
      } else {
        ball.vx = (ball.vx / curSpeed) * newSpeed;
        ball.vy = (ball.vy / curSpeed) * newSpeed;
      }
    }
  };

  const triggerBoostEffect = (manual: boolean = false, nx?: number, ny?: number) => {
    const state = stateRef.current;
    if (manual) {
      state.balls.forEach(b => triggerBoostEffectForBall(b, true));
    }
  };

  // Core Simulation Step called at 60fps
  useEffect(() => {
    let animFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Reset lastTime to performance.now() immediately on setup/resume to prevent massive first-frame delta spikes
    stateRef.current.lastTime = performance.now();

    const updateAndRender = (timestamp?: number) => {
      const state = stateRef.current;
      const boosterPad = state.boosterPad;

      // Handle Framerate with stable timestamp
      const now = timestamp || performance.now();
      let rawDelta = now - state.lastTime;
      
      // Safety guard against negative or absurdly large frame-delta spikes
      if (rawDelta <= 0 || rawDelta > 1000) {
        rawDelta = 16.6667;
      }
      state.lastTime = now;

      state.frameCount++;
      if (state.frameCount % 20 === 0) {
        state.fps = Math.round(1000 / rawDelta);
      }

      // Smooth delta using a fast-adapting low-pass filter (EMA) to filter browser/encoding stutters
      const smoothingFactor = 0.15;
      if (!(state as any).prevDelta) {
        (state as any).prevDelta = rawDelta;
      } else {
        (state as any).prevDelta = (state as any).prevDelta * (1 - smoothingFactor) + rawDelta * smoothingFactor;
      }
      const smoothedDelta = (state as any).prevDelta;

      // Cap delta at 33.33ms (30fps equivalent) to guarantee physics stability and prevent clumped/lagging audio triggers
      const cappedDelta = Math.min(33.3333, smoothedDelta);

      // Compute time delta in seconds
      const dt = cappedDelta / 1000;

      // Calculate timeMultiplier relative to standard 60fps (16.67ms frame time)
      const baselineFrameTime = 16.6667;
      const timeMultiplier = Math.max(0.1, Math.min(2.0, cappedDelta / baselineFrameTime));

      // Advance overlay transition and pulse state timers
      if (state.commentAnimTime < 0.30) {
        state.commentAnimTime += dt;
      }
      if (state.percentPulseTime < 1.0) {
        state.percentPulseTime += dt;
      }

      // 1. PHASE PROGRESSION (Determined by the actual clearance level)
      // Count active tiles to determine clearance percentage
      let currentActiveCount = 0;
      for (let i = 0; i < state.tiles.length; i++) {
        if (state.tiles[i].active) {
          currentActiveCount++;
        }
      }

      // If we are rebuilding, force active count to 0 for stats display and HUD purposes
      const displayActiveCount = state.rebuildAnim.active ? 0 : currentActiveCount;

      const currentClearedCount = state.totalTilesCount - displayActiveCount;
      const currentClearedPercent = state.totalTilesCount > 0 
        ? (currentClearedCount / state.totalTilesCount) * 100
        : 0;

      let calculatedPhase: TimelinePhase = 'slow';

      if (!isPaused) {
        // Trigger rebuild when target is reached (100% cleared if not startEmpty, or 100% painted if startEmpty)
        const isTargetReached = startEmpty
          ? (displayActiveCount === state.totalTilesCount && state.totalTilesCount > 0)
          : (displayActiveCount === 0 && state.totalTilesCount > 0);

        if (isTargetReached && !state.rebuildAnim.active) {
          state.rebuildAnim.active = true;
          state.rebuildAnim.timer = 0;
          (state.rebuildAnim as any).hasPlayedSound = false;
          // Set ball radius to 15px immediately when freeze/rebuild phase starts
          state.balls.forEach(b => { b.radius = 15; });
        }

        if (state.rebuildAnim.active) {
          // Freeze state: increment rebuild timer
          state.rebuildAnim.timer += dt;
          const timer = state.rebuildAnim.timer;
          const duration = state.rebuildAnim.duration;

          if (timer >= duration) {
            // Rebuild complete: restore standard gameplay
            state.rebuildAnim.active = false;
            state.rebuildAnim.timer = 0;
            
            // Set tiles active state based on startEmpty mode
            state.tiles.forEach(tile => {
              tile.active = !startEmpty;
              tile.appearScale = startEmpty ? 0 : 1.0;
            });
            
            // Reset to a single ball
            state.balls = [{
              id: Math.random(),
              type: 'white' as 'white' | 'mosaic',
              x: CENTER_X + (Math.random() - 0.5) * 120,
              y: CENTER_Y - 260,
              vx: 0,
              vy: 0,
              radius: initialBallRadius,
              glowIntensity: 15,
              impactGlow: 0,
              trail: [] as TrailNode[],
              color: '#ffffff'
            }];
            state.ball = state.balls[0];
            const activeBall = state.balls[0];
            
            // Set ball trajectory downwards for the fresh start
            const angle = Math.PI / 4 + Math.random() * (Math.PI / 2);
            let targetSpeed = 7 * manualSpeedMultiplier;
            activeBall.vx = Math.cos(angle) * targetSpeed;
            activeBall.vy = Math.sin(angle) * targetSpeed;
          } else {
            // Keep balls and booster pad frozen
            // Freeze or slow down active particles
            state.particles.forEach(p => {
              p.vx *= 0.85;
              p.vy *= 0.85;
              p.update(timeMultiplier);
            });
            state.particles = state.particles.filter(p => p.alpha > 0);

            // Decays scaled by timeMultiplier
            state.boosterPad1.flashIntensity *= Math.pow(0.92, timeMultiplier);
            state.boosterPad2.flashIntensity *= Math.pow(0.92, timeMultiplier);
            state.balls.forEach(b => {
              b.impactGlow *= Math.pow(0.94, timeMultiplier);
            });
            state.screenShake *= Math.pow(0.9, timeMultiplier);

            // Animate tiles popping in starting from 0.5s (first 0.5s is a frozen pause)
            if (timer >= 0.5) {
              // Play rebuild wave sound exactly once when rebuilding begins
              if (!(state.rebuildAnim as any).hasPlayedSound) {
                (state.rebuildAnim as any).hasPlayedSound = true;
                audioSynth.playRebuildWave();
              }

              state.tiles.forEach(tile => {
                const dx = tile.x - CENTER_X;
                const dy = tile.y - CENTER_Y;
                const distToCenter = Math.sqrt(dx * dx + dy * dy);
                const dNorm = distToCenter / BOUNDARY_RADIUS;

                // wave propagation delay (radial sweep from center outward)
                const tileDelay = dNorm * 0.7; // up to 700ms delay at the rim
                const tileAnimT = (timer - 0.5 - tileDelay) / 0.6; // 600ms local spring-open duration

                if (tileAnimT <= 0) {
                  tile.active = startEmpty; // remains active if startEmpty, waiting to shrink
                  tile.appearScale = startEmpty ? 1.0 : 0;
                } else {
                  const clampedT = Math.min(1.0, tileAnimT);
                  if (startEmpty) {
                    tile.appearScale = 1.0 - easeOutBack(clampedT);
                    tile.active = tile.appearScale > 0.01;
                  } else {
                    tile.active = true;
                    tile.appearScale = easeOutBack(clampedT);
                  }
                }
              });
            } else {
              // First 0.5s: completely frozen pause in their starting state
              (state.rebuildAnim as any).hasPlayedSound = false;
              state.tiles.forEach(tile => {
                tile.active = startEmpty; // if startEmpty, they are active during pause; if not, they are inactive
                tile.appearScale = startEmpty ? 1.0 : 0;
              });
            }
          }
        } else {
          // Standard Gameplay Progression & Physics
          if (autoProgression) {
            state.timelineSeconds += dt;

            // Transition phases organically based on physical completeness
            if (currentActiveCount === 0) {
              calculatedPhase = 'cleared';
            } else if (currentClearedPercent >= 80) {
              calculatedPhase = 'extreme';
            } else if (currentClearedPercent >= 50) {
              calculatedPhase = 'fast';
            } else if (currentClearedPercent >= 20) {
              calculatedPhase = 'medium';
            } else {
              calculatedPhase = 'slow';
            }

            if (state.phase !== calculatedPhase) {
              state.phase = calculatedPhase;
              if (onPhaseChange) onPhaseChange(calculatedPhase);
            }
          } else {
            // Locked Phase Mode
            if (selectedPhase !== 'auto' && state.phase !== selectedPhase) {
              state.phase = selectedPhase;
              if (selectedPhase === 'cleared') {
                state.tiles.forEach(tile => { tile.active = false; });
              }
            }
          }

          // Adjust velocities & attributes based on Current Phase
          let targetSpeed = 8;
          switch (state.phase) {
            case 'slow':
              targetSpeed = 7 * manualSpeedMultiplier;
              break;
            case 'medium':
              targetSpeed = 13 * manualSpeedMultiplier;
              break;
            case 'fast':
              targetSpeed = 22 * manualSpeedMultiplier;
              break;
            case 'extreme':
              targetSpeed = 34 * manualSpeedMultiplier;
              break;
            case 'cleared':
              targetSpeed = 40 * manualSpeedMultiplier;
              break;
          }

          // Apply physics, movement, boundaries, and scratches for each active ball
          state.balls.forEach(ball => {
            const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

            // Apply smooth natural gravity to ball's downward velocity
            ball.vy += 0.12 * timeMultiplier;

            // Drag/Acceleration towards target speed if not boosted recently
            if (ballSpeed > 0) {
              if (ballSpeed > targetSpeed) {
                // decay speed back to target speed
                const drag = Math.pow(0.992, timeMultiplier);
                ball.vx *= drag;
                ball.vy *= drag;
              } else if (ballSpeed < targetSpeed - 1.0) {
                // push back to target speed
                const accel = Math.pow(1.006, timeMultiplier);
                ball.vx *= accel;
                ball.vy *= accel;
              }
            }

            // Apply sub-step physics to avoid passing through tiles or boundary at extreme speeds
            const physicsSubSteps = state.phase === 'extreme' || state.phase === 'cleared' ? 3 : 2;
            for (let step = 0; step < physicsSubSteps; step++) {
              // Move ball by fractional steps scaled by timeMultiplier
              ball.x += (ball.vx * timeMultiplier / physicsSubSteps);
              ball.y += (ball.vy * timeMultiplier / physicsSubSteps);

              // 2. COLLISION WITH OUTER CIRCLE BOUNDARY
              const dx = ball.x - CENTER_X;
              const dy = ball.y - CENTER_Y;
              const distFromCenter = Math.sqrt(dx * dx + dy * dy);

              if (distFromCenter + ball.radius >= BOUNDARY_RADIUS) {
                // Correct position
                const nx = dx / distFromCenter; // Outward unit normal
                const ny = dy / distFromCenter;
                ball.x = CENTER_X + nx * (BOUNDARY_RADIUS - ball.radius);
                ball.y = CENTER_Y + ny * (BOUNDARY_RADIUS - ball.radius);

                // Elastic bounce: reflect velocity vector with slight natural dampening
                const dot = ball.vx * nx + ball.vy * ny;
                const bounceFactor = 0.96;
                ball.vx = (ball.vx - 2 * dot * nx) * bounceFactor;
                ball.vy = (ball.vy - 2 * dot * ny) * bounceFactor;

                // Determine angle of collision relative to center
                let collisionAngle = Math.atan2(dy, dx);
                if (collisionAngle < 0) collisionAngle += Math.PI * 2;

                // Check if collision hit the booster pad 1 (White ball booster)
                let isBooster1Hit = false;
                const booster1HalfArc = state.boosterPad1.arcLength / 2;
                const b1Min = (state.boosterPad1.angle - booster1HalfArc + Math.PI * 2) % (Math.PI * 2);
                const b1Max = (state.boosterPad1.angle + booster1HalfArc + Math.PI * 2) % (Math.PI * 2);

                if (b1Min < b1Max) {
                  isBooster1Hit = collisionAngle >= b1Min && collisionAngle <= b1Max;
                } else {
                  isBooster1Hit = collisionAngle >= b1Min || collisionAngle <= b1Max;
                }

                // Check if collision hit the booster pad 2 (Mosaic ball booster)
                let isBooster2Hit = false;
                const booster2HalfArc = state.boosterPad2.arcLength / 2;
                const b2Min = (state.boosterPad2.angle - booster2HalfArc + Math.PI * 2) % (Math.PI * 2);
                const b2Max = (state.boosterPad2.angle + booster2HalfArc + Math.PI * 2) % (Math.PI * 2);

                if (b2Min < b2Max) {
                  isBooster2Hit = collisionAngle >= b2Min && collisionAngle <= b2Max;
                } else {
                  isBooster2Hit = collisionAngle >= b2Min || collisionAngle <= b2Max;
                }

                if (isBooster1Hit) {
                  triggerBoostEffectForBall(ball, false, nx, ny, 'booster1');
                } else if (isBooster2Hit) {
                  triggerBoostEffectForBall(ball, false, nx, ny, 'booster2');
                } else {
                  // Standard wall collision: much more subtle vibration cap
                  state.screenShake = Math.min(3.2, ballSpeed / 12);
                  ball.impactGlow = 0.6;
                  // Play physical pitch based on current ball velocity with 3D stereo panning
                  const pitch = 0.7 + (ballSpeed / 30);
                  audioSynth.playBounce(pitch, ball.x);
                }
              }
            }

            // 3. MOSAIC TILE SCRATCH OR REGENERATE MECHANIC
            const scratchRadius = ball.radius * scratchRadiusFactor;
            
            if (ball.type === 'mosaic') {
              // Regenerate tiles under its tail/position!
              for (let i = 0; i < state.tiles.length; i++) {
                const tile = state.tiles[i];
                if (tile.active) continue; // Only process inactive tiles

                // Distance check
                const tdx = ball.x - tile.x;
                const tdy = ball.y - tile.y;
                const tileDistSq = tdx * tdx + tdy * tdy;

                if (tileDistSq < scratchRadius * scratchRadius) {
                  tile.active = true;
                  tile.appearScale = 1.0;
                  
                  // Spark effects
                  const sparkColors = [tile.color, palette.boosterColor || '#ff00aa', '#ffffff', palette.glowColor || '#00ffff'];
                  for (let s = 0; s < 2; s++) {
                    const rc = sparkColors[Math.floor(Math.random() * sparkColors.length)];
                    state.particles.push(new Particle(tile.x, tile.y, rc, false));
                  }

                  // Sound feedback
                  audioSynth.playScratch();
                }
              }
            } else {
              // Standard ball: scratch and destroy tiles
              for (let i = 0; i < state.tiles.length; i++) {
                const tile = state.tiles[i];
                if (!tile.active) continue;

                // Quick distance check
                const tdx = ball.x - tile.x;
                const tdy = ball.y - tile.y;
                const tileDistSq = tdx * tdx + tdy * tdy;

                if (tileDistSq < scratchRadius * scratchRadius) {
                  if (tile.isTNT) {
                    if (!tile.isPrimed) {
                      tile.isPrimed = true;
                      tile.fuseTimer = 1.0; // 1 second fuse
                      audioSynth.playTntFuse();
                    }
                  } else {
                    tile.active = false;
                    
                    // Generate ASMR scrape spark particles
                    const sparkCount = state.phase === 'slow' ? 2 : state.phase === 'medium' ? 3 : 5;
                    for (let s = 0; s < sparkCount; s++) {
                      state.particles.push(new Particle(tile.x, tile.y, tile.color, false));
                    }

                    // Play granular click sound
                    audioSynth.playScratch();
                  }
                }
              }
            }

            // 4. MOTION TRAIL MANAGEMENT
            ball.trail.push({ x: ball.x, y: ball.y, radius: ball.radius });
            
            // Dynamic trail length based on velocity: extremely short and minimal
            const targetTrailLength = Math.min(8, Math.floor(3 + ballSpeed * 0.12));
            while (ball.trail.length > targetTrailLength) {
              ball.trail.shift();
            }
          });

          // Update TNT Fuses (once per frame, not per ball)
          state.tiles.forEach(tile => {
            if (tile.isTNT && tile.isPrimed && tile.active) {
              tile.fuseTimer = (tile.fuseTimer || 1.0) - dt;
              if (tile.fuseTimer <= 0) {
                tile.active = false;
                tile.isPrimed = false;
                
                // Explode surrounding tiles!
                const explodeRadius = 150;
                state.tiles.forEach(otherTile => {
                  if (otherTile.active && otherTile !== tile) {
                    const dx = otherTile.x - tile.x;
                    const dy = otherTile.y - tile.y;
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist < explodeRadius) {
                      otherTile.active = false;
                      
                      // Chain reaction!
                      if (otherTile.isTNT && !otherTile.isPrimed) {
                        otherTile.isPrimed = true;
                        otherTile.fuseTimer = 0.15 + Math.random() * 0.15;
                        audioSynth.playTntFuse();
                      } else {
                        // Standard tile destruction particles
                        const pCount = Math.random() < 0.5 ? 1 : 2;
                        for (let p = 0; p < pCount; p++) {
                          const particle = new Particle(otherTile.x, otherTile.y, otherTile.color, false);
                          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
                          const speed = Math.random() * 6 + 2;
                          particle.vx = Math.cos(angle) * speed;
                          particle.vy = Math.sin(angle) * speed;
                          state.particles.push(particle);
                        }
                      }
                    }
                  }
                });
                
                // Play awesome synthesized explosion sound!
                audioSynth.playTntExplosion();
                
                // Generate massive fire explosion particles
                const fieryColors = ['#ff2a00', '#ff7700', '#ffaa00', '#ffff00', '#666666', '#333333', '#dddddd'];
                for (let j = 0; j < 45; j++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 14 + 3;
                  const color = fieryColors[Math.floor(Math.random() * fieryColors.length)];
                  const p = new Particle(tile.x, tile.y, color, false);
                  p.vx = Math.cos(angle) * speed;
                  p.vy = Math.sin(angle) * speed;
                  p.size = Math.random() * 7 + 4;
                  state.particles.push(p);
                }
                
                // Major screen shake
                state.screenShake = Math.max(state.screenShake, 24);
              }
            }
          });
        }

        // Update booster pad angle (rotate slowly around the rim)
        const boosterSpeed = (state.phase === 'slow' ? 0.004 : state.phase === 'medium' ? 0.007 : state.phase === 'fast' ? 0.012 : 0.018) * timeMultiplier;
        state.boosterPad1.angle = (state.boosterPad1.angle + boosterSpeed) % (Math.PI * 2);
        state.boosterPad2.angle = (state.boosterPad1.angle + Math.PI) % (Math.PI * 2); // Directly opposite!

        // Decays scaled by timeMultiplier
        state.boosterPad1.flashIntensity *= Math.pow(0.92, timeMultiplier);
        state.boosterPad2.flashIntensity *= Math.pow(0.92, timeMultiplier);
        state.balls.forEach(b => {
          b.impactGlow *= Math.pow(0.94, timeMultiplier);
        });
        state.screenShake *= Math.pow(0.78, timeMultiplier); // Decays faster, snap-to-settle

        // Update active particles with timeMultiplier
        state.particles.forEach(p => p.update(timeMultiplier));
        state.particles = state.particles.filter(p => p.alpha > 0);
      }

      // 5. RENDERING PIPELINE (High-fidelity, layered drawing)
      ctx.save();
      ctx.scale(resolutionScale, resolutionScale);
      
      // Pure black canvas clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Apply screen shake
      if (state.screenShake > 0.5) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
      }

      // Subtle atmospheric zoom as more tiles get cleared (97% to 100%)
      const zoomRatio = autoProgression 
        ? 0.97 + (currentClearedPercent / 100) * 0.03 
        : 0.985;
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.scale(zoomRatio, zoomRatio);
      ctx.translate(-CENTER_X, -CENTER_Y);

      // Layer 1: Tile Grid (Revealed / Unscratched)
      // Drawn as sharp grid squares inside the boundary
      let activeCount = 0;
      for (let i = 0; i < state.tiles.length; i++) {
        const tile = state.tiles[i];
        if (tile.active) {
          activeCount++;
        }
        // Only draw tiles here during active gameplay.
        // During rebuild, they are drawn at the end (on top of the ball) so they cover it.
        if (!state.rebuildAnim.active && tile.active) {
          tile.draw(ctx, false);
        }
      }

      // Stats Reporting
      const displayActiveCountHUD = state.rebuildAnim.active ? 0 : activeCount;
      const clearedCount = state.totalTilesCount - displayActiveCountHUD;
      
      let clearedPercent = 0;
      let displayPercentStr = "0%";
      if (state.totalTilesCount > 0) {
        const rawPct = (clearedCount / state.totalTilesCount) * 100;
        if (displayActiveCountHUD === 0) {
          clearedPercent = 100;
          displayPercentStr = "100%";
        } else {
          // Guarantee that it never shows 100% while active tiles still exist
          clearedPercent = Math.min(99.99, rawPct);
          if (clearedPercent >= 99.00) {
            displayPercentStr = clearedPercent.toFixed(2) + "%";
          } else {
            displayPercentStr = clearedPercent.toFixed(1) + "%";
          }
        }
      }

      // Detect comment text changes and percentage pulses for HUD rendering
      const commentsProp = propsRef.current.comments || {
        range0_25: "Wait for the end! 😱",
        range25_50: "Looking good! 😉",
        range50_75: "Keep watching... 👀",
        range75_90: "So close! 😱",
        range90_99: "ALMOST FINISHED!!! 🔥",
        range100: "PERFECT CALM! 🎉"
      };

      let expectedCommentText = "";
      if (displayActiveCountHUD > 0) {
        if (clearedPercent < 25) expectedCommentText = commentsProp.range0_25;
        else if (clearedPercent < 50) expectedCommentText = commentsProp.range25_50;
        else if (clearedPercent < 75) expectedCommentText = commentsProp.range50_75;
        else if (clearedPercent < 90) expectedCommentText = commentsProp.range75_90;
        else expectedCommentText = commentsProp.range90_99;
      } else {
        expectedCommentText = commentsProp.range100;
      }

      if (state.currentCommentText !== expectedCommentText) {
        state.prevCommentText = state.currentCommentText;
        state.currentCommentText = expectedCommentText;
        state.commentAnimTime = 0.0; // trigger transition
      }

      // Check if integer percentage has changed to pulse HUD
      const currentPctInteger = Math.floor(clearedPercent);
      if (currentPctInteger !== state.lastClearedPercent) {
        state.lastClearedPercent = currentPctInteger;
        state.percentPulseTime = 0.0; // trigger pulse scale
      }

      // Layer 2: Circle Boundary Rim (White clean outline)
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Layer 3: Two Rotating Booster Pads inside the rim
      
      // Pad 1: White Ball Booster
      ctx.save();
      const pad1Color = palette.boosterColor || '#00e5ff';
      const pad1Angle = state.boosterPad1.angle;
      const pad1Arc = state.boosterPad1.arcLength;
      const flash1 = state.boosterPad1.flashIntensity;

      // 1. Deep Neon Ambient Aura (Layer 1)
      ctx.strokeStyle = pad1Color;
      ctx.lineWidth = 26 + (flash1 * 16);
      ctx.shadowBlur = 15 + (flash1 * 25);
      ctx.shadowColor = pad1Color;
      ctx.globalAlpha = 0.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad1Angle - pad1Arc / 2, pad1Angle + pad1Arc / 2);
      ctx.stroke();

      // 2. Bright Mid-Track (Layer 2)
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 14 + (flash1 * 8);
      ctx.shadowBlur = 0; // reset shadow for performance
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad1Angle - pad1Arc / 2, pad1Angle + pad1Arc / 2);
      ctx.stroke();

      // 3. Hot White Core Line (Layer 3)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 + (flash1 * 2);
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad1Angle - pad1Arc / 2, pad1Angle + pad1Arc / 2);
      ctx.stroke();

      // 4. Futuristic Flowing Energy Dash (Layer 4)
      ctx.strokeStyle = pad1Color;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -performance.now() * 0.05; // flowing motion
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 22, pad1Angle - pad1Arc / 2, pad1Angle + pad1Arc / 2);
      ctx.stroke();
      ctx.restore();

      // Pad 2: Mosaic Ball Booster
      ctx.save();
      // Contrast color for Pad 2: use glowColor if boosterColor is already used, or one of the palette colors, otherwise neon pink
      const pad2Color = (palette.glowColor && palette.glowColor !== palette.boosterColor) 
        ? palette.glowColor 
        : (palette.colors && palette.colors[0] && palette.colors[0] !== palette.boosterColor)
          ? palette.colors[0]
          : '#ff00aa';
      
      const pad2Angle = state.boosterPad2.angle;
      const pad2Arc = state.boosterPad2.arcLength;
      const flash2 = state.boosterPad2.flashIntensity;

      // 1. Deep Neon Ambient Aura (Layer 1)
      ctx.strokeStyle = pad2Color;
      ctx.lineWidth = 26 + (flash2 * 16);
      ctx.shadowBlur = 15 + (flash2 * 25);
      ctx.shadowColor = pad2Color;
      ctx.globalAlpha = 0.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad2Angle - pad2Arc / 2, pad2Angle + pad2Arc / 2);
      ctx.stroke();

      // 2. Bright Mid-Track (Layer 2)
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 14 + (flash2 * 8);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad2Angle - pad2Arc / 2, pad2Angle + pad2Arc / 2);
      ctx.stroke();

      // 3. Hot White Core Line (Layer 3)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 + (flash2 * 2);
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 9, pad2Angle - pad2Arc / 2, pad2Angle + pad2Arc / 2);
      ctx.stroke();

      // 4. Futuristic Flowing Energy Dash (Layer 4)
      ctx.strokeStyle = pad2Color;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -performance.now() * 0.05; // flowing motion
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS - 22, pad2Angle - pad2Arc / 2, pad2Angle + pad2Arc / 2);
      ctx.stroke();
      ctx.restore();

      // Layer 4: Particle sparks (bloom and trail)
      state.particles.forEach(p => p.draw(ctx));

      // Layer 5: Ball Motion Trail (Smooth continuous glowing ribbon and sub-point interpolation)
      if (!state.rebuildAnim.active) {
        state.balls.forEach(ball => {
          ctx.save();
          const trailLen = ball.trail.length;
          if (trailLen > 1) {
            // Draw continuous, overlapping circles between each past point in the trail to eliminate high-speed gaps
            for (let i = 0; i < trailLen - 1; i++) {
              const p1 = ball.trail[i];
              const p2 = ball.trail[i + 1];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Determine how many steps we need so there's an overlapping circle every 2-3 pixels
              const stepSize = Math.max(3, p1.radius * 0.15);
              const steps = Math.max(1, Math.ceil(dist / stepSize));
              
              for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const x = p1.x + dx * t;
                const y = p1.y + dy * t;
                
                // Interpolate fractional index ratio
                const idxRatio = (i + t) / trailLen;
                
                // Extremely faint trail using ball color (or white)
                const opacity = idxRatio * 0.12;
                ctx.globalAlpha = opacity;
                if (ball.type === 'mosaic') {
                  const hue = (performance.now() / 12 + idxRatio * 180) % 360;
                  ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
                } else {
                  ctx.fillStyle = ball.color || '#ffffff';
                }
                
                // Tapered size: tapers down to 10% at the tail, up to 90% at the front
                const currentSize = p1.radius * (0.10 + idxRatio * 0.80);
                ctx.beginPath();
                ctx.arc(x, y, currentSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          ctx.restore();
        });
      }

      // Layer 6: Main Beautiful Balls (with speed-based stretch motion-blur capsule)
      if (!state.rebuildAnim.active) {
        state.balls.forEach(ball => {
          ctx.save();
          ctx.shadowBlur = 0;
          
          const scaleRad = ball.radius * (1.0 + ball.impactGlow * 0.12);
          const speedThreshold = 10;
          const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

          // Build path for the ball
          ctx.beginPath();
          if (ballSpeed > speedThreshold) {
            // High speed stretch: draw as a beautiful capsule along the velocity vector
            const stretchFactor = Math.min(0.4, (ballSpeed - speedThreshold) * 0.01); // subtle capped stretch
            const dx = (ball.vx / ballSpeed) * scaleRad * stretchFactor;
            const dy = (ball.vy / ballSpeed) * scaleRad * stretchFactor;
            
            ctx.arc(ball.x - dx, ball.y - dy, scaleRad, 0, Math.PI * 2);
            ctx.arc(ball.x, ball.y, scaleRad, 0, Math.PI * 2);
          } else {
            // Standard circle
            ctx.arc(ball.x, ball.y, scaleRad, 0, Math.PI * 2);
          }

          if (ball.type === 'mosaic') {
            ctx.save();
            ctx.clip(); // Clip everything to the ball path!

            // Fill a black base first
            ctx.fillStyle = '#000000';
            ctx.fillRect(ball.x - scaleRad, ball.y - scaleRad, scaleRad * 2, scaleRad * 2);

             // Draw a grid of 4x4 colorful mosaic cells inside the ball
             const gridSize = 4;
             const cellSize = (scaleRad * 2) / gridSize;
             const offsetTime = performance.now() / 240; // rotate colors
             
             // Get colors from current palette
             const colors = palette.colors.length >= 3 
               ? palette.colors 
               : [...palette.colors, '#ffffff', '#111111'];

             for (let r = 0; r < gridSize; r++) {
               for (let c = 0; c < gridSize; c++) {
                 const colorIndex = (r * gridSize + c + Math.floor(offsetTime)) % colors.length;
                 ctx.fillStyle = colors[colorIndex];
                 
                 const cx = ball.x - scaleRad + c * cellSize;
                 const cy = ball.y - scaleRad + r * cellSize;
                 ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
               }
             }
             ctx.restore();
 
             // Draw a matching themed border around the mosaic ball
             ctx.strokeStyle = palette.boosterColor || palette.glowColor || '#ff00aa';
             ctx.lineWidth = 3;
             ctx.stroke();
          } else {
            ctx.fillStyle = ball.color || '#ffffff';
            ctx.fill();
          }
          ctx.restore();
        });
      }

      // Draw tiles on top of the ball during rebuild so they cover/hide it
      if (state.rebuildAnim.active) {
        for (let i = 0; i < state.tiles.length; i++) {
          const tile = state.tiles[i];
          tile.draw(ctx, true);
        }
      }

      ctx.restore(); // end of translate, zoom, and shake

      // Draw HUD overlays (Level, Top Hook, % Number, Bottom Reaction Comment)
      // These are drawn on top of the game canvas without shaking/zooming
      ctx.save();
      ctx.scale(resolutionScale, resolutionScale);

      const themeColor = palette.boosterColor || '#00ffcc';

      // 0. Render Level Number and Level Name elegantly (Y = 220-250)
      if (propsRef.current.levelNumber || propsRef.current.levelName) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = themeColor;
        
        const lvlNum = (propsRef.current.levelNumber || "01").trim();
        const lvlName = (propsRef.current.levelName || "NEON GRID").trim().toUpperCase();
        
        const activeFont = propsRef.current.levelFont || "Outfit";
        let fontStyle = '700 24px "Outfit", sans-serif';
        
        if (activeFont === 'Press Start 2P') {
          fontStyle = '400 13px "Press Start 2P", monospace';
        } else if (activeFont === 'Rubik Mono One') {
          fontStyle = '900 15px "Rubik Mono One", sans-serif';
        } else if (activeFont === 'Bungee') {
          fontStyle = '400 22px "Bungee", sans-serif';
        } else if (activeFont === 'Syncopate') {
          fontStyle = '700 16px "Syncopate", sans-serif';
        } else if (activeFont === 'Bebas Neue') {
          fontStyle = '700 28px "Bebas Neue", sans-serif';
        } else if (activeFont === 'Orbitron') {
          fontStyle = '700 20px "Orbitron", sans-serif';
        } else if (activeFont === 'Russo One') {
          fontStyle = '400 22px "Russo One", sans-serif';
        } else if (activeFont === 'Anton') {
          fontStyle = '400 26px "Anton", sans-serif';
        } else if (activeFont === 'Permanent Marker') {
          fontStyle = '400 24px "Permanent Marker", cursive';
        } else {
          fontStyle = `700 24px "${activeFont}", sans-serif`;
        }
        ctx.font = fontStyle;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        
        // Add elegant extra spacing to letters
        const formatSpaced = (str: string) => {
          if (activeFont === 'Syncopate' || activeFont === 'Press Start 2P') return str;
          return str.split('').join(' ');
        };
        const spacedText = activeFont === 'Press Start 2P'
          ? `LVL ${lvlNum}  ${lvlName}`
          : `L E V E L  ${lvlNum}     ${formatSpaced(lvlName)}`;
        
        ctx.fillText(spacedText, CENTER_X, 230);
        ctx.restore();
      }

      // 1. Render Top Hook Text (Y = 280–360, midpoint: 320)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      
      const timeSec = Date.now() / 1000;
      // Smooth breathing cycle (1.0s expanding, 1.0s contracting)
      const breatheScale = 1.0 + Math.sin(timeSec * Math.PI * 1.0) * 0.045; 
      const breatheGlow = 10 + Math.sin(timeSec * Math.PI * 1.0) * 4;       // Glowing breathing shadow rhythm
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = breatheGlow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      
      const topText = (propsRef.current.topHookText || "CAN IT HIT 100%?").toUpperCase();
      const lines = topText.split('\n');
      const maxHookWidth = 780;
      
      let fontName = '"Bebas Neue", sans-serif';
      let hookFontSize = 52;
      let fontWeight = '900';
      
      if (palette.key === 'minecraft') {
        fontName = '"Press Start 2P", monospace';
        hookFontSize = 22; // fits nicely inside the outlined box
        fontWeight = '400';
      }
      
      ctx.font = `${fontWeight} ${hookFontSize}px ${fontName}`;
      
      // Determine width of the longest line to calculate layout scale
      const getLongestLineWidth = () => {
        let maxW = 0;
        lines.forEach(line => {
          const w = ctx.measureText(line.trim()).width;
          if (w > maxW) maxW = w;
        });
        return maxW;
      };

      let measuredHook = getLongestLineWidth();
      while (measuredHook > maxHookWidth && hookFontSize > 14) {
        hookFontSize -= 2;
        ctx.font = `${fontWeight} ${hookFontSize}px ${fontName}`;
        measuredHook = getLongestLineWidth();
      }
      
      // Translate to center of hook text, apply breathing scale, and draw
      ctx.translate(CENTER_X, 320);
      ctx.scale(breatheScale, breatheScale);
      
      if (palette.key === 'minecraft') {
        // Draw Minecraft-style outlined box!
        const iconSize = 36;
        const spacing = 16;
        const totalContentWidth = iconSize + spacing + measuredHook;
        const boxWidth = totalContentWidth + 60; // 30px padding on each side
        
        // Multi-line height adjustment for box
        const numLines = lines.length;
        const textLineHeight = hookFontSize * 1.35;
        const boxHeight = Math.max(76, numLines * textLineHeight + 40);
        
        ctx.save();
        ctx.shadowBlur = 0; // standard flat minecraft style
        
        // Background: Solid dark gray/black
        ctx.fillStyle = '#000000';
        ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        
        // Border: 4px thickness with #5db332 (grass green)
        ctx.strokeStyle = '#5db332';
        ctx.lineWidth = 4;
        ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        
        // Draw the pixel grass block icon at the left inside
        const startX = -totalContentWidth / 2;
        const iconY = -iconSize / 2;
        const pS = iconSize / 8;
        
        // Draw pixelated grass block
        ctx.fillStyle = '#866043'; // dirt
        ctx.fillRect(startX, iconY, iconSize, iconSize);
        
        // Dark spots in dirt
        ctx.fillStyle = '#573d26';
        ctx.fillRect(startX + pS, iconY + pS * 3, pS, pS);
        ctx.fillRect(startX + pS * 5, iconY + pS * 2, pS, pS);
        ctx.fillRect(startX + pS * 3, iconY + pS * 5, pS, pS);
        ctx.fillRect(startX + pS * 6, iconY + pS * 6, pS, pS);

        // Grass cap (top 3 rows)
        ctx.fillStyle = '#5db332';
        ctx.fillRect(startX, iconY, iconSize, pS * 3);
        
        // Jagged grass drops
        ctx.fillRect(startX, iconY + pS * 3, pS, pS);
        ctx.fillRect(startX + pS * 2, iconY + pS * 3, pS, pS * 2);
        ctx.fillRect(startX + pS * 4, iconY + pS * 3, pS, pS);
        ctx.fillRect(startX + pS * 6, iconY + pS * 3, pS, pS * 2);

        // Dark green accents
        ctx.fillStyle = '#4c781c';
        ctx.fillRect(startX + pS, iconY, pS, pS);
        ctx.fillRect(startX + pS * 3, iconY + pS, pS, pS);
        ctx.fillRect(startX + pS * 5, iconY + pS * 2, pS, pS);
        ctx.fillRect(startX + pS * 7, iconY + pS, pS, pS);

        // Draw the text to the right of the icon, centering lines vertically
        ctx.fillStyle = '#55ff55'; // Vibrant Minecraft green text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const startY = -((numLines - 1) * textLineHeight) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line.trim(), startX + iconSize + spacing, startY + idx * textLineHeight);
        });
        
        ctx.restore();
      } else {
        const lineHeight = hookFontSize * 1.15;
        const startY = -((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line.trim(), 0, startY + idx * lineHeight);
        });
      }
      
      ctx.restore();

      // 2. Render Animated Percentage Progress below top bold hook (Y = 405–445)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const pulseT = Math.min(1.0, state.percentPulseTime);
      const scaleVal = 0.95 + 0.05 * (pulseT * (2 - pulseT)); // easeOutQuad
      
      if (palette.key === 'minecraft') {
        // Minecraft-themed XP Display!
        ctx.save();
        
        // Render XP level number (display percent string)
        ctx.font = '400 24px "Press Start 2P", monospace';
        
        ctx.save();
        ctx.translate(CENTER_X, 405);
        ctx.scale(scaleVal, scaleVal);
        
        // Classic Minecraft 2px black text outline/shadow
        ctx.fillStyle = '#111111';
        ctx.fillText(displayPercentStr, 2, 2);
        
        // Vibrant light-green XP color
        ctx.fillStyle = '#55ff55';
        ctx.fillText(displayPercentStr, 0, 0);
        ctx.restore();
        
        // Render XP progress bar below text
        const barWidth = 360;
        const barHeight = 12;
        const barX = CENTER_X - barWidth / 2;
        const barY = 432;
        
        // 1. Black outer border (2px)
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        // 2. Dark empty bar background (classic Minecraft dark gray)
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 3. XP filled green bar
        const fillPercent = Math.max(0, Math.min(100, clearedPercent)) / 100;
        const filledWidth = Math.floor(barWidth * fillPercent);
        if (filledWidth > 0) {
          ctx.fillStyle = '#55ff55';
          ctx.fillRect(barX, barY, filledWidth, barHeight);
          
          // Subtle top light green highlight inside XP bar
          ctx.fillStyle = '#77ff77';
          ctx.fillRect(barX, barY, filledWidth, 3);
        }
        
        ctx.restore();
      } else {
        // Standard neon style percentage progress
        ctx.fillStyle = themeColor;
        ctx.font = '700 52px "Orbitron", sans-serif';
        
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = hexToRgba(themeColor, 0.35);
        
        ctx.translate(CENTER_X, 420);
        ctx.scale(scaleVal, scaleVal);
        ctx.fillText(displayPercentStr, 0, 0);
      }
      ctx.restore();

      // 2.5. Render Active Balls Pill Badge (Y = 515)
      ctx.save();
      const ballCount = state.balls.length;
      const badgeText = `${ballCount} BALL${ballCount !== 1 ? 'S' : ''}`;

      if (palette.key === 'minecraft') {
        ctx.font = '400 14px "Press Start 2P", monospace';
        const textWidth = ctx.measureText(badgeText).width;
        const paddingX = 14;
        const paddingY = 8;
        const boxW = textWidth + paddingX * 2;
        const boxH = 14 + paddingY * 2;

        ctx.save();
        ctx.translate(CENTER_X, 510);
        
        // Background box
        ctx.fillStyle = '#000000';
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
        
        // Green border
        ctx.strokeStyle = '#5db332';
        ctx.lineWidth = 3;
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, 0, 0);
        ctx.restore();
      } else {
        // Premium Neon Pill Badge
        ctx.font = '800 20px "Orbitron", "Inter", sans-serif';
        const textW = ctx.measureText(badgeText).width;
        const dotSize = 6;
        const dotSpacing = 12;
        const totalW = dotSize + dotSpacing + textW;
        
        const paddingX = 22;
        const paddingY = 10;
        const badgeW = totalW + paddingX * 2;
        const badgeH = 20 + paddingY * 2;

        ctx.save();
        ctx.translate(CENTER_X, 520);

        // Draw glowing glass pill background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = themeColor;
        
        // Draw rounded rect
        ctx.beginPath();
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.stroke();

        // Draw a small glowing pulse indicator dot inside
        ctx.fillStyle = themeColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const startX = -totalW / 2;
        ctx.arc(startX + dotSize / 2, 0, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Badge Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0; // reset shadow for crisp text
        ctx.fillText(badgeText, startX + dotSize + dotSpacing, 0);
        ctx.restore();
      }
      ctx.restore();
      if (state.currentCommentText) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Compute animation parameters
        let textToDraw = state.currentCommentText;
        let commentAlpha = 1.0;
        let commentYOffset = 0;
        
        const animT = state.commentAnimTime;
        if (animT < 0.12) {
          // Fade Out (120ms): alpha goes 1 -> 0, moves up 8px
          textToDraw = state.prevCommentText || "";
          const p = animT / 0.12;
          commentAlpha = 1 - p;
          commentYOffset = -8 * p;
        } else if (animT < 0.30) {
          // Fade In (180ms): alpha goes 0 -> 1, starts at +8px and moves to 0
          const p = (animT - 0.12) / 0.18;
          commentAlpha = p;
          commentYOffset = 8 * (1 - p);
        } else {
          commentAlpha = 1.0;
          commentYOffset = 0;
        }
        
        if (textToDraw) {
          ctx.globalAlpha = Math.max(0, Math.min(1, commentAlpha));
          const isPerfect = clearedPercent >= 100;
          const maxCommentWidth = 780;
          
          if (palette.key === 'minecraft') {
            // Authentic Minecraft-themed reaction text
            ctx.save();
            ctx.shadowBlur = 0; // Flat retro style
            
            let commentFontSize = isPerfect ? 24 : 18;
            ctx.font = `400 ${commentFontSize}px "Press Start 2P", monospace`;
            
            let measuredComment = ctx.measureText(isPerfect ? textToDraw.toUpperCase() : textToDraw).width;
            while (measuredComment > maxCommentWidth && commentFontSize > 12) {
              commentFontSize -= 2;
              ctx.font = `400 ${commentFontSize}px "Press Start 2P", monospace`;
              measuredComment = ctx.measureText(isPerfect ? textToDraw.toUpperCase() : textToDraw).width;
            }
            
            // Draw text with double black shadow offsets for pixel effect
            ctx.fillStyle = '#111111';
            ctx.fillText(isPerfect ? textToDraw.toUpperCase() : textToDraw, CENTER_X + 3, 1420 + commentYOffset + 3);
            
            ctx.fillStyle = isPerfect ? '#ffff55' : '#ffffff'; // yellow for perfect win, white for normal
            ctx.fillText(isPerfect ? textToDraw.toUpperCase() : textToDraw, CENTER_X, 1420 + commentYOffset);
            ctx.restore();
          } else {
            if (isPerfect) {
              // Final PERFECT ✨: grows to 54px, pure white, extra-bold uppercase
              ctx.fillStyle = '#ffffff';
              let commentFontSize = 54;
              ctx.font = `800 ${commentFontSize}px "Manrope", sans-serif`;
              let measuredComment = ctx.measureText(textToDraw.toUpperCase()).width;
              while (measuredComment > maxCommentWidth && commentFontSize > 24) {
                commentFontSize -= 2;
                ctx.font = `800 ${commentFontSize}px "Manrope", sans-serif`;
                measuredComment = ctx.measureText(textToDraw.toUpperCase()).width;
              }
              ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
              ctx.shadowBlur = 12;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 4;
              ctx.fillText(textToDraw.toUpperCase(), CENTER_X, 1420 + commentYOffset);
            } else {
              // Regular comment: 38px, Manrope SemiBold, #ECECEC, sentence case, no shadow
              ctx.fillStyle = '#ECECEC';
              let commentFontSize = 38;
              ctx.font = `600 ${commentFontSize}px "Manrope", sans-serif`;
              let measuredComment = ctx.measureText(textToDraw).width;
              while (measuredComment > maxCommentWidth && commentFontSize > 20) {
                commentFontSize -= 2;
                ctx.font = `600 ${commentFontSize}px "Manrope", sans-serif`;
                measuredComment = ctx.measureText(textToDraw).width;
              }
              ctx.shadowBlur = 0;
              ctx.shadowColor = 'transparent';
              ctx.fillText(textToDraw, CENTER_X, 1420 + commentYOffset);
            }
          }
        }
        ctx.restore();
      }

      ctx.restore(); // end of scale(resolutionScale, resolutionScale)

      // Trigger continuous callbacks to update status metrics in React
      onStatsChange({
        clearedPercent: parseFloat(clearedPercent.toFixed(2)),
        tilesRemaining: activeCount,
        totalTiles: state.totalTilesCount,
        fps: state.fps,
        phase: state.phase,
        elapsedTime: state.timelineSeconds,
        speedMultiplier: state.balls.length > 0
          ? Math.sqrt(state.balls[0].vx * state.balls[0].vx + state.balls[0].vy * state.balls[0].vy) / 8
          : 1.0,
        impactCount: state.impactCount
      });

      animFrameId = requestAnimationFrame(updateAndRender);
    };

    animFrameId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [palette, tileDensity, autoProgression, selectedPhase, scratchRadiusFactor, boosterPower, isPaused, resolutionScale, startEmpty]);

  // Interpolates ball glow
  const ballGlowColor = (baseHex: string, glowHex: string, intensity: number): string => {
    if (intensity <= 0) return glowHex;
    return glowHex;
  };

  // Convert client-mouse event to inside canvas 1080x1920 coordinates for manual scratch interactions
  const handleInteractiveScratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Scale client coords to 1080x1920 logical frame
    const scaledX = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const scaledY = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    // Check if within bounds of boundary circle
    const dx = scaledX - CENTER_X;
    const dy = scaledY - CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BOUNDARY_RADIUS) {
      const scratchSize = 40; // thick manual scratching brush
      const state = stateRef.current;
      
      state.tiles.forEach(tile => {
        if (!tile.active) return;
        const tdx = scaledX - tile.x;
        const tdy = scaledY - tile.y;
        if (tdx * tdx + tdy * tdy < scratchSize * scratchSize) {
          tile.active = false;
          audioSynth.playScratch();
          for (let i = 0; i < 3; i++) {
            state.particles.push(new Particle(tile.x, tile.y, tile.color, false));
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
      {/* 1080x1920 canvas scaled fluidly using Tailwind container query */}
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

ShortsCanvas.displayName = 'ShortsCanvas';
