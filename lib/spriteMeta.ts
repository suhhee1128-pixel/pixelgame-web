// Sprite Metadata - Design Asset Truth (Do NOT calculate, measure from image)
// These values are the "ground truth" from the sprite assets

export const ENEMY_SPRITE = {
  // Frame dimensions (visual only, NOT used for collision)
  W: 2039,
  H: 1088,

  // Pivot point in frame coordinates (where character's foot/center is in the frame)
  // ⚠️ These must be measured from the actual sprite image, not calculated
  PIVOT_X: 1555, // Character body center X in frame (adjusted by user)
  PIVOT_Y: 1200,  // Character foot Y in frame
  
  // Render scale (to match previous visual size: 247x133)
  // Calculated: 247/2039 ≈ 0.121, 133/1088 ≈ 0.122
  RENDER_SCALE: 0.121
};

// Player sprite metadata (if different from enemy)
export const PLAYER_SPRITE = {
  // Will be defined when needed
  W: 0,
  H: 0,
  PIVOT_X: 0,
  PIVOT_Y: 0
};
