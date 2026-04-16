import { GoogleGenerativeAI } from "@google/generative-ai";
import QRCode from "qrcode";

// Achievement definitions for badge cards
export const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  icon: string;
  gradientColors: [string, string];
  accentColor: string;
}> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received your first payment",
    tier: "bronze",
    icon: "⭐",
    gradientColors: ["#f59e0b", "#d97706"],
    accentColor: "#fbbf24",
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Pioneer of Settla",
    tier: "gold",
    icon: "🚀",
    gradientColors: ["#8b5cf6", "#7c3aed"],
    accentColor: "#a78bfa",
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 days of consistent payments",
    tier: "platinum",
    icon: "📈",
    gradientColors: ["#06b6d4", "#0891b2"],
    accentColor: "#22d3ee",
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour",
    tier: "silver",
    icon: "⚡",
    gradientColors: ["#eab308", "#ca8a04"],
    accentColor: "#facc15",
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Built a team of 3+ members",
    tier: "silver",
    icon: "👥",
    gradientColors: ["#3b82f6", "#2563eb"],
    accentColor: "#60a5fa",
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Payments from 5+ countries",
    tier: "gold",
    icon: "🌍",
    gradientColors: ["#6366f1", "#4f46e5"],
    accentColor: "#818cf8",
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    tier: "gold",
    icon: "💎",
    gradientColors: ["#f97316", "#ea580c"],
    accentColor: "#fb923c",
  },
  HUNDRED_CLUB: {
    name: "100 Club",
    description: "100 successful transactions",
    tier: "platinum",
    icon: "💯",
    gradientColors: ["#ec4899", "#db2777"],
    accentColor: "#f472b6",
  },
  THOUSAND_CLUB: {
    name: "1000 Club",
    description: "1,000 successful transactions",
    tier: "diamond",
    icon: "🏆",
    gradientColors: ["#06b6d4", "#0284c7"],
    accentColor: "#38bdf8",
  },
  STREAK_MASTER: {
    name: "Streak Master",
    description: "30-day login streak",
    tier: "gold",
    icon: "🔥",
    gradientColors: ["#ef4444", "#dc2626"],
    accentColor: "#f87171",
  },
  SECURITY_FIRST: {
    name: "Security First",
    description: "Enabled Passkey authentication",
    tier: "bronze",
    icon: "🛡️",
    gradientColors: ["#22c55e", "#16a34a"],
    accentColor: "#4ade80",
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Referred 10+ merchants",
    tier: "diamond",
    icon: "🎁",
    gradientColors: ["#ec4899", "#be185d"],
    accentColor: "#f472b6",
  },
  ONBOARDING_COMPLETE: {
    name: "Onboarding Complete",
    description: "Completed all setup steps",
    tier: "bronze",
    icon: "✅",
    gradientColors: ["#10b981", "#059669"],
    accentColor: "#34d399",
  },
  VOLUME_ROOKIE: {
    name: "Volume Rookie",
    description: "Processed $1,000 in payments",
    tier: "bronze",
    icon: "💰",
    gradientColors: ["#64748b", "#475569"],
    accentColor: "#94a3b8",
  },
  VOLUME_PRO: {
    name: "Volume Pro",
    description: "Processed $100,000 in payments",
    tier: "platinum",
    icon: "💎",
    gradientColors: ["#7c3aed", "#6d28d9"],
    accentColor: "#a78bfa",
  },
  // Tier Badges - for sharing merchant tier status
  TIER_BRONZE: {
    name: "Bronze Merchant",
    description: "Verified Settla Merchant",
    tier: "bronze",
    icon: "🥉",
    gradientColors: ["#cd7f32", "#8b4513"],
    accentColor: "#d97706",
  },
  TIER_SILVER: {
    name: "Silver Merchant",
    description: "$10K+ processed on Settla",
    tier: "silver",
    icon: "🥈",
    gradientColors: ["#c0c0c0", "#808080"],
    accentColor: "#a1a1aa",
  },
  TIER_GOLD: {
    name: "Gold Merchant",
    description: "$50K+ processed on Settla",
    tier: "gold",
    icon: "🥇",
    gradientColors: ["#ffd700", "#daa520"],
    accentColor: "#fbbf24",
  },
  TIER_DIAMOND: {
    name: "Diamond Merchant",
    description: "$250K+ processed on Settla",
    tier: "diamond",
    icon: "💎",
    gradientColors: ["#00bfff", "#1e90ff"],
    accentColor: "#38bdf8",
  },
};

