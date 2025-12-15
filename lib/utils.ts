import { StylePreferences } from './types';

export function buildUserPreferences(
  art_style: string,
  mood: string,
  color_palette: string,
  character_style: string | null,
  line_style: string,
  composition: string,
  additional_notes: string
): StylePreferences {
  const preferences: StylePreferences = {};
  
  if (art_style && art_style !== "None") {
    preferences.art_style = art_style;
  }
  if (mood && mood !== "None") {
    preferences.mood = mood;
  }
  if (color_palette && color_palette !== "None") {
    preferences.color_palette = color_palette;
  }
  if (character_style && character_style !== "None") {
    preferences.character_style = character_style;
  }
  if (line_style && line_style !== "None") {
    preferences.line_style = line_style;
  }
  if (composition && composition !== "None") {
    preferences.composition = composition;
  }
  if (additional_notes && additional_notes.trim()) {
    preferences.additional_notes = additional_notes.trim();
  }
  
  return preferences;
}

export function getStyleInstructions(style_preferences: StylePreferences): string {
  if (!style_preferences) {
    return "";
  }
  
  const instructions: string[] = [];
  
  if (style_preferences.art_style) {
    instructions.push(`Art Style: ${style_preferences.art_style}`);
  }
  if (style_preferences.mood) {
    instructions.push(`Mood: ${style_preferences.mood}`);
  }
  if (style_preferences.color_palette) {
    instructions.push(`Color Palette: ${style_preferences.color_palette}`);
  }
  if (style_preferences.character_style) {
    instructions.push(`Character Style: ${style_preferences.character_style}`);
  }
  if (style_preferences.line_style) {
    instructions.push(`Line Style: ${style_preferences.line_style}`);
  }
  if (style_preferences.composition) {
    instructions.push(`Composition: ${style_preferences.composition}`);
  }
  if (style_preferences.additional_notes) {
    instructions.push(`Additional Notes: ${style_preferences.additional_notes}`);
  }
  
  return instructions.join("\n");
}

export function buildCharacterPrompt(character_description: string, style_preferences?: StylePreferences): string {
  let base_prompt = `
    Create a character image based on the following description:
    ${character_description}
    
    The character should be:
    - Entire character's body shows in the image
    - Clear and recognizable at small sizes
    - Well-defined silhouette
    - Character must face toward the right side (right-facing orientation, 3/4 view, not front-facing)
    - no background
    - no other objects
    - Consistent art style
    - Follow the reference image if provided
    - No shadows
    - CRITICAL: Absolutely NO text, letters, words, or any written characters should appear in the image. The image must contain ONLY the character visual, no text whatsoever.
    `;
  
  if (style_preferences) {
    const style_instructions = getStyleInstructions(style_preferences);
    if (style_instructions) {
      base_prompt += `\n\nStyle Requirements:\n${style_instructions}`;
    }
  }
  
  return base_prompt;
}

export function buildSpritePrompt(character_description: string, action: string, style_preferences?: StylePreferences): string {
  let base_prompt = `
    Create a 2D character sprite showing the character performing the action: ${action}
    
    Character description: ${character_description}
    
    The sprite should be:
    - Clear and recognizable at small sizes
    - Suitable for sprite animation
    - Well-defined silhouette
    - Consistent art style
    - Show the character in the middle of performing the action
    - Follow the reference image if provided
    - CRITICAL: Absolutely NO text, letters, words, or any written characters should appear in the image. The image must contain ONLY the character visual, no text whatsoever.
    `;
  
  if (style_preferences) {
    const style_instructions = getStyleInstructions(style_preferences);
    if (style_instructions) {
      base_prompt += `\n\nStyle Requirements:\n${style_instructions}`;
    }
  }
  
  return base_prompt;
}

export function buildBackgroundPrompt(background_description: string, orientation: string, style_preferences?: StylePreferences): string {
  const aspect_ratio = orientation === "landscape" ? "16:9" : "9:16";
  
  let base_prompt = `
    Create a 2D game background based on the following description:
    ${background_description}
    
    The background should be:
    - Designed for 2D games
    - ${orientation} orientation (${aspect_ratio} aspect ratio)
    - Suitable for parallax scrolling
    - Clear and detailed
    - Consistent art style
    - No characters or interactive elements
    - Follow the reference image if provided
    `;
  
  if (style_preferences) {
    const style_instructions = getStyleInstructions(style_preferences);
    if (style_instructions) {
      base_prompt += `\n\nStyle Requirements:\n${style_instructions}`;
    }
  }
  
  return base_prompt;
}

export function buildItemPrompt(item_description: string, style_preferences?: StylePreferences): string {
  let base_prompt = `
    Create a 2D game item sprite based on the following description:
    ${item_description}
    
    The item should be:
    - Designed for 2D games
    - Clear and recognizable at small sizes
    - Suitable for inventory systems
    - Well-defined silhouette
    - Consistent art style
    - Isolated on transparent background
    - Follow the reference image if provided
    `;
  
  if (style_preferences) {
    const style_instructions = getStyleInstructions(style_preferences);
    if (style_instructions) {
      base_prompt += `\n\nStyle Requirements:\n${style_instructions}`;
    }
  }
  
  return base_prompt;
}



