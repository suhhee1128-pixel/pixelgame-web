export interface StylePreferences {
  art_style?: string;
  mood?: string;
  color_palette?: string;
  character_style?: string;
  line_style?: string;
  composition?: string;
  additional_notes?: string;
}

export interface ConfigData {
  name: string;
  data: StylePreferences;
  created_at?: string;
  updated_at?: string;
}

export interface GenerationRequest {
  description: string;
  style_preferences?: StylePreferences;
  reference_image?: string;
  orientation?: 'landscape' | 'portrait';
  action?: string;
  actions?: string[];
  action_type?: 'attack' | 'jump';
  duration?: number;
  color?: string;
  mood?: string;
  weapon?: string;
}

export interface GenerationResponse {
  success: boolean;
  image_path?: string;
  image_url?: string;
  video_path?: string;
  video_url?: string;
  frames?: string[];
  message?: string;
  error?: string;
}

export const ART_STYLES = [
  "Traditional Manga/Anime",
  "Shonen (Bold, Dynamic)",
  "Shoujo (Soft, Romantic)",
  "Seinen (Mature, Detailed)",
  "Chibi (Cute, Simplified)",
  "Realistic",
  "Semi-Realistic",
  "Minimalist",
  "Dark/Gothic",
  "Cyberpunk",
  "Fantasy",
  "Horror",
  "Comedy/Cartoon"
];

export const MOOD_OPTIONS = [
  "Epic/Heroic",
  "Dark/Mysterious",
  "Light/Cheerful",
  "Dramatic/Intense",
  "Romantic",
  "Action-Packed",
  "Peaceful/Serene",
  "Suspenseful",
  "Melancholic",
  "Whimsical"
];

export const COLOR_PALETTES = [
  "Full Color",
  "Black and White",
  "Sepia/Vintage",
  "Monochromatic Blue",
  "Monochromatic Red",
  "Warm Tones",
  "Cool Tones",
  "High Contrast",
  "Pastel Colors",
  "Neon/Vibrant"
];

export const CHARACTER_STYLES = [
  "Detailed/Realistic",
  "Stylized/Expressive",
  "Simple/Clean",
  "Muscular/Athletic",
  "Elegant/Graceful",
  "Cute/Moe",
  "Mature/Adult",
  "Young/Teen",
  "Fantasy/Otherworldly"
];

export const LINE_STYLES = [
  "Clean/Precise",
  "Rough/Sketchy",
  "Bold/Thick",
  "Fine/Delicate",
  "Variable Weight",
  "Minimalist",
  "Detailed/Complex"
];

export const COMPOSITION_STYLES = [
  "Dynamic/Action",
  "Balanced/Stable",
  "Asymmetrical",
  "Close-up Focus",
  "Wide/Environmental",
  "Dramatic Angles",
  "Traditional/Conservative"
];

export const DEFAULT_CHOICES = ["None"];

// --- Game Character & Stats System Definitions ---

export interface CharacterStats {
  hp: number;
  maxHp: number;
  atk: number;
  def?: number;
  speed?: number;
}

export interface Character {
  id: string;
  name: string;
  type?: string;
  imageUrl: string;
  description?: string;
  
  stats: CharacterStats;
  
  // Sprite Frames (Optional)
  spriteFrames?: {
    idle?: string[];
    attack?: string[];
    attack2?: string[];
    jump?: string[];
    dead?: string[];
    defense?: string[];
  };
  
  createdAt: string;
  updatedAt?: string;
  winCount?: number;
}

export interface Enemy {
  id: string;
  name: string;
  imageUrl: string;
  stats: CharacterStats;
  pattern: ('attack1' | 'attack2' | 'wait')[];
  attackDamage: {
    attack1: number;
    attack2: number;
  };
}