// Tier visual configurations
export const TIER_CONFIGS: Record<string, {
  borderGradient: string;
  badge: string;
  glowColor: string;
}> = {
  bronze: {
    borderGradient: "linear-gradient(135deg, #cd7f32, #8b4513)",
    badge: "🥉",
    glowColor: "rgba(205, 127, 50, 0.4)",
  },
  silver: {
    borderGradient: "linear-gradient(135deg, #c0c0c0, #808080)",
    badge: "🥈",
    glowColor: "rgba(192, 192, 192, 0.4)",
  },
  gold: {
    borderGradient: "linear-gradient(135deg, #ffd700, #daa520)",
    badge: "🥇",
    glowColor: "rgba(255, 215, 0, 0.4)",
  },
  platinum: {
    borderGradient: "linear-gradient(135deg, #e5e4e2, #8e8e8e)",
    badge: "💠",
    glowColor: "rgba(229, 228, 226, 0.4)",
  },
  diamond: {
    borderGradient: "linear-gradient(135deg, #b9f2ff, #4fc3f7)",
    badge: "💎",
    glowColor: "rgba(79, 195, 247, 0.5)",
  },
};

// Generate unique badge artwork using Gemini
export async function generateUniqueBadgeArtwork(
  merchantName: string,
  achievementType: string,
  merchantId: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, using default badge design");
    return null;
  }

  const badge = BADGE_DEFINITIONS[achievementType];
  if (!badge) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Generate a unique seed based on merchant ID and achievement
    const uniqueSeed = `${merchantId}-${achievementType}`;

    // Create a prompt for generating unique badge SVG
    const systemPrompt = `You are a world-class Digital Artist & UI Designer specializing in premium, futuristic identity cards and digital collectibles.
    Your task is to generate a unique, stunning SVG badge centerpiece for a merchant's achievement card.
    
    The Output MUST be ONLY the raw SVG code. No markdown code blocks, no explanations. just the <svg>...</svg> string.`;

    const userPrompt = `Create a unique, premium SVG badge credential for:
    Merchant: "${merchantName}"
    Achievement: "${badge.name}" (${badge.description})
    Tier: ${badge.tier}
    Seed Identity: ${uniqueSeed}

    Design Requirements:
    1. **Format**: Raw SVG string. Viewport 0 0 512 512.
    2. **Style**: Premium, High-Tech, Glassmorphism, Holographic. Use mostly stroke-based complex geometry, gradients, and subtle glow effects.
    3. **Theme Colors**: Primary: ${badge.gradientColors[0]}, Secondary: ${badge.gradientColors[1]}, Accent: ${badge.accentColor}. Use these for gradients.
    4. **Composition**: Central abstract symbol representing "${badge.icon}" or the concept of "${badge.name}", surrounded by a unique ornate data-ring or frame.
    5. **Uniqueness**: Use the "Seed Identity" to slightly alter the geometric patterns, number of rays, or path curves so it is mathematically unique to this merchant.
    6. **Background**: Transparent background (the card handle the background). This SVG is the central "GEM" or "MEDAL".
    7. **Dimensions**: Ensure all elements are contained within the 512x512 viewbox. Centered.

    Make it look expensive, authoritative, and celebratory.`;

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const response = await result.response;
    let text = response.text();

    // Clean up potential markdown code blocks if Gemini adds them despite instructions
    text = text.replace(/```svg/g, "").replace(/```/g, "").trim();

    return text;
  } catch (error) {
    console.error("Failed to generate badge artwork:", error);
    return null;
  }
}

