export interface Palette {
  name: string;
  key: string;
  colors: string[]; // Gradient steps
  glowColor: string;
  ballColor: string;
  boosterColor: string;
  type: 'radial' | 'linear-y' | 'linear-x' | 'angular' | 'random' | 'custom';
}

export interface SimulationConfig {
  tileRows: number;
  tileCols: number;
  ballRadius: number;
  scratchRadiusFactor: number; // multiplier of ball radius
  baseSpeed: number;
  maxSpeed: number;
  boosterArcLength: number; // in radians
  boosterWidth: number;
  trailLength: number;
  gravity: number;
}

export type TimelinePhase = 'slow' | 'medium' | 'fast' | 'extreme' | 'cleared';

export interface SoundSettings {
  muted: boolean;
  volume: number; // 0 to 1
}

export interface SimulationStats {
  clearedPercent: number;
  tilesRemaining: number;
  totalTiles: number;
  fps: number;
  phase: TimelinePhase;
  elapsedTime: number; // in seconds
  speedMultiplier: number;
  impactCount: number;
}
