import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { StylePreferences } from './types';
import { buildCharacterPrompt, buildSpritePrompt, buildBackgroundPrompt, buildItemPrompt, getStyleInstructions } from './utils';

export class GameAssetGenerator {
  private apiKey: string;
  private outputDir: string;
  private characterDir: string;
  private backgroundDir: string;
  private itemDir: string;
  public referenceDir: string;
  private imageGenModelName: string;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.error('GEMINI_API_KEY is missing from environment variables');
      throw new Error('GEMINI_API_KEY is required but not found in environment variables.');
    }

    // Use /tmp in Vercel (serverless), otherwise use data/output
    this.outputDir = process.env.VERCEL ? '/tmp/output' : (process.env.OUTPUT_DIR || 'data/output');
    this.characterDir = path.join(this.outputDir, 'characters');
    this.backgroundDir = path.join(this.outputDir, 'backgrounds');
    this.itemDir = path.join(this.outputDir, 'items');
    this.referenceDir = path.join(this.outputDir, 'references');
    this.imageGenModelName = process.env.IMAGE_MODEL_NAME || 'gemini-2.5-flash-image-preview';

    // Ensure output directories exist
    try {
      fs.ensureDirSync(this.outputDir);
      fs.ensureDirSync(this.characterDir);
      fs.ensureDirSync(this.backgroundDir);
      fs.ensureDirSync(this.itemDir);
      fs.ensureDirSync(this.referenceDir);
    } catch (error) {
      console.warn('Warning: Could not create output directories:', error);
      // In Vercel, /tmp should always exist, but if it fails, we'll handle it gracefully
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async saveReferenceImage(uploadedFile: Express.Multer.File): Promise<string | null> {
    if (!uploadedFile) {
      return null;
    }

    try {
      const timestamp = Date.now();
      const filename = `reference_${timestamp}.png`;
      const referencePath = path.join(this.referenceDir, filename);

      await fs.copy(uploadedFile.path, referencePath);
      return referencePath;
    } catch (error) {
      console.error('Error saving reference image:', error);
      return null;
    }
  }

  async generateCharacterImage(
    characterDescription: string,
    stylePreferences?: StylePreferences,
    referenceImagePath?: string
  ): Promise<{ imagePath: string; imageUrl: string }> {
    const prompt = buildCharacterPrompt(characterDescription, stylePreferences);
    
    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    
    let contents: any[] = [prompt];
    
    if (referenceImagePath && await fs.pathExists(referenceImagePath)) {
      const imageBuffer = await fs.readFile(referenceImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/png'
        }
      });
    }

    const result = await model.generateContent(contents);
    const response = await result.response;

    // Save image
    const timestamp = Date.now();
    const filename = `character_${timestamp}.png`;
    const outputPath = path.join(this.characterDir, filename);

    // Extract image from response
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imageData) {
      const imageBuffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(outputPath, imageBuffer);
      const relativePath = path.relative(this.outputDir, outputPath);
      const imageUrl = `/api/images/${relativePath.replace(/\\/g, '/')}`;
      return { imagePath: outputPath, imageUrl };
    }

    throw new Error('No image generated in response');
  }

  async generateCharacterSprites(
    characterDescription: string,
    actions: string[],
    stylePreferences?: StylePreferences,
    referenceImagePath?: string
  ): Promise<{ action: string; imagePath: string; imageUrl: string }[]> {
    const generatedSprites = [];

    for (const action of actions) {
      const prompt = buildSpritePrompt(characterDescription, action, stylePreferences);
      
      const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
      
      let contents: any[] = [prompt];
      
      if (referenceImagePath && await fs.pathExists(referenceImagePath)) {
        const imageBuffer = await fs.readFile(referenceImagePath);
        const imageBase64 = imageBuffer.toString('base64');
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: 'image/png'
          }
        });
      }

      const result = await model.generateContent(contents);
      const response = await result.response;

      const timestamp = Date.now();
      const filename = `character_${action}_${timestamp}.png`;
      const outputPath = path.join(this.characterDir, filename);

      const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (imageData) {
        const imageBuffer = Buffer.from(imageData, 'base64');
        await fs.writeFile(outputPath, imageBuffer);
        const imageUrl = `/api/images/${filename}`;
        generatedSprites.push({ action, imagePath: outputPath, imageUrl });
      }
    }

    return generatedSprites;
  }

  async generateBackgroundImage(
    backgroundDescription: string,
    orientation: 'landscape' | 'portrait',
    stylePreferences?: StylePreferences
  ): Promise<{ imagePath: string; imageUrl: string }> {
    const prompt = buildBackgroundPrompt(backgroundDescription, orientation, stylePreferences);
    
    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    const result = await model.generateContent([prompt]);
    const response = await result.response;

    const timestamp = Date.now();
    const filename = `background_${orientation}_${timestamp}.png`;
    const outputPath = path.join(this.backgroundDir, filename);

    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imageData) {
      const imageBuffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(outputPath, imageBuffer);
      const relativePath = path.relative(this.outputDir, outputPath);
      const imageUrl = `/api/images/${relativePath.replace(/\\/g, '/')}`;
      return { imagePath: outputPath, imageUrl };
    }

    throw new Error('No image generated in response');
  }

  async generateItemImage(
    itemDescription: string,
    stylePreferences?: StylePreferences,
    referenceImagePath?: string
  ): Promise<{ imagePath: string; imageUrl: string }> {
    const prompt = buildItemPrompt(itemDescription, stylePreferences);
    
    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    
    let contents: any[] = [prompt];
    
    if (referenceImagePath && await fs.pathExists(referenceImagePath)) {
      const imageBuffer = await fs.readFile(referenceImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/png'
        }
      });
    }

    const result = await model.generateContent(contents);
    const response = await result.response;

    const timestamp = Date.now();
    const filename = `item_${timestamp}.png`;
    const outputPath = path.join(this.itemDir, filename);

    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imageData) {
      const imageBuffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(outputPath, imageBuffer);
      const relativePath = path.relative(this.outputDir, outputPath);
      const imageUrl = `/api/images/${relativePath.replace(/\\/g, '/')}`;
      return { imagePath: outputPath, imageUrl };
    }

    throw new Error('No image generated in response');
  }

  async generateSpriteAnimation(
    referenceImagePath: string,
    actionType: 'attack' | 'jump' | 'dead' | 'defense' | 'attack2'
  ): Promise<{ imagePath: string; imageUrl: string }[]> {
    if (actionType === 'dead') {
      return this.generateDeadAnimation(referenceImagePath);
    }
    if (actionType === 'defense') {
      return this.generateDefenseAnimation(referenceImagePath);
    }
    if (actionType === 'attack2') {
      return this.generateAttack2Animation(referenceImagePath);
    }

    const generatedImages: string[] = [];
    
    // Add original reference image as first frame
    generatedImages.push(referenceImagePath);

    // Define frame prompts based on action type
    const framePrompts = actionType === 'attack' ? {
      frame1_idle: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, idle ready stance: head slightly turned right, calm eyes forward, torso upright and relaxed, right hand holding weapon low at side, left arm resting naturally, feet shoulder-width apart, faint small glow at weapon tip, transparent background. 

Weapon consistency rule: The weapon must remain EXACTLY the same as in the reference image — same shape, size, color, and design details. Do NOT change or redesign the weapon in any way. The character must hold the same weapon throughout all frames.

CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame2_chargeup: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, charge-up pose: head focused on weapon tip, torso leaning slightly back, right arm lifting weapon upward with elbow bent, left hand balancing or supporting, feet stable with weight shifted backward, small glowing orb forming at weapon tip with spark particles, transparent background. CRITICAL: Character must face RIGHT direction.`,
      frame3_aim: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, pre-attack aiming pose: head locked forward with fierce focus, torso leaning slightly forward, right arm extending weapon forward, left arm balancing near chest, front foot pressing down, energy orb at weapon tip growing brighter with small electric arcs, transparent background. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame4_lunge: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lunge attack-prep pose: head determined and looking forward, torso thrust forward, right arm fully extended pushing weapon ahead, left arm stretched back for balance, front leg stepping forward bearing weight, weapon tip glowing at peak intensity with bright aura and motion trails, transparent background. CRITICAL: Character must face RIGHT direction, same as other frames. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame5_impact: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, attack impact pose: head focused forward, torso leaning into the strike, right arm extended holding weapon, left arm offset for balance, front foot planted, massive energy burst from weapon tip with bright white core and colored shockwave rings, spark particles around, transparent background. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame6_aftershock: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, aftershock dissipate pose: head slightly lowered but still facing right, expression calm but focused, torso slightly leaned forward holding weapon extended after impact, both hands steady but relaxed, feet fixed in same stance as impact frame. 
Bright energy from weapon tip has just faded — residual pink light rings expand outward, fading into transparency with soft glow, small spark particles dispersing and disappearing, faint motion blur suggesting energy release completion. 
Transparent background. CRITICAL: Character must face RIGHT direction, maintain same pivot and proportions as previous frames. Absolutely NO text, letters, words, or any written characters should appear in the image.`
    } : {
      frame1_prepare: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump preparation pose: head slightly tilted down, eyes forward, torso slightly crouched, knees bent, right hand holding the same weapon low near waist, left arm slightly back for balance, feet shoulder-width pressing down as if gathering strength to jump. 
Transparent background. Maintain SAME weapon design/shape/size/colors as reference; 1:1 head-to-body, two arms two legs, SAME pivot as other actions. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame2_launch: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump launch pose: head oriented slightly upward, torso pushing upward dynamically, both legs extending from crouch, right arm pulling weapon slightly backward for momentum, left arm forward balancing, small dust particles under feet. 
Transparent background. SAME weapon & proportions & pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame3_air_rise: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, mid-air rising pose: head slightly up, torso extended, legs tucked slightly toward body, right arm holding weapon diagonally across the front, left arm extended backward for balance, faint motion lines beneath character. 
Transparent background. SAME weapon, SAME pivot, 1:1 chibi. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame4_air_peak: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump apex pose: head level, torso upright, both legs lightly bent as if floating at the top, right arm steady holding weapon horizontally, left arm relaxed near side, subtle floating particles around. 
Transparent background. SAME weapon & proportions & pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame5_air_fall: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, descending pose: head angled slightly downward, torso leaning a bit forward, right arm and weapon angled downward preparing to land, left arm behind for balance, legs extended downward with knees slightly bent, thin downward motion trails. 
Transparent background. SAME weapon & pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame6_land: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, landing impact pose: head slightly forward, torso lowered with deep knee bend, front foot planted, back foot heel lifted, right hand gripping weapon forward for stability, small dust clouds under feet and a tiny shock ring. 
Transparent background. Maintain SAME weapon (no redesign), 1:1 ratio, two arms two legs, SAME pivot as previous frames. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`
    };

    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    const referenceImageBuffer = await fs.readFile(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');

    // Generate all frames
    for (const [frameName, prompt] of Object.entries(framePrompts)) {
      try {
        const contents = [
          prompt,
          {
            inlineData: {
              data: referenceImageBase64,
              mimeType: 'image/png'
            }
          }
        ];

        const result = await model.generateContent(contents);
        const response = await result.response;

        const timestamp = Date.now();
        const filename = `${actionType}_${frameName}_${timestamp}.png`;
        const outputPath = path.join(this.characterDir, filename);

        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (imageData) {
          const imageBuffer = Buffer.from(imageData, 'base64');
          await fs.writeFile(outputPath, imageBuffer);
          generatedImages.push(outputPath);
          // Wait a bit to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error generating ${frameName}:`, error);
        // Continue with other frames even if one fails
      }
    }

    // Create combined sprite sheet if we have enough frames
    if (generatedImages.length >= 7) {
      try {
        console.log('🎨 Creating combined sprite sheet...');
        
        // Load first image to get base height
        const firstImageMeta = await sharp(generatedImages[0]).metadata();
        const baseHeight = firstImageMeta.height || 100;
        
        // Resize all images to the same height and get their buffers and widths
        const resizedImages = await Promise.all(
          generatedImages.map(async (imgPath) => {
            const metadata = await sharp(imgPath).metadata();
            const aspectRatio = (metadata.width || 100) / (metadata.height || 100);
            const newWidth = Math.round(baseHeight * aspectRatio);
            
            const buffer = await sharp(imgPath)
              .resize(newWidth, baseHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer();
            
            return { buffer, width: newWidth };
          })
        );
        
        const totalWidth = resizedImages.reduce((sum, img) => sum + img.width, 0);
        
        // Create combined image using composite
        let leftOffset = 0;
        const composites = resizedImages.map((img) => {
          const composite = {
            input: img.buffer,
            left: leftOffset,
            top: 0
          };
          leftOffset += img.width;
          return composite;
        });
        
        const timestamp = Date.now();
        const combinedFilename = `${actionType}_combined_${timestamp}.png`;
        const combinedPath = path.join(this.characterDir, combinedFilename);
        
        await sharp({
          create: {
            width: totalWidth,
            height: baseHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
          .composite(composites)
          .png()
          .toFile(combinedPath);
        
        console.log(`✅ Combined sprite sheet saved: ${combinedPath}`);
        generatedImages.push(combinedPath);
      } catch (error) {
        console.error('⚠️ Failed to create combined sprite sheet:', error);
        // Continue without combined sheet
      }
    }
    
    return generatedImages.map(imgPath => {
      const relativePath = path.relative(this.outputDir, imgPath);
      return {
        imagePath: imgPath,
        imageUrl: `/api/images/${relativePath.replace(/\\/g, '/')}`
      };
    });
  }

  async generateDeadAnimation(
    referenceImagePath: string
  ): Promise<{ imagePath: string; imageUrl: string }[]> {
    const generatedImages: string[] = [];
    
    // Add original reference image as first frame
    generatedImages.push(referenceImagePath);

    const framePrompts = {
      frame1_hit_recoil: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, just hit by a strong impact. 
Head snapping backward LEFT of torso, eyes wide open with pain or shock, eyebrows sharply raised. 
Mouth open in a small gasp, torso bending back 15°, one foot losing balance.
Both arms flail from recoil, weapon shaking loosely in hand.
Expression: stunned and in pain — NOT calm. Transparent background. SAME weapon (shape/color/size). CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame2_knockback_airborne: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lifted into the air mid-knockback.
Head still LEFT of body but tilted back further, eyes half-open with fading awareness, mouth slightly open as if gasping mid-air.
Torso rotated backward about 45°, legs lifting higher to the RIGHT, arms spread from inertia.
Expression: dazed and slipping consciousness. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame3_mid_flip: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, mid-air slow rotation between falling and upside-down.
Head still LEFT of legs, slightly lower than torso (about 75° rotation from upright).
Torso diagonal with chest pointing upward-left, legs slightly higher toward RIGHT.
Both arms extended diagonally from body, following spin inertia.
Expression fading — eyes half-closed, mouth small and tense.
Weapon tilting backward along spin, still in hand. Gravity acts downward, rotation CLOCKWISE, not too steep. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame4_fall_transition: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, descending mid-fall rotation.
Head LEFT of legs but now lower, near horizontal level (about 140° rotation from upright).
Torso curved slightly backward, legs still higher to RIGHT.
Arms and weapon trailing downward naturally from momentum.
Expression weak, eyes mostly closed, body showing limpness.
Gravity pulls character down, maintaining CLOCKWISE rotation (head always LEFT of legs).
Transparent background. SAME weapon/pivot/proportion. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame5_rest: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lying motionless on ground.
Head LEFT of torso, resting sideways; eyes fully closed; mouth slightly parted; expression devoid of life, limbs relaxed and heavy.
Weapon on the ground next to hand, no glow, no movement.
No peace, no smile — just weight and stillness. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`
    };

    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    const referenceImageBuffer = await fs.readFile(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');

    // Generate all frames
    for (const [frameName, prompt] of Object.entries(framePrompts)) {
      try {
        const contents = [
          prompt,
          {
            inlineData: {
              data: referenceImageBase64,
              mimeType: 'image/png'
            }
          }
        ];

        const result = await model.generateContent(contents);
        const response = await result.response;

        const timestamp = Date.now();
        const filename = `dead_${frameName}_${timestamp}.png`;
        const outputPath = path.join(this.characterDir, filename);

        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (imageData) {
          const imageBuffer = Buffer.from(imageData, 'base64');
          await fs.writeFile(outputPath, imageBuffer);
          generatedImages.push(outputPath);
          // Wait a bit to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error generating ${frameName}:`, error);
        // Continue with other frames even if one fails
      }
    }

    // Create combined sprite sheet if we have enough frames
    if (generatedImages.length >= 6) {
      try {
        console.log('🎨 Creating combined sprite sheet...');
        
        // Load first image to get base height
        const firstImageMeta = await sharp(generatedImages[0]).metadata();
        const baseHeight = firstImageMeta.height || 100;
        
        // Resize all images to the same height and get their buffers and widths
        const resizedImages = await Promise.all(
          generatedImages.map(async (imgPath) => {
            const metadata = await sharp(imgPath).metadata();
            const aspectRatio = (metadata.width || 100) / (metadata.height || 100);
            const newWidth = Math.round(baseHeight * aspectRatio);
            
            const buffer = await sharp(imgPath)
              .resize(newWidth, baseHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer();
            
            return { buffer, width: newWidth };
          })
        );
        
        const totalWidth = resizedImages.reduce((sum, img) => sum + img.width, 0);
        
        // Create combined image using composite
        let leftOffset = 0;
        const composites = resizedImages.map((img) => {
          const composite = {
            input: img.buffer,
            left: leftOffset,
            top: 0
          };
          leftOffset += img.width;
          return composite;
        });
        
        const timestamp = Date.now();
        const combinedFilename = `dead_combined_${timestamp}.png`;
        const combinedPath = path.join(this.characterDir, combinedFilename);
        
        await sharp({
          create: {
            width: totalWidth,
            height: baseHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
          .composite(composites)
          .png()
          .toFile(combinedPath);
        
        console.log(`✅ Combined sprite sheet saved: ${combinedPath}`);
        generatedImages.push(combinedPath);
      } catch (error) {
        console.error('⚠️ Failed to create combined sprite sheet:', error);
        // Continue without combined sheet
      }
    }
    
    return generatedImages.map(imgPath => {
      const relativePath = path.relative(this.outputDir, imgPath);
      return {
        imagePath: imgPath,
        imageUrl: `/api/images/${relativePath.replace(/\\/g, '/')}`
      };
    });
  }

  async generateDefenseAnimation(
    referenceImagePath: string
  ): Promise<{ imagePath: string; imageUrl: string }[]> {
    const generatedImages: string[] = [];
    
    // Add original reference image as first frame
    generatedImages.push(referenceImagePath);

    const framePrompts = {
      frame1_idle_guard: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, idle defensive stance:
head slightly tilted right, eyes calm but alert,
torso upright with slight tension,
right hand holding the SAME weapon firmly but lowered in a guarded resting position,
left arm raised slightly near torso forming a natural defensive posture,
feet shoulder-width apart, weight centered,
a faint soft glow at the weapon tip,
transparent background.
Weapon consistency rule: The weapon must remain EXACTLY the same as in the reference image — shape, size, color, and all design details unchanged.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame2_shield_up: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, defensive “shield-up” pose:
head focused forward,
torso leaning slightly backward for bracing,
right arm lifting weapon diagonally upward as if blocking incoming force,
left hand raised near chest for balance or secondary guard,
feet anchored strongly with weight shifted back,
small protective energy shimmer forming around weapon tip,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame3_pre_block: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, preparing to block impact:
head sharply focused,
torso leaning forward slightly,
right arm holding weapon horizontally/diagonally in a hardened guard position,
left arm tensed and positioned near torso for stability,
front foot pressing firmly into the ground,
weapon tip emitting brighter defensive energy with thin shimmering lines,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame4_impact_block: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, blocking an incoming strike:
head determined, eyes tight,
torso braced and compressed from force,
right arm fully engaged holding weapon in a strong blocking angle,
left arm extended backward to counterbalance recoil,
front leg bent absorbing impact,
weapon tip generating a strong defensive aura with bright burst sparks at point of contact,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame5_block_shockwave: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, receiving major impact:
head clenched,
torso leaning forward into the force,
right arm still holding weapon firmly blocking the attack,
left arm extended wide for balance,
front foot nailed to the ground,
a large defensive energy burst (white core + color shockwave rings) exploding outward upon impact,
scattered spark particles around weapon tip,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame6_guard_recovery: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, post-block recovery stance:
head lowered slightly but still facing right,
expression calm but focused,
torso leaned forward holding weapon still lifted in guard,
both hands steady but relaxed,
feet unchanged from previous frame,
energy at weapon tip fading — soft pink or blue residual rings expanding outwards,
tiny spark fragments dissipating into transparency,
light motion blur showing final energy dissipation,
transparent background.
CRITICAL: Character must face RIGHT direction, maintain same pivot, proportions, and weapon. Absolutely NO text, letters, words, or any written characters should appear in the image.`
    };

    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    const referenceImageBuffer = await fs.readFile(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');

    for (const [frameName, prompt] of Object.entries(framePrompts)) {
      try {
        const contents = [
          prompt,
          {
            inlineData: {
              data: referenceImageBase64,
              mimeType: 'image/png'
            }
          }
        ];

        const result = await model.generateContent(contents);
        const response = await result.response;

        const timestamp = Date.now();
        const filename = `defense_${frameName}_${timestamp}.png`;
        const outputPath = path.join(this.characterDir, filename);

        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (imageData) {
          const imageBuffer = Buffer.from(imageData, 'base64');
          await fs.writeFile(outputPath, imageBuffer);
          generatedImages.push(outputPath);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error generating ${frameName}:`, error);
      }
    }

    // Create combined sprite sheet
    if (generatedImages.length >= 7) {
      try {
        console.log('🎨 Creating combined sprite sheet...');
        const firstImageMeta = await sharp(generatedImages[0]).metadata();
        const baseHeight = firstImageMeta.height || 100;
        
        const resizedImages = await Promise.all(
          generatedImages.map(async (imgPath) => {
            const metadata = await sharp(imgPath).metadata();
            const aspectRatio = (metadata.width || 100) / (metadata.height || 100);
            const newWidth = Math.round(baseHeight * aspectRatio);
            const buffer = await sharp(imgPath)
              .resize(newWidth, baseHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png().toBuffer();
            return { buffer, width: newWidth };
          })
        );
        
        const totalWidth = resizedImages.reduce((sum, img) => sum + img.width, 0);
        let leftOffset = 0;
        const composites = resizedImages.map((img) => {
          const composite = { input: img.buffer, left: leftOffset, top: 0 };
          leftOffset += img.width;
          return composite;
        });
        
        const timestamp = Date.now();
        const combinedFilename = `defense_combined_${timestamp}.png`;
        const combinedPath = path.join(this.characterDir, combinedFilename);
        
        await sharp({
          create: { width: totalWidth, height: baseHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        }).composite(composites).png().toFile(combinedPath);
        
        console.log(`✅ Combined sprite sheet saved: ${combinedPath}`);
        generatedImages.push(combinedPath);
      } catch (error) { console.error('⚠️ Failed to create combined sprite sheet:', error); }
    }
    
    return generatedImages.map(imgPath => {
      const relativePath = path.relative(this.outputDir, imgPath);
      return { imagePath: imgPath, imageUrl: `/api/images/${relativePath.replace(/\\/g, '/')}` };
    });
  }

  async generateAttack2Animation(
    referenceImagePath: string
  ): Promise<{ imagePath: string; imageUrl: string }[]> {
    const generatedImages: string[] = [];
    
    // Add original reference image as first frame
    generatedImages.push(referenceImagePath);

    const framePrompts = {
      frame1_idle_guard: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, idle defensive stance:
head slightly tilted right, eyes calm but alert,
torso upright with slight tension,
right hand holding the SAME weapon firmly but lowered in a guarded resting position,
left arm raised slightly near torso forming a natural defensive posture,
feet shoulder-width apart, weight centered,
a faint soft glow at the weapon tip,
transparent background.
Weapon consistency rule: The weapon must remain EXACTLY the same as in the reference image — shape, size, color, and all design details unchanged.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame2_shield_up: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, defensive “shield-up” pose:
head focused forward,
torso leaning slightly backward for bracing,
right arm lifting weapon diagonally upward as if blocking incoming force,
left hand raised near chest for balance or secondary guard,
feet anchored strongly with weight shifted back,
small protective energy shimmer forming around weapon tip,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame3_pre_block: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, preparing to block impact:
head sharply focused,
torso leaning forward slightly,
right arm holding weapon horizontally/diagonally in a hardened guard position,
left arm tensed and positioned near torso for stability,
front foot pressing firmly into the ground,
weapon tip emitting brighter defensive energy with thin shimmering lines,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame4_impact_block: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, blocking an incoming strike:
head determined, eyes tight,
torso braced and compressed from force,
right arm fully engaged holding weapon in a strong blocking angle,
left arm extended backward to counterbalance recoil,
front leg bent absorbing impact,
weapon tip generating a strong defensive aura with bright burst sparks at point of contact,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame5_block_shockwave: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, receiving major impact:
head clenched,
torso leaning forward into the force,
right arm still holding weapon firmly blocking the attack,
left arm extended wide for balance,
front foot nailed to the ground,
a large defensive energy burst (white core + color shockwave rings) exploding outward upon impact,
scattered spark particles around weapon tip,
transparent background.
CRITICAL: Character must face RIGHT direction. Absolutely NO text, letters, words, or any written characters should appear in the image.`,
      frame6_guard_recovery: `다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, post-block recovery stance:
head lowered slightly but still facing right,
expression calm but focused,
torso leaned forward holding weapon still lifted in guard,
both hands steady but relaxed,
feet unchanged from previous frame,
energy at weapon tip fading — soft pink or blue residual rings expanding outwards,
tiny spark fragments dissipating into transparency,
light motion blur showing final energy dissipation,
transparent background.
CRITICAL: Character must face RIGHT direction, maintain same pivot, proportions, and weapon. Absolutely NO text, letters, words, or any written characters should appear in the image.`
    };

    const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
    const referenceImageBuffer = await fs.readFile(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');

    for (const [frameName, prompt] of Object.entries(framePrompts)) {
      try {
        const contents = [
          prompt,
          {
            inlineData: {
              data: referenceImageBase64,
              mimeType: 'image/png'
            }
          }
        ];

        const result = await model.generateContent(contents);
        const response = await result.response;

        const timestamp = Date.now();
        const filename = `attack2_${frameName}_${timestamp}.png`;
        const outputPath = path.join(this.characterDir, filename);

        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (imageData) {
          const imageBuffer = Buffer.from(imageData, 'base64');
          await fs.writeFile(outputPath, imageBuffer);
          generatedImages.push(outputPath);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`Error generating ${frameName}:`, error);
      }
    }

    // Create combined sprite sheet
    if (generatedImages.length >= 7) {
      try {
        console.log('🎨 Creating combined sprite sheet...');
        const firstImageMeta = await sharp(generatedImages[0]).metadata();
        const baseHeight = firstImageMeta.height || 100;
        
        const resizedImages = await Promise.all(
          generatedImages.map(async (imgPath) => {
            const metadata = await sharp(imgPath).metadata();
            const aspectRatio = (metadata.width || 100) / (metadata.height || 100);
            const newWidth = Math.round(baseHeight * aspectRatio);
            const buffer = await sharp(imgPath)
              .resize(newWidth, baseHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png().toBuffer();
            return { buffer, width: newWidth };
          })
        );
        
        const totalWidth = resizedImages.reduce((sum, img) => sum + img.width, 0);
        let leftOffset = 0;
        const composites = resizedImages.map((img) => {
          const composite = { input: img.buffer, left: leftOffset, top: 0 };
          leftOffset += img.width;
          return composite;
        });
        
        const timestamp = Date.now();
        const combinedFilename = `attack2_combined_${timestamp}.png`;
        const combinedPath = path.join(this.characterDir, combinedFilename);
        
        await sharp({
          create: { width: totalWidth, height: baseHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        }).composite(composites).png().toFile(combinedPath);
        
        console.log(`✅ Combined sprite sheet saved: ${combinedPath}`);
        generatedImages.push(combinedPath);
      } catch (error) { console.error('⚠️ Failed to create combined sprite sheet:', error); }
    }
    
    return generatedImages.map(imgPath => {
      const relativePath = path.relative(this.outputDir, imgPath);
      return { imagePath: imgPath, imageUrl: `/api/images/${relativePath.replace(/\\/g, '/')}` };
    });
  }

  async generatePixelCharacter(
    description: string,
    color?: string,
    mood?: string,
    weapon?: string
  ): Promise<{ imagePath: string; imageUrl: string }> {
    try {
      console.log('Generating pixel character with:', { description, color, mood, weapon });
      
      let prompt = "Create a PIXEL ART character sprite with these specifications:\n\n";
      prompt += `Character: ${description}\n`;
      prompt += "CRITICAL: Absolutely NO text, letters, words, or any written characters should appear in the image. The image must contain ONLY the character visual, no text whatsoever.\n\n";
      
      if (color && color !== "None") {
        prompt += `Primary color scheme: ${color}\n`;
      }
      if (mood && mood !== "None") {
        prompt += `Overall mood: ${mood}\n`;
      }
      if (weapon && weapon !== "None") {
        prompt += `Weapon: ${weapon}\n`;
      }
      
      prompt += "\nMANDATORY PIXEL ART STYLE REQUIREMENTS:\n";
      prompt += "- **CONSISTENT STYLE**: Must look like it came from the same game/site as other characters\n";
      prompt += "- **PIXEL ART ONLY**: Retro pixel art style, NOT smooth/realistic art\n";
      prompt += "- **CHIBI PROPORTIONS**: Large head, small body - cute deformed style\n";
      prompt += "- **HEAD TO BODY RATIO: 1:1** - Head size MUST equal body size (equal proportions)\n";
      prompt += "- Clear pixelated edges, visible individual pixels\n";
      prompt += "- Limited color palette (8-16 colors recommended)\n";
      prompt += "- Clean pixel-perfect outlines\n";
      prompt += "- Character must face toward the right side (right-facing orientation, 3/4 view, not front-facing)\n";
      prompt += "- Single character, centered composition\n";
      prompt += "- White background (will be made transparent)\n";
      prompt += "- Game sprite aesthetic (like 8-bit, 16-bit, or 32-bit era)\n";
      prompt += "- Sharp, blocky pixel style - NOT anti-aliated or smooth\n";
      prompt += "- Retro video game character design\n";
      prompt += "- IMPORTANT: Face/head height = body height (1:1 ratio)\n";
      prompt += "- **UNIFORM STYLE**: Same art style, proportions, and rendering as reference characters\n";
      prompt += "- **CRITICAL**: Absolutely NO text, letters, words, or any written characters should appear in the image. The image must contain ONLY the character visual, no text whatsoever.\n";
      
      console.log('Calling Gemini API with model:', this.imageGenModelName);
      const model = this.genAI.getGenerativeModel({ model: this.imageGenModelName });
      const result = await model.generateContent([prompt]);
      const response = await result.response;

      console.log('API response received, checking for image data...');
      console.log('Response structure:', JSON.stringify({
        candidates: response.candidates?.length,
        firstCandidate: response.candidates?.[0] ? {
          content: response.candidates[0].content ? {
            parts: response.candidates[0].content.parts?.length,
            firstPart: response.candidates[0].content.parts?.[0] ? {
              hasInlineData: !!response.candidates[0].content.parts[0].inlineData,
              inlineDataType: response.candidates[0].content.parts[0].inlineData?.mimeType
            } : null
          } : null
        } : null
      }, null, 2));
      
      const timestamp = Date.now();
      const filename = `character_${timestamp}.png`;
      const outputPath = path.join(this.characterDir, filename);

      // Try multiple ways to extract image data
      let imageData: string | undefined;
      
      // Method 1: Standard path
      imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      // Method 2: Check all parts
      if (!imageData && response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageData = part.inlineData.data;
            break;
          }
        }
      }
      
      // Method 3: Check all candidates
      if (!imageData && response.candidates) {
        for (const candidate of response.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                imageData = part.inlineData.data;
                break;
              }
            }
          }
          if (imageData) break;
        }
      }
      
      if (imageData) {
        console.log('Image data found, saving to:', outputPath);
        const imageBuffer = Buffer.from(imageData, 'base64');
        await fs.writeFile(outputPath, imageBuffer);
        
        // Calculate relative path from outputDir
        const relativePath = path.relative(this.outputDir, outputPath);
        const imageUrl = `/api/images/${relativePath.replace(/\\/g, '/')}`;
        
        console.log('File saved successfully');
        console.log('Output dir:', this.outputDir);
        console.log('Output path:', outputPath);
        console.log('Relative path:', relativePath);
        console.log('Image URL:', imageUrl);
        console.log('File exists:', await fs.pathExists(outputPath));
        
        return { imagePath: outputPath, imageUrl };
      }

      console.error('No image data in response:', JSON.stringify(response, null, 2));
      throw new Error('No image generated in response');
    } catch (error: any) {
      console.error('Error in generatePixelCharacter:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}

let globalGenerator: GameAssetGenerator | null = null;

export function getGlobalGenerator(): GameAssetGenerator {
  if (!globalGenerator) {
    globalGenerator = new GameAssetGenerator();
  }
  return globalGenerator;
}