// Generate AI background image using Gemini Imagen
export async function generateAIBackgroundImage(
  merchantName: string,
  merchantId: string,
  achievementType: string,
  tier: string,
  accentColor: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, using fallback background");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use Gemini 2.0 Flash with image generation capability
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-exp",
      generationConfig: {
        // @ts-expect-error - responseModalities is a valid config for image generation
        responseModalities: ["image", "text"],
      },
    });

    // Create unique seed for deterministic-ish generation
    const seedHash = hashString(merchantId + achievementType);
    
    // Choose a theme based on merchant ID for variety
    const themeIndex = seedHash % 4;
    const themes = [
      // Anime/Game Theme
      `anime-inspired fantasy scene, soft dreamy atmosphere, magical sparkles and light particles, 
       pastel and vibrant colors blending, ethereal glow effects, similar to Studio Ghibli or 
       fantasy RPG game art style, mystical clouds and floating elements`,
      
      // Floral Design
      `elegant floral pattern with blooming flowers, delicate petals and leaves, 
       botanical illustration style, roses, cherry blossoms, and wildflowers, 
       soft romantic aesthetic, garden paradise, nature's beauty`,
      
      // Abstract Stars/Cosmic
      `cosmic starfield with nebula clouds, galaxy swirls, shooting stars and stardust, 
       deep space atmosphere, aurora borealis effects, celestial wonder, 
       constellation patterns, interstellar dreamscape`,
      
      // Game/Digital Art
      `video game concept art style, RPG achievement unlock screen aesthetic, 
       magical power-up effects, glowing runes and symbols, fantasy game UI inspired, 
       legendary item reveal atmosphere, epic game moment celebration`,
    ];
    
    const selectedTheme = themes[themeIndex];
    
    // Map tier to color mood
    const tierMoods: Record<string, string> = {
      bronze: "warm amber, copper, and burnt orange tones",
      silver: "cool silver, icy blue, and moonlight white tones",
      gold: "rich gold, royal purple, and warm champagne tones", 
      platinum: "iridescent pearl, soft lavender, and ethereal white tones",
      diamond: "brilliant diamond white, prismatic rainbow, and crystal blue tones",
    };

    const tierMood = tierMoods[tier] || tierMoods.bronze;

    const prompt = `Create a beautiful background image for a premium achievement badge card.

Theme: ${selectedTheme}

Color Mood: ${tierMood} with accent color ${accentColor}
Style: Dreamy, soft, slightly blurred/out-of-focus aesthetic for use as a background
Atmosphere: Magical, celebratory, premium quality

Requirements:
- Size: 600x400 pixels, landscape orientation
- The image should have a soft, dreamy quality as it will be used as a blurred background
- Rich in color but not overwhelming
- No text, no faces, no specific characters
- Should evoke feelings of achievement and celebration
- Beautiful enough to be a collectible card background

Variation seed: ${seedHash % 1000}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Check for inline image data in the response
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        const partData = part as { inlineData?: { data: string; mimeType?: string } };
        if (partData.inlineData) {
          const imageData = partData.inlineData.data;
          const mimeType = partData.inlineData.mimeType || "image/png";
          return `data:${mimeType};base64,${imageData}`;
        }
      }
    }

    console.warn("No image data in Gemini response");
    return null;
  } catch (error) {
    console.error("Failed to generate AI background:", error);
    return null;
  }
}

// Generate a procedural PNG background as fallback (using canvas-like approach)
export function generateProceduralBackground(
  merchantId: string,
  merchantName: string,
  accentColor: string,
  gradientColors: [string, string]
): string {
  // Generate the SVG background and return it (will be rendered as image)
  return generateMerchantBackground(merchantId, merchantName, accentColor, gradientColors);
}

// Generate styled QR code with Sera branding as data URL
export async function generateQRCode(url: string): Promise<string> {
  try {
    // Generate QR code as PNG data URL (better Satori/ImageResponse compatibility)
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: "#059669", // Sera emerald green for QR modules
        light: "#ffffff", // White background
      },
      errorCorrectionLevel: "H", // High error correction
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw error;
  }
}

// Hash function for deterministic randomness
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Seeded random number generator for deterministic patterns
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate unique merchant background as SVG data URL
export function generateMerchantBackground(
  merchantId: string,
  merchantName: string,
  accentColor: string,
  gradientColors: [string, string]
): string {
  const seed = hashString(merchantId + merchantName);
  const random = seededRandom(seed);
  
  // Determine visual style based on merchant
  const styleVariant = seed % 6;
  
  // Generate unique color variations based on accent
  const hueShift = (seed % 60) - 30; // -30 to +30 degrees
  
  // Create SVG elements
  let svgContent = '';
  
  switch (styleVariant) {
    case 0: // Flowing waves
      svgContent = generateWavePattern(random, gradientColors, accentColor);
      break;
    case 1: // Geometric crystals
      svgContent = generateCrystalPattern(random, gradientColors, accentColor);
      break;
    case 2: // Constellation/stars
      svgContent = generateConstellationPattern(random, gradientColors, accentColor);
      break;
    case 3: // Abstract blobs
      svgContent = generateBlobPattern(random, gradientColors, accentColor);
      break;
    case 4: // Circuit/tech pattern
      svgContent = generateCircuitPattern(random, gradientColors, accentColor);
      break;
    default: // Gradient mesh
      svgContent = generateMeshPattern(random, gradientColors, accentColor);
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0a0a0a"/>
        <stop offset="50%" style="stop-color:#1a1a2e"/>
        <stop offset="100%" style="stop-color:#16213e"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${gradientColors[0]}"/>
        <stop offset="100%" style="stop-color:${gradientColors[1]}"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="400" fill="url(#bgGrad)"/>
    ${svgContent}
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function generateWavePattern(random: () => number, colors: [string, string], accent: string): string {
  let paths = '';
  const numWaves = 4 + Math.floor(random() * 3);
  
  for (let i = 0; i < numWaves; i++) {
    const y = 100 + random() * 200;
    const amplitude = 20 + random() * 40;
    const frequency = 0.01 + random() * 0.02;
    const phase = random() * Math.PI * 2;
    const opacity = 0.1 + random() * 0.15;
    
    let d = `M 0 ${y}`;
    for (let x = 0; x <= 600; x += 20) {
      const yOffset = Math.sin(x * frequency + phase) * amplitude;
      d += ` L ${x} ${y + yOffset}`;
    }
    d += ` L 600 400 L 0 400 Z`;
    
    const color = random() > 0.5 ? colors[0] : accent;
    paths += `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
  }
  
  // Add floating particles
  for (let i = 0; i < 20; i++) {
    const cx = random() * 600;
    const cy = random() * 400;
    const r = 1 + random() * 3;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" opacity="${0.2 + random() * 0.3}"/>`;
  }
  
  return paths;
}

