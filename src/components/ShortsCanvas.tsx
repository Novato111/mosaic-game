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

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98; // slight drag
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
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

  constructor(row: number, col: number, x: number, y: number, size: number, color: string) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.active = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.fillStyle = this.color;
    // Draw tiles with a microscopic gap for grid feel
    ctx.fillRect(this.x - this.size / 2 + 0.5, this.y - this.size / 2 + 0.5, this.size - 1, this.size - 1);
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
  resolutionScale = 1.0
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ topHookText, comments });
  useEffect(() => {
    propsRef.current = { topHookText, comments };
  });
  
  // Simulation Constants
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const CENTER_X = 480; // Centered within x = 60 to 900 safe zone
  const CENTER_Y = 940; // Centered within y = 480 to 1400 safe zone
  const BOUNDARY_RADIUS = 440; // Diameter of 880px fits perfectly inside vertical & horizontal bounds

  // Simulation State Refs to avoid re-renders on rapid 60 FPS loops
  const stateRef = useRef({
    ball: {
      x: CENTER_X - 100,
      y: CENTER_Y - 50,
      vx: 4.5,
      vy: 6.0,
      radius: 16,
      glowIntensity: 15,
      impactGlow: 0,
      trail: [] as TrailNode[]
    },
    boosterPad: {
      angle: 0, // angular center position [0, 2PI]
      speed: 0.006, // speed of movement around the rim
      arcLength: 0.55, // radians, approx 31 degrees
      width: 14,
      flashIntensity: 0,
      color: palette.boosterColor
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
    percentPulseTime: 1.0
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
    
    // Smooth natural falling start from the upper portion
    state.ball.x = CENTER_X + (Math.random() - 0.5) * 120;
    state.ball.y = CENTER_Y - 260; // Elevated start
    
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
    state.ball.vx = Math.cos(angle) * targetSpeed;
    state.ball.vy = Math.sin(angle) * targetSpeed;
    state.ball.trail = [];
    
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
    
    // Determine grid spacing based on density
    let size = 16;
    if (tileDensity === 'low') size = 24;
    else if (tileDensity === 'medium') size = 16;
    else if (tileDensity === 'high') size = 11;
    else if (tileDensity === 'ultra') size = 7.5;

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
          tiles.push(new Tile(rowIdx, colIdx, x, y, size, color));
        }
        rowIdx++;
      }
      colIdx++;
    }

    state.tiles = tiles;
    state.totalTilesCount = tiles.length;
  };

  // Restart and re-generate on density or palette changes (proper reset)
  useEffect(() => {
    restart();
  }, [tileDensity, palette]);

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

    const curSpeed = Math.sqrt(state.ball.vx * state.ball.vx + state.ball.vy * state.ball.vy);
    if (curSpeed > 0) {
      state.ball.vx = (state.ball.vx / curSpeed) * targetSpeed;
      state.ball.vy = (state.ball.vy / curSpeed) * targetSpeed;
    }
  }, [manualSpeedMultiplier, autoProgression, selectedPhase]);

  // Trigger the booster kick - redesigned to be moderate, decent and smooth
  const triggerBoostEffect = (manual: boolean = false) => {
    const state = stateRef.current;
    state.impactCount++;
    state.boosterPad.flashIntensity = 0.5; // simple plain flash
    state.ball.impactGlow = 0.8;
    state.screenShake = manual ? 6 : 10; // lower screen shake for smoothness
    
    // Play satisfying whoosh booster sound
    audioSynth.playBooster();

    // Determine speed boost - moderate and satisfying instead of extreme
    let boostFactor = 1.15 * boosterPower;
    if (state.phase === 'extreme') boostFactor = 1.05 * boosterPower;

    const curSpeed = Math.sqrt(state.ball.vx * state.ball.vx + state.ball.vy * state.ball.vy);
    const maxSpeed = state.phase === 'slow' ? 11 : state.phase === 'medium' ? 18 : state.phase === 'fast' ? 28 : 42;
    const newSpeed = Math.min(maxSpeed, curSpeed * boostFactor);

    if (curSpeed > 0) {
      state.ball.vx = (state.ball.vx / curSpeed) * newSpeed;
      state.ball.vy = (state.ball.vy / curSpeed) * newSpeed;
    }

    // Emit subtle and elegant particles opposite to ball trajectory
    const ballAngle = Math.atan2(state.ball.vy, state.ball.vx);
    for (let i = 0; i < 12; i++) {
      const p = new Particle(state.ball.x, state.ball.y, palette.boosterColor, true);
      p.vx = -Math.cos(ballAngle + (Math.random() - 0.5) * 0.8) * (Math.random() * 6 + 2);
      p.vy = -Math.sin(ballAngle + (Math.random() - 0.5) * 0.8) * (Math.random() * 6 + 2);
      state.particles.push(p);
    }
  };

  // Core Simulation Step called at 60fps
  useEffect(() => {
    let animFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const updateAndRender = () => {
      const state = stateRef.current;
      const ball = state.ball;
      const boosterPad = state.boosterPad;

      // Handle Framerate
      const now = performance.now();
      const delta = now - state.lastTime;
      state.lastTime = now;
      state.frameCount++;
      if (state.frameCount % 20 === 0) {
        state.fps = Math.round(1000 / delta);
      }

      // Compute time delta in seconds (capped at 100ms)
      const dt = Math.min(0.1, delta / 1000);

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
      const currentClearedCount = state.totalTilesCount - currentActiveCount;
      const currentClearedPercent = state.totalTilesCount > 0 
        ? Math.round((currentClearedCount / state.totalTilesCount) * 100)
        : 0;

      let calculatedPhase: TimelinePhase = 'slow';
      const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

      if (!isPaused) {
        if (autoProgression) {
          state.timelineSeconds += 1 / 60;

          // Transition phases organically based on physical completeness
          if (currentClearedPercent >= 100) {
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

            if (calculatedPhase === 'cleared') {
              audioSynth.playFinalClear();
            }
          }
        } else {
          // Locked Phase Mode
          if (selectedPhase !== 'auto' && state.phase !== selectedPhase) {
            state.phase = selectedPhase;
            if (selectedPhase === 'cleared') {
              state.tiles.forEach(tile => { tile.active = false; });
              audioSynth.playFinalClear();
            }
          }
        }

        // Adjust velocities & attributes based on Current Phase
        let targetSpeed = 8;
        let gravityEffect = 0;
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

        // Apply smooth natural gravity to ball's downward velocity
        ball.vy += 0.12;

        // Drag/Acceleration towards target speed if not boosted recently
        if (ballSpeed > 0) {
          if (ballSpeed > targetSpeed) {
            // decay speed back to target speed
            const drag = 0.992; // smoother, gentler decay
            ball.vx *= drag;
            ball.vy *= drag;
          } else if (ballSpeed < targetSpeed - 1.0) {
            // push back to target speed
            const accel = 1.006; // smooth, gentle acceleration back to target
            ball.vx *= accel;
            ball.vy *= accel;
          }
        }

        // Apply sub-step physics to avoid passing through tiles or boundary at extreme speeds
        const physicsSubSteps = state.phase === 'extreme' || state.phase === 'cleared' ? 3 : 2;
        for (let step = 0; step < physicsSubSteps; step++) {
          // Move ball by fractional steps
          ball.x += (ball.vx / physicsSubSteps);
          ball.y += (ball.vy / physicsSubSteps);

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
            const bounceFactor = 0.96; // slightly absorbs shock for a more natural bouncing sound and visual rhythm
            ball.vx = (ball.vx - 2 * dot * nx) * bounceFactor;
            ball.vy = (ball.vy - 2 * dot * ny) * bounceFactor;

            // Determine angle of collision relative to center
            let collisionAngle = Math.atan2(dy, dx);
            if (collisionAngle < 0) collisionAngle += Math.PI * 2;

            // Check if collision hit the booster pad
            let isBoosterHit = false;
            const boosterHalfArc = boosterPad.arcLength / 2;
            const bMin = (boosterPad.angle - boosterHalfArc + Math.PI * 2) % (Math.PI * 2);
            const bMax = (boosterPad.angle + boosterHalfArc + Math.PI * 2) % (Math.PI * 2);

            if (bMin < bMax) {
              isBoosterHit = collisionAngle >= bMin && collisionAngle <= bMax;
            } else {
              // crosses 0/2PI boundary
              isBoosterHit = collisionAngle >= bMin || collisionAngle <= bMax;
            }

            if (isBoosterHit) {
              triggerBoostEffect(false);
            } else {
              // Standard wall collision
              state.screenShake = Math.min(8, ballSpeed / 3);
              ball.impactGlow = 0.6;
              // Play physical pitch based on current ball velocity
              const pitch = 0.7 + (ballSpeed / 30);
              audioSynth.playBounce(pitch);

              // Generate sparse particles along rim
              for (let i = 0; i < 4; i++) {
                const p = new Particle(ball.x, ball.y, palette.glowColor, false);
                p.vx = -nx * (Math.random() * 4 + 1) + (Math.random() - 0.5) * 3;
                p.vy = -ny * (Math.random() * 4 + 1) + (Math.random() - 0.5) * 3;
                state.particles.push(p);
              }
            }
          }

          // 3. MOSAIC TILE SCRATCH MECHANIC
          // We only check tiles inside a localized bounding box around the ball
          const scratchRadius = ball.radius * scratchRadiusFactor;
          
          for (let i = 0; i < state.tiles.length; i++) {
            const tile = state.tiles[i];
            if (!tile.active) continue;

            // Quick distance check
            const tdx = ball.x - tile.x;
            const tdy = ball.y - tile.y;
            const tileDistSq = tdx * tdx + tdy * tdy;

            if (tileDistSq < scratchRadius * scratchRadius) {
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

        // Update booster pad angle (rotate slowly around the rim)
        const boosterSpeed = state.phase === 'slow' ? 0.004 : state.phase === 'medium' ? 0.007 : state.phase === 'fast' ? 0.012 : 0.018;
        boosterPad.angle = (boosterPad.angle + boosterSpeed) % (Math.PI * 2);

        // Decays
        boosterPad.flashIntensity *= 0.92;
        ball.impactGlow *= 0.94;
        state.screenShake *= 0.9;

        // Update active particles
        state.particles.forEach(p => p.update());
        state.particles = state.particles.filter(p => p.alpha > 0);

        // 4. MOTION TRAIL MANAGEMENT
        // Append current position to trail
        ball.trail.push({ x: ball.x, y: ball.y, radius: ball.radius });
        
        // Dynamic trail length based on velocity
        const targetTrailLength = Math.min(60, Math.floor(10 + ballSpeed * 1.3));
        while (ball.trail.length > targetTrailLength) {
          ball.trail.shift();
        }
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
          tile.draw(ctx);
          activeCount++;
        }
      }

      // Stats Reporting
      const clearedCount = state.totalTilesCount - activeCount;
      const clearedPercent = state.totalTilesCount > 0 
        ? Math.round((clearedCount / state.totalTilesCount) * 100)
        : 0;

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
      if (clearedPercent < 25) expectedCommentText = commentsProp.range0_25;
      else if (clearedPercent < 50) expectedCommentText = commentsProp.range25_50;
      else if (clearedPercent < 75) expectedCommentText = commentsProp.range50_75;
      else if (clearedPercent < 90) expectedCommentText = commentsProp.range75_90;
      else if (clearedPercent < 100) expectedCommentText = commentsProp.range90_99;
      else expectedCommentText = commentsProp.range100;

      if (state.currentCommentText !== expectedCommentText) {
        state.prevCommentText = state.currentCommentText;
        state.currentCommentText = expectedCommentText;
        state.commentAnimTime = 0.0; // trigger transition
      }

      if (clearedPercent !== state.lastClearedPercent) {
        state.lastClearedPercent = clearedPercent;
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

      // Layer 3: Booster Pad Arc attached inside the rim - kept simple, plain and clean
      ctx.save();
      const flashHex = palette.boosterColor;
      ctx.strokeStyle = flashHex;
      ctx.lineWidth = 6 + (boosterPad.flashIntensity * 4); // Thinner, cleaner
      ctx.shadowBlur = 4 + (boosterPad.flashIntensity * 8); // Subtle, natural glow
      ctx.shadowColor = flashHex;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(
        CENTER_X,
        CENTER_Y,
        BOUNDARY_RADIUS - 5, // Clean overlay inside rim
        boosterPad.angle - boosterPad.arcLength / 2,
        boosterPad.angle + boosterPad.arcLength / 2
      );
      ctx.stroke();
      ctx.restore();

      // Layer 4: Particle sparks (bloom and trail)
      state.particles.forEach(p => p.draw(ctx));

      // Layer 5: Ball Motion Trail (Faded overlays) - Redesigned to be minimal, natural, and subtle
      ctx.save();
      const trailLen = ball.trail.length;
      for (let i = 0; i < trailLen; i += 2) {
        const node = ball.trail[i];
        const opacity = (i / trailLen) * 0.12; // Extremely soft, subtle trail
        ctx.globalAlpha = opacity;
        ctx.fillStyle = palette.glowColor;
        ctx.beginPath();
        // Squeezed size on older tail nodes: narrow and tapered
        const currentSize = node.radius * (0.15 + (i / trailLen) * 0.5);
        ctx.arc(node.x, node.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Layer 6: Main Glowing Ball
      ctx.save();
      ctx.fillStyle = ballGlowColor(palette.ballColor, palette.glowColor, ball.impactGlow);
      
      // Intense bloom glow on high velocity
      const glowAmt = Math.max(15, ballSpeed * 0.9) + (ball.impactGlow * 35);
      ctx.shadowBlur = glowAmt;
      ctx.shadowColor = palette.glowColor;
      
      ctx.beginPath();
      // Pulsating radius on hits
      const scaleRad = ball.radius * (1.0 + ball.impactGlow * 0.2);
      ctx.arc(ball.x, ball.y, scaleRad, 0, Math.PI * 2);
      ctx.fill();

      // Internal bright core of the ball
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, scaleRad * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // end of translate, zoom, and shake

      // Draw HUD overlays (Top Hook, % Number, Bottom Reaction Comment)
      // These are drawn on top of the game canvas without shaking/zooming
      ctx.save();
      ctx.scale(resolutionScale, resolutionScale);

      const themeColor = palette.boosterColor || '#00ffcc';

      // 1. Render Level Tag (Y = 220–260, midpoint: 240)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = themeColor;
      ctx.font = '700 24px "Orbitron", sans-serif';
      ctx.shadowColor = hexToRgba(themeColor, 0.4);
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      const phaseTagText = `•  PHASE: ${state.phase.toUpperCase()}  •`;
      ctx.fillText(phaseTagText, CENTER_X, 240);
      ctx.restore();

      // 2. Render Top Hook Text (Y = 280–360, midpoint: 320)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      
      const topText = (propsRef.current.topHookText || "CAN IT HIT 100%?").toUpperCase();
      const maxHookWidth = 780;
      let hookFontSize = 52;
      ctx.font = `900 ${hookFontSize}px "Bebas Neue", sans-serif`;
      let measuredHook = ctx.measureText(topText).width;
      while (measuredHook > maxHookWidth && hookFontSize > 28) {
        hookFontSize -= 2;
        ctx.font = `900 ${hookFontSize}px "Bebas Neue", sans-serif`;
        measuredHook = ctx.measureText(topText).width;
      }
      ctx.fillText(topText, CENTER_X, 320);
      ctx.restore();

      // 3. Render Reaction Comment Live (Y = 400–450, midpoint: 425)
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
            ctx.fillText(textToDraw.toUpperCase(), CENTER_X, 425 + commentYOffset);
          } else {
            // Regular comment: 40px, Manrope SemiBold, #ECECEC, sentence case, no shadow
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
            ctx.fillText(textToDraw, CENTER_X, 425 + commentYOffset);
          }
        }
        ctx.restore();
      }

      // 4. Render Animated Orbitron Live % Number (Y = 1420–1490, midpoint: 1455, must end by 1500)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillStyle = themeColor;
      ctx.font = '600 90px "Orbitron", sans-serif';
      
      // Calculate animated scale for % number pulse
      const pulseT = Math.min(1.0, state.percentPulseTime);
      const scaleVal = 0.95 + 0.05 * (pulseT * (2 - pulseT)); // easeOutQuad
      
      // Soft glow shadow: Blur: 8-12px, Opacity: 35%
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = hexToRgba(themeColor, 0.35);
      
      ctx.translate(CENTER_X, 1455);
      ctx.scale(scaleVal, scaleVal);
      ctx.fillText(`${clearedPercent}%`, 0, 0);
      ctx.restore();

      ctx.restore(); // end of scale(resolutionScale, resolutionScale)

      // Trigger continuous callbacks to update status metrics in React
      onStatsChange({
        clearedPercent,
        tilesRemaining: activeCount,
        totalTiles: state.totalTilesCount,
        fps: state.fps,
        phase: state.phase,
        elapsedTime: state.timelineSeconds,
        speedMultiplier: ballSpeed / 8,
        impactCount: state.impactCount
      });

      animFrameId = requestAnimationFrame(updateAndRender);
    };

    animFrameId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [palette, tileDensity, autoProgression, selectedPhase, scratchRadiusFactor, boosterPower, isPaused]);

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
