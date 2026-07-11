/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Palette } from './types';

export const PALETTES: Palette[] = [
  {
    name: "Rainbow Gradient",
    key: "rainbow",
    colors: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8b00ff"],
    glowColor: "#00ffff",
    ballColor: "#ffffff",
    boosterColor: "#ffff00",
    type: "angular"
  },
  {
    name: "Galaxy (Cosmic Purple)",
    key: "galaxy",
    colors: ["#0d0415", "#1b0a2a", "#3b145a", "#6b1180", "#b132ad", "#ffffff"],
    glowColor: "#b132ad",
    ballColor: "#ffffff",
    boosterColor: "#ff77ff",
    type: "radial"
  },
  {
    name: "Sunset",
    key: "sunset",
    colors: ["#ffd000", "#ff6a00", "#ff0055", "#990066", "#3c0066"],
    glowColor: "#ff4400",
    ballColor: "#ffffff",
    boosterColor: "#ffaa00",
    type: "linear-y"
  },
  {
    name: "Ice & Glacier",
    key: "ice",
    colors: ["#e0f7fa", "#b2ebf2", "#4dd0e1", "#00acc1", "#006064"],
    glowColor: "#00ffff",
    ballColor: "#ffffff",
    boosterColor: "#ffffff",
    type: "linear-y"
  },
  {
    name: "Molten Lava",
    key: "lava",
    colors: ["#ffe600", "#ff5d00", "#b30000", "#4d0000", "#1a0000"],
    glowColor: "#ff3c00",
    ballColor: "#ffffff",
    boosterColor: "#ffdd00",
    type: "radial"
  },
  {
    name: "Enchanted Forest",
    key: "forest",
    colors: ["#e8f5e9", "#a5d6a7", "#66bb6a", "#388e3c", "#1b5e20"],
    glowColor: "#2ecc71",
    ballColor: "#ffffff",
    boosterColor: "#a5d6a7",
    type: "linear-y"
  },
  {
    name: "Pastel Dreams",
    key: "pastel",
    colors: ["#ffb7b2", "#ffdac1", "#e2f0cb", "#b5ead7", "#c7ceea"],
    glowColor: "#c7ceea",
    ballColor: "#ffffff",
    boosterColor: "#ffb7b2",
    type: "angular"
  },
  {
    name: "Vaporwave Retro",
    key: "vaporwave",
    colors: ["#ff007f", "#9d00ff", "#00ffff", "#00003c"],
    glowColor: "#ff007f",
    ballColor: "#ffffff",
    boosterColor: "#00ffff",
    type: "angular"
  },
  {
    name: "Black & Gold",
    key: "black_gold",
    colors: ["#dfaf37", "#f3e19a", "#a48123", "#2c220c", "#120e05"],
    glowColor: "#dfaf37",
    ballColor: "#ffffff",
    boosterColor: "#f3e19a",
    type: "radial"
  },
  {
    name: "Neon Cyberpunk",
    key: "cyberpunk",
    colors: ["#00ff00", "#00ffff", "#ff00ff", "#ff0055", "#050010"],
    glowColor: "#ff00ff",
    ballColor: "#ffffff",
    boosterColor: "#00ff00",
    type: "radial"
  },
  {
    name: "Northern Lights (Aurora)",
    key: "aurora",
    colors: ["#00ff87", "#60efff", "#0061ff", "#020024"],
    glowColor: "#00ff87",
    ballColor: "#ffffff",
    boosterColor: "#60efff",
    type: "radial"
  },
  {
    name: "Deep Ocean",
    key: "deep_ocean",
    colors: ["#00d2ff", "#3a7bd5", "#004e92", "#001f3f"],
    glowColor: "#00d2ff",
    ballColor: "#ffffff",
    boosterColor: "#3a7bd5",
    type: "radial"
  },
  {
    name: "Cotton Candy",
    key: "cotton_candy",
    colors: ["#ff99c8", "#fcf6bd", "#d0f4de", "#a9def9", "#e4c1f9"],
    glowColor: "#e4c1f9",
    ballColor: "#ffffff",
    boosterColor: "#ff99c8",
    type: "angular"
  },
  {
    name: "Fire & Ice",
    key: "fire_ice",
    colors: ["#ff3300", "#ffaa00", "#0055ff", "#00d5ff"],
    glowColor: "#00ffff",
    ballColor: "#ffffff",
    boosterColor: "#ffaa00",
    type: "linear-x"
  },
  {
    name: "Monochrome Minimal",
    key: "monochrome",
    colors: ["#ffffff", "#cccccc", "#888888", "#444444", "#111111"],
    glowColor: "#ffffff",
    ballColor: "#ffffff",
    boosterColor: "#ffffff",
    type: "radial"
  },
  {
    name: "Matrix Green",
    key: "matrix",
    colors: ["#00ff33", "#00cc22", "#008811", "#003300", "#001100"],
    glowColor: "#00ff33",
    ballColor: "#ffffff",
    boosterColor: "#00ff33",
    type: "linear-y"
  },
  {
    name: "Sparks Fireworks",
    key: "fireworks",
    colors: ["#ff0055", "#00ffaa", "#ffaa00", "#7700ff", "#ffdd00"],
    glowColor: "#ffaa00",
    ballColor: "#ffffff",
    boosterColor: "#ff0055",
    type: "random"
  }
];

/**
 * Utility to interpolate colors across a list of hex values.
 */
export function getColorAtRatio(colors: string[], ratio: number): string {
  if (colors.length === 0) return "#000000";
  if (colors.length === 1) return colors[0];
  
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const segmentCount = colors.length - 1;
  const rawIndex = clampedRatio * segmentCount;
  const index = Math.floor(rawIndex);
  const frac = rawIndex - index;
  
  if (index >= segmentCount) return colors[colors.length - 1];
  
  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[index + 1]);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * frac);
  const g = Math.round(c1.g + (c2.g - c1.g) * frac);
  const b = Math.round(c1.b + (c2.b - c1.b) * frac);
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Calculates a specific tile color based on position in the circle coordinate frame.
 */
export function getTileColorForPalette(
  palette: Palette,
  x: number, // centered coordinate relative to circle center, from -r to +r
  y: number, // centered coordinate relative to circle center, from -r to +r
  radius: number
): string {
  const dist = Math.sqrt(x * x + y * y);
  const normalizedDist = Math.min(1.0, dist / radius);
  
  switch (palette.type) {
    case 'radial': {
      // center is bright, edge is dark (or vice versa depending on colors order)
      return getColorAtRatio(palette.colors, normalizedDist);
    }
    case 'linear-y': {
      // vertical gradient mapping
      const ratio = (y + radius) / (radius * 2);
      return getColorAtRatio(palette.colors, ratio);
    }
    case 'linear-x': {
      // horizontal gradient mapping
      const ratio = (x + radius) / (radius * 2);
      return getColorAtRatio(palette.colors, ratio);
    }
    case 'angular': {
      // angular gradient mapped to [0, 1]
      const angle = Math.atan2(y, x) + Math.PI; // [0, 2PI]
      const ratio = angle / (Math.PI * 2);
      return getColorAtRatio(palette.colors, ratio);
    }
    case 'random': {
      // pick a color step with simple deterministic jitter based on coords
      const val = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453123;
      const frac = val - Math.floor(val);
      return getColorAtRatio(palette.colors, frac);
    }
    default:
      return palette.colors[0];
  }
}