function generateCrystalPattern(random: () => number, colors: [string, string], accent: string): string {
  let shapes = '';
  const numCrystals = 8 + Math.floor(random() * 6);
  
  for (let i = 0; i < numCrystals; i++) {
    const cx = random() * 600;
    const cy = random() * 400;
    const size = 30 + random() * 80;
    const sides = 4 + Math.floor(random() * 3);
    const rotation = random() * 360;
    const opacity = 0.05 + random() * 0.1;
    
    let points = '';
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2 - Math.PI / 2;
      const r = size * (0.7 + random() * 0.3);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      points += `${x},${y} `;
    }
    
    const color = random() > 0.5 ? colors[0] : colors[1];
    shapes += `<polygon points="${points}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${cx} ${cy})"/>`;
    
    // Inner glow
    shapes += `<polygon points="${points}" fill="none" stroke="${accent}" stroke-width="1" opacity="${opacity * 2}" transform="rotate(${rotation} ${cx} ${cy})" filter="url(#glow)"/>`;
  }
  
  return shapes;
}

function generateConstellationPattern(random: () => number, colors: [string, string], accent: string): string {
  let elements = '';
  const stars: Array<{x: number, y: number}> = [];
  const numStars = 25 + Math.floor(random() * 20);
  
  // Generate stars
  for (let i = 0; i < numStars; i++) {
    const x = random() * 600;
    const y = random() * 400;
    const r = 1 + random() * 2.5;
    const opacity = 0.3 + random() * 0.7;
    
    stars.push({x, y});
    elements += `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity="${opacity}" filter="url(#glow)"/>`;
  }
  
  // Connect nearby stars with lines
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dist = Math.sqrt(
        Math.pow(stars[i].x - stars[j].x, 2) + 
        Math.pow(stars[i].y - stars[j].y, 2)
      );
      if (dist < 100 && random() > 0.5) {
        elements += `<line x1="${stars[i].x}" y1="${stars[i].y}" x2="${stars[j].x}" y2="${stars[j].y}" 
          stroke="${colors[0]}" stroke-width="0.5" opacity="0.15"/>`;
      }
    }
  }
  
  // Add larger accent stars
  for (let i = 0; i < 3; i++) {
    const x = 100 + random() * 400;
    const y = 80 + random() * 240;
    elements += `<circle cx="${x}" cy="${y}" r="4" fill="${accent}" opacity="0.6" filter="url(#glow)"/>`;
  }
  
  return elements;
}

