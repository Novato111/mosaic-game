/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Palette } from './types';

export const PALETTES: Palette[] = [
  {
    name: "Minecraft Brick World",
    key: "minecraft",
    colors: ["#5db332", "#3c821c", "#866043", "#737373", "#55ffff"],
    glowColor: "#5db332",
    ballColor: "#ffffff",
    boosterColor: "#ffaa00",
    type: "custom"
  },
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
    colors: ["#ffe600", "#ff8000", "#ff2a00", "#cc0000", "#8c0000"],
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
  if (palette.key === 'minecraft') {
    const nx = (x + radius) / (2 * radius);
    const ny = (y + radius) / (2 * radius);
    
    // Scale to a 42x42 pixel grid
    const col = Math.floor(nx * 42);
    const row = Math.floor(ny * 42);

    const noise = (c: number, r: number, seed: number) => {
      const val = Math.sin(c * 12.9898 + r * 78.233 + seed) * 43758.5453123;
      return val - Math.floor(val);
    };

    // 1. Ocean Water at the bottom
    if (row >= 38) {
      const n = noise(col, row, 101);
      if (n < 0.15) return '#ffffff'; // Foam
      if (n < 0.45) return '#55aaff'; // Light water ripple
      return '#2255dd'; // Deep blue ocean
    }

    // 2. Waterfalls on the left and right sides
    const isLeftWaterfall = col >= 2 && col <= 4 && row >= 15;
    const isRightWaterfall = col >= 37 && col <= 39 && row >= 15;
    if (isLeftWaterfall || isRightWaterfall) {
      const n = noise(col, row, 202);
      if (n < 0.2) return '#ffffff'; // foam
      if (n < 0.6) return '#55aaff'; // light blue
      return '#3273ff'; // standard blue
    }

    // Determine if we are inside the floating island body
    // Center of floating island body: cx=20, cy=24
    const dxIsland = col - 20;
    const dyIsland = row - 23;
    const distIslandSq = dxIsland * dxIsland + dyIsland * dyIsland;
    const isInsideIsland = distIslandSq <= 18 * 18;

    if (isInsideIsland) {
      // 3. Central Sword Cave area
      const dxCave = col - 20;
      const dyCave = row - 24;
      const distCaveSq = dxCave * dxCave + dyCave * dyCave;
      
      if (distCaveSq <= 10 * 10) {
        // Inner cave. Let's render the Diamond Sword first!
        // Sword coordinates relative to center (19, 25)
        const scx = 19;
        const scy = 25;
        const sdx = col - scx;
        const sdy = row - scy;
        
        // Diagonal coordinates
        const u = sdx - sdy; // main axis
        const v = sdx + sdy; // cross axis
        
        // Draw Diamond Sword
        // Blade: u from 1 to 7, v in [-1, 1]
        if (u >= 1 && u <= 7 && Math.abs(v) <= 1) {
          if (v === 0) {
            // White shining core or cyan
            return u === 7 ? '#ffffff' : '#55ffff';
          }
          return '#00aaaa'; // Dark cyan edge
        }
        
        // Blade outline: u from 1 to 7, Math.abs(v) === 2
        if (u >= 1 && u <= 7 && Math.abs(v) === 2) {
          return '#003333'; // Deep teal shadow
        }
        
        // Crossguard: u === 0 or u === -1
        if ((u === 0 || u === -1) && Math.abs(v) <= 3) {
          if (v === 0) {
            return '#ffaa00'; // Gold center
          }
          return '#00aaaa'; // Dark cyan guard wings
        }
        
        // Crossguard outline
        if ((u === 1 || u === -2) && Math.abs(v) <= 3) {
          return '#003333';
        }
        if ((u === 0 || u === -1) && Math.abs(v) === 4) {
          return '#003333';
        }
        
        // Handle: u from -5 to -2, v === 0
        if (u >= -5 && u <= -2 && v === 0) {
          return '#866043'; // Brown wood handle
        }
        if (u >= -5 && u <= -2 && Math.abs(v) === 1) {
          return '#3c2715'; // Dark border for handle
        }
        
        // Pommel: u === -6, v === 0
        if (u === -6 && v === 0) {
          return '#00aaaa';
        }
        if (u === -6 && Math.abs(v) === 1) {
          return '#003333';
        }
        if (u === -7 && v === 0) {
          return '#003333';
        }

        // Cave background / Ores / Obsidian surrounding
        if (distCaveSq <= 6 * 6) {
          // Dark obsidian/stone background for the sword
          const n = noise(col, row, 303);
          return n < 0.25 ? '#1a1126' : n < 0.5 ? '#110c1a' : '#1d1d1d'; // deep purple/black obsidian/bedrock
        }
        
        // Outer cave background: Gray stone
        // Check for Ores!
        // Emerald Ore at bottom-left: col in 11..14, row in 31..34
        if (col >= 11 && col <= 14 && row >= 31 && row <= 34) {
          const n = noise(col, row, 404);
          if (n < 0.4) return '#55ff55'; // Emerald green
        }
        // Gold Ore at bottom-right: col in 26..29, row in 31..34
        if (col >= 26 && col <= 29 && row >= 31 && row <= 34) {
          const n = noise(col, row, 505);
          if (n < 0.4) return '#ffaa00'; // Gold
        }
        // Lapis Ore at upper-left: col in 8..11, row in 21..24
        if (col >= 8 && col <= 11 && row >= 21 && row <= 24) {
          const n = noise(col, row, 606);
          if (n < 0.4) return '#3273ff'; // Lapis blue
        }
        // Redstone Ore at upper-right: col in 29..32, row in 21..24
        if (col >= 29 && col <= 32 && row >= 21 && row <= 24) {
          const n = noise(col, row, 707);
          if (n < 0.4) return '#ff2a2a'; // Glowing redstone
        }

        // Standard Stone colors
        const stoneColors = ['#737373', '#616161', '#5c5c5c', '#808080', '#6e6e6e'];
        const idx = Math.floor(noise(col, row, 412) * stoneColors.length);
        return stoneColors[idx];
      }

      // 4. Island surface grass & dirt
      const grassY = 13;
      if (row <= grassY + 1) {
        // Grass top layer
        const grassColors = ['#5db332', '#4c781c', '#71b23e', '#558428', '#639c35'];
        const idx = Math.floor(noise(col, row, 23) * grassColors.length);
        return grassColors[idx];
      } else {
        // Dirt under-layer
        const dirtColors = ['#866043', '#573d26', '#725035', '#4d331e', '#614128'];
        const idx = Math.floor(noise(col, row, 99) * dirtColors.length);
        return dirtColors[idx];
      }
    }

    // 5. SKY BACKGROUND & DECORATIONS (Outside Island)
    // Leafy tree leaves (top-left)
    const tlcx = 11;
    const tlcy = 4;
    const distTreeSq = (col - tlcx) * (col - tlcx) + (row - tlcy) * (row - tlcy);
    if (distTreeSq <= 5.5 * 5.5) {
      // Tree canopy greens
      const leafGreens = ['#1c5210', '#3c821c', '#5db332', '#2a6a16', '#499a25'];
      const idx = Math.floor(noise(col, row, 555) * leafGreens.length);
      return leafGreens[idx];
    }
    
    // Tree Trunk
    if ((col === 10 || col === 11) && row >= 5 && row <= 12) {
      const trunkColors = ['#573d26', '#3c2715', '#4e331b'];
      const idx = Math.floor(noise(col, row, 666) * trunkColors.length);
      return trunkColors[idx];
    }

    // Wooden House (top-right)
    // Roof: rows 6..8, cols 24..34, shaped as staircase
    if (row >= 6 && row <= 8) {
      const halfWidth = row - 5; // row 6 -> width 1 (half), row 8 -> width 3
      const hscx = 29;
      if (col >= hscx - halfWidth - 3 && col <= hscx + halfWidth + 3) {
        const roofColors = ['#866043', '#9d724e', '#573d26'];
        const idx = Math.floor(noise(col, row, 777) * roofColors.length);
        return roofColors[idx];
      }
    }
    // House Base: rows 9..12, cols 25..33
    if (row >= 9 && row <= 12 && col >= 25 && col <= 33) {
      // Left and right walls: stone cobblestone
      if (col === 25 || col === 33) {
        const cobbleColors = ['#737373', '#616161', '#5c5c5c'];
        const idx = Math.floor(noise(col, row, 888) * cobbleColors.length);
        return cobbleColors[idx];
      }
      // Wooden door
      if ((col === 29 || col === 30) && row >= 10 && row <= 12) {
        if (col === 30 && row === 11) return '#ffaa00'; // Doorknob
        return '#573d26'; // Wood door
      }
      // Window
      if ((col === 26 || col === 27) && row === 10) {
        return '#55ffff'; // Glass window
      }
      // Wooden wall planks
      const woodWallColors = ['#866043', '#725035', '#614128'];
      const idx = Math.floor(noise(col, row, 999) * woodWallColors.length);
      return woodWallColors[idx];
    }

    // Wooden Chest (top center)
    if (col >= 17 && col <= 20 && row >= 11 && row <= 12) {
      if (col === 18 && row === 11) return '#cccccc'; // silver lock
      return '#5c3a21'; // chest wood
    }

    // Sky Background with Sun & Clouds
    // Sun
    const suncx = 34;
    const suncy = 3;
    const distSun = Math.sqrt((col - suncx) * (col - suncx) + (row - suncy) * (row - suncy));
    if (distSun <= 2.2) return '#ffffff'; // White sun core
    if (distSun <= 4.2) return '#ffff00'; // Yellow sun body
    if (distSun <= 6.2) return '#ffaa00'; // Orange glow

    // Clouds
    const isCloud1 = col >= 4 && col <= 13 && row >= 3 && row <= 6;
    const isCloud2 = col >= 20 && col <= 26 && row >= 2 && row <= 5;
    if (isCloud1 || isCloud2) {
      const isCloudShadow = (isCloud1 && row === 6) || (isCloud2 && row === 5);
      return isCloudShadow ? '#d9dee6' : '#ffffff';
    }

    // Standard blue sky gradient (darker at top, lighter near the horizon)
    const skyBlues = ['#69a2ff', '#538fff', '#7bb4ff', '#5c96ff', '#4b85f0'];
    const idx = Math.min(skyBlues.length - 1, Math.floor((row / 38) * skyBlues.length));
    return skyBlues[idx];
  }

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