function generateBlobPattern(random: () => number, colors: [string, string], accent: string): string {
  let blobs = '';
  const numBlobs = 5 + Math.floor(random() * 4);
  
  for (let i = 0; i < numBlobs; i++) {
    const cx = random() * 600;
    const cy = random() * 400;
    const size = 60 + random() * 120;
    const opacity = 0.08 + random() * 0.1;
    
    // Generate organic blob shape using bezier curves
    const points: Array<{x: number, y: number}> = [];
    const numPoints = 6 + Math.floor(random() * 4);
    
    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2;
      const r = size * (0.6 + random() * 0.4);
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }
    
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let j = 0; j < points.length; j++) {
      const next = points[(j + 1) % points.length];
      const cp1x = points[j].x + (random() - 0.5) * 50;
      const cp1y = points[j].y + (random() - 0.5) * 50;
      const cp2x = next.x + (random() - 0.5) * 50;
      const cp2y = next.y + (random() - 0.5) * 50;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    d += ' Z';
    
    const color = [colors[0], colors[1], accent][Math.floor(random() * 3)];
    blobs += `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
  }
  
  return blobs;
}

function generateCircuitPattern(random: () => number, colors: [string, string], accent: string): string {
  let circuits = '';
  const gridSize = 40;
  
  // Generate circuit paths
  for (let i = 0; i < 15; i++) {
    const startX = Math.floor(random() * (600 / gridSize)) * gridSize;
    const startY = Math.floor(random() * (400 / gridSize)) * gridSize;
    
    let d = `M ${startX} ${startY}`;
    let x = startX;
    let y = startY;
    
    const pathLength = 4 + Math.floor(random() * 6);
    for (let j = 0; j < pathLength; j++) {
      const direction = Math.floor(random() * 4);
      const steps = 1 + Math.floor(random() * 3);
      
      switch (direction) {
        case 0: x += gridSize * steps; break;
        case 1: x -= gridSize * steps; break;
        case 2: y += gridSize * steps; break;
        case 3: y -= gridSize * steps; break;
      }
      
      x = Math.max(0, Math.min(600, x));
      y = Math.max(0, Math.min(400, y));
      d += ` L ${x} ${y}`;
    }
    
    const color = random() > 0.7 ? accent : colors[0];
    circuits += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1" opacity="0.2"/>`;
    
    // Add nodes at end points
    circuits += `<circle cx="${startX}" cy="${startY}" r="3" fill="${accent}" opacity="0.4"/>`;
    circuits += `<circle cx="${x}" cy="${y}" r="2" fill="${colors[1]}" opacity="0.3"/>`;
  }
  
  // Add dot matrix background
  for (let x = 20; x < 600; x += 60) {
    for (let y = 20; y < 400; y += 60) {
      if (random() > 0.6) {
        circuits += `<circle cx="${x}" cy="${y}" r="1" fill="${accent}" opacity="0.15"/>`;
      }
    }
  }
  
  return circuits;
}

function generateMeshPattern(random: () => number, colors: [string, string], accent: string): string {
  let mesh = '';
  
  // Create gradient mesh with overlapping ellipses
  const numEllipses = 6 + Math.floor(random() * 4);
  
  for (let i = 0; i < numEllipses; i++) {
    const cx = random() * 600;
    const cy = random() * 400;
    const rx = 80 + random() * 150;
    const ry = 60 + random() * 100;
    const rotation = random() * 360;
    const opacity = 0.08 + random() * 0.1;
    
    const color = [colors[0], colors[1], accent][Math.floor(random() * 3)];
    mesh += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" 
      fill="${color}" opacity="${opacity}" 
      transform="rotate(${rotation} ${cx} ${cy})"/>`;
  }
  
  // Add subtle grid overlay
  for (let x = 0; x < 600; x += 50) {
    mesh += `<line x1="${x}" y1="0" x2="${x}" y2="400" stroke="${accent}" stroke-width="0.5" opacity="0.03"/>`;
  }
  for (let y = 0; y < 400; y += 50) {
    mesh += `<line x1="0" y1="${y}" x2="600" y2="${y}" stroke="${accent}" stroke-width="0.5" opacity="0.03"/>`;
  }
  
  return mesh;
}

// Generate a unique pattern based on merchant ID for visual uniqueness
export function generateUniquePattern(merchantId: string): {
  patternType: string;
  rotation: number;
  scale: number;
  opacity: number;
  seed: number;
} {
  // Create a deterministic but unique pattern from the merchant ID
  const hash = hashString(merchantId);

  const patterns = ["circles", "hexagons", "waves", "dots", "grid", "circuit"];
  const patternIndex = hash % patterns.length;

  return {
    patternType: patterns[patternIndex],
    rotation: (Math.abs(hash) % 360),
    scale: 0.5 + (Math.abs(hash % 100) / 100) * 0.5,
    opacity: 0.05 + (Math.abs(hash % 20) / 100),
    seed: Math.abs(hash),
  };
}

// Badge card data structure
export interface BadgeCardData {
  merchantName: string;
  merchantId: string;
  achievementType: string;
  achievementName: string;
  achievementDescription: string;
  tier: string;
  icon: string;
  gradientColors: [string, string];
  accentColor: string;
  earnedAt: string;
  qrCodeUrl: string;
  platformUrl: string;
  uniqueArtwork?: string; // SVG String
  pattern: ReturnType<typeof generateUniquePattern>;
  cardId: string;
}

// Prepare badge card data
export async function prepareBadgeCardData(
  merchantName: string,
  merchantId: string,
  achievementType: string,
  earnedAt: Date
): Promise<BadgeCardData | null> {
  const badge = BADGE_DEFINITIONS[achievementType];
  if (!badge) return null;

  const platformUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://sera.veridex.io"}/verify/${merchantId}`;

  const [qrCodeUrl, uniqueArtwork] = await Promise.all([
    generateQRCode(platformUrl),
    generateUniqueBadgeArtwork(merchantName, achievementType, merchantId),
  ]);

  // Generate unique card ID
  const cardId = Buffer.from(`${merchantId}-${achievementType}-${earnedAt.getTime()}`).toString("base64").slice(0, 16);

  return {
    merchantName,
    merchantId,
    achievementType,
    achievementName: badge.name,
    achievementDescription: badge.description,
    tier: badge.tier,
    icon: badge.icon,
    gradientColors: badge.gradientColors,
    accentColor: badge.accentColor,
    earnedAt: earnedAt.toISOString(),
    qrCodeUrl,
    platformUrl,
    uniqueArtwork: uniqueArtwork || undefined,
    pattern: generateUniquePattern(merchantId),
    cardId,
  };
}
