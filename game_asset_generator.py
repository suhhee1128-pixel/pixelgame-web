"""
2D 게임 어셋 생성 툴 - 나노바나나 API 활용
"""

import os
import PIL
from io import BytesIO
from google import genai
from dotenv import load_dotenv
import pathlib
import time
import shutil
from utils import ART_STYLES, MOOD_OPTIONS, COLOR_PALETTES, CHARACTER_STYLES, LINE_STYLES, COMPOSITION_STYLES

# Load environment variables
load_dotenv()

class GameAssetGenerator:
    def __init__(self):
        """Initialize the game asset generator with API clients and configuration."""
        # Try to get API key from environment, if not found, prompt user
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        # If no API key found, try to get it from direct environment or prompt
        if not self.api_key:
            print("⚠️  GEMINI_API_KEY not found in environment variables.")
            print("Please set your API key using one of these methods:")
            print("1. Set environment variable: set GEMINI_API_KEY=your_key_here")
            print("2. Create .env file with: GEMINI_API_KEY=your_key_here")
            print("3. Or modify this code to hardcode your API key temporarily")
            
            # Option 3: You can uncomment and modify the line below to hardcode your API key
            #self.api_key = "key_here"
            
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY is required but not found. Please set it using one of the methods above.")
        
        # Debug: Print API key status (first 10 characters for security)
        print(f"🔑 API Key loaded: {self.api_key[:10]}..." if self.api_key else "❌ No API key found")
        
        self.output_dir = os.getenv("OUTPUT_DIR", "data/output")
        self.character_dir = os.path.join(self.output_dir, "characters")
        self.background_dir = os.path.join(self.output_dir, "backgrounds")
        self.item_dir = os.path.join(self.output_dir, "items")
        self.reference_dir = os.path.join(self.output_dir, "references")
        
        self.image_gen_model_name = os.getenv("IMAGE_MODEL_NAME", "gemini-2.5-flash-image-preview")
        
        # Initialize clients with proper API key validation
        try:
            print("🔄 Initializing Gemini clients...")
            self.image_gen_client = genai.Client(api_key=self.api_key)
            print("✅ Gemini clients initialized successfully")
        except Exception as e:
            print(f"❌ Error initializing Gemini clients: {e}")
            raise ValueError(f"Failed to initialize Gemini API clients: {e}")
        
        # Ensure output directories exist
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.character_dir, exist_ok=True)
        os.makedirs(self.background_dir, exist_ok=True)
        os.makedirs(self.item_dir, exist_ok=True)
        os.makedirs(self.reference_dir, exist_ok=True)
        
        # Store current generation data
        self.current_character = {
            'character_data': None,
            'reference_image': None,
            'style_preferences': {},
            'generated_sprites': []
        }

    def save_reference_image(self, uploaded_file):
        """Save user uploaded reference image and return the path."""
        if uploaded_file is None:
            return None
        
        try:
            # Generate unique filename with timestamp
            timestamp = int(time.time())
            filename = f"reference_{timestamp}.png"
            reference_path = os.path.join(self.reference_dir, filename)
            
            # Handle different file input types
            if hasattr(uploaded_file, 'name'):  # Gradio file object
                shutil.copy2(uploaded_file.name, reference_path)
            else:
                if isinstance(uploaded_file, str):
                    shutil.copy2(uploaded_file, reference_path)
                elif hasattr(uploaded_file, 'save'):  # PIL Image
                    uploaded_file.save(reference_path)
            
            # Verify the reference was saved and is a valid image
            test_image = PIL.Image.open(reference_path)
            test_image.verify()
            
            print(f"Reference image saved to: {reference_path}")
            return reference_path
            
        except Exception as e:
            print(f"Error saving reference image: {e}")
            return None

    def save_image(self, response, path):
        """Save the generated image from response."""
        for part in response.parts:
            if image := part.as_image():
                image.save(path)
                return image
        return None

    def generate_character_image(self, character_description: str, style_preferences: dict = None, reference_image_path: str = None):
        """Generate a character image with optional reference and style preferences."""
        # Build the prompt
        prompt = self._build_character_prompt(character_description, style_preferences)
        
        # Build content list
        content = [prompt]
        
        # Add reference image if provided
        if reference_image_path and os.path.exists(reference_image_path):
            content.append(PIL.Image.open(reference_image_path))
            print(f"Using reference image: {reference_image_path}")
        
        # Generate image
        response = self.image_gen_client.models.generate_content(
            model=self.image_gen_model_name,
            contents=content
        )
        
        # Save image
        timestamp = int(time.time())
        output_path = os.path.join(self.character_dir, f"character_{timestamp}.png")
        saved_image = self.save_image(response, output_path)
        
        return output_path, saved_image

    def generate_character_sprites(self, character_description: str, actions: list, style_preferences: dict = None, reference_image_path: str = None):
        """Generate multiple sprites for different character actions."""
        generated_sprites = []
        
        for action in actions:
            # Build action-specific prompt
            action_prompt = self._build_sprite_prompt(character_description, action, style_preferences)
            
            # Build content list
            content = [action_prompt]
            
            # Add reference image if provided
            if reference_image_path and os.path.exists(reference_image_path):
                content.append(PIL.Image.open(reference_image_path))
            
            # Generate image
            response = self.image_gen_client.models.generate_content(
                model=self.image_gen_model_name,
                contents=content
            )
            
            # Save image
            timestamp = int(time.time())
            output_path = os.path.join(self.character_dir, f"character_{action}_{timestamp}.png")
            saved_image = self.save_image(response, output_path)
            
            generated_sprites.append({
                'action': action,
                'image_path': output_path,
                'image': saved_image
            })
        
        return generated_sprites

    def generate_background_image(self, background_description: str, orientation: str = "landscape", style_preferences: dict = None):
        """Generate a background image with specified orientation."""
        # Build the prompt
        prompt = self._build_background_prompt(background_description, orientation, style_preferences)
        
        # Generate image
        response = self.image_gen_client.models.generate_content(
            model=self.image_gen_model_name,
            contents=[prompt]
        )
        
        # Save image
        timestamp = int(time.time())
        output_path = os.path.join(self.background_dir, f"background_{orientation}_{timestamp}.png")
        saved_image = self.save_image(response, output_path)
        
        return output_path, saved_image

    def generate_item_image(self, item_description: str, style_preferences: dict = None, reference_image_path: str = None):
        """Generate an item image with optional reference and style preferences."""
        # Build the prompt
        prompt = self._build_item_prompt(item_description, style_preferences)
        
        # Build content list
        content = [prompt]
        
        # Add reference image if provided
        if reference_image_path and os.path.exists(reference_image_path):
            content.append(PIL.Image.open(reference_image_path))
            print(f"Using reference image: {reference_image_path}")
        
        # Generate image
        response = self.image_gen_client.models.generate_content(
            model=self.image_gen_model_name,
            contents=content
        )
        
        # Save image
        timestamp = int(time.time())
        output_path = os.path.join(self.item_dir, f"item_{timestamp}.png")
        saved_image = self.save_image(response, output_path)
        
        return output_path, saved_image

    def generate_character_animation(self, character_description: str, action: str, style_preferences: dict = None, reference_image_path: str = None, duration: int = 4):
        """Generate a character animation with specified action and duration."""
        # Build the prompt for animation
        prompt = self._build_animation_prompt(character_description, action, style_preferences)
        
        # Build content list
        content = [prompt]
        
        # Add reference image if provided
        if reference_image_path and os.path.exists(reference_image_path):
            content.append(PIL.Image.open(reference_image_path))
            print(f"Using reference image for animation: {reference_image_path}")
        
        # Generate video using Gemini
        response = self.image_gen_client.models.generate_content(
            model=self.image_gen_model_name,
            contents=content
        )
        
        # Save video
        timestamp = int(time.time())
        output_path = os.path.join(self.character_dir, f"video-{timestamp}.mp4")
        
        # Save the generated video
        for part in response.parts:
            if video := part.as_video():
                with open(output_path, 'wb') as f:
                    f.write(video.data)
                print(f"Animation saved to: {output_path}")
                return output_path
        
        raise Exception("No video generated in response")

    def extract_frames_from_video(self, video_path: str, frame_interval: int = 1, frame_name_prefix: str = "frame"):
        """Extract frames from a video file."""
        import cv2
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        frames_data = []
        frame_count = 0
        extracted_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Extract every Nth frame based on frame_interval
            if frame_count % frame_interval == 0:
                timestamp = int(time.time())
                frame_filename = f"{frame_name_prefix}_{extracted_count:03d}_{timestamp}.png"
                frame_path = os.path.join(self.character_dir, frame_filename)
                
                # Convert BGR to RGB and save
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_pil = PIL.Image.fromarray(frame_rgb)
                frame_pil.save(frame_path)
                
                frames_data.append({
                    'frame_number': extracted_count,
                    'frame_path': frame_path,
                    'timestamp': frame_count / cap.get(cv2.CAP_PROP_FPS) if cap.get(cv2.CAP_PROP_FPS) > 0 else 0
                })
                
                extracted_count += 1
            
            frame_count += 1
        
        cap.release()
        print(f"Extracted {len(frames_data)} frames from video")
        return frames_data, len(frames_data)

    def _build_animation_prompt(self, character_description: str, action: str, style_preferences: dict = None) -> str:
        """Build the prompt for animation generation."""
        base_prompt = f"{character_description} performing {action} action"
        
        # Add style preferences
        if style_preferences:
            style_instructions = self._get_style_instructions(style_preferences)
            if style_instructions:
                base_prompt += f". Style: {style_instructions}"
        
        # Add animation-specific instructions
        animation_instructions = f"""
        The character should be performing a smooth, natural {action} movement. 
        The animation should be fluid and dynamic, showing the character's motion clearly.
        Keep the character consistent throughout the animation.
        Set against a clean background to focus on the character's movement.
        The animation should be suitable for game use with clear, readable motion.
        Create a short video animation showing this movement.
        """
        
        return base_prompt + animation_instructions

    def generate_character_sprites(self, character_description: str, actions: list, style_preferences: dict = None, reference_image_path: str = None):
        """Generate multiple sprites for different character actions."""
        generated_sprites = []
        
        for action in actions:
            # Build action-specific prompt
            action_prompt = self._build_sprite_prompt(character_description, action, style_preferences)
            
            # Build content list
            content = [action_prompt]
            
            # Add reference image if provided
            if reference_image_path and os.path.exists(reference_image_path):
                content.append(PIL.Image.open(reference_image_path))
            
            # Generate image
            response = self.image_gen_client.models.generate_content(
                model=self.image_gen_model_name,
                contents=content
            )
            
            # Save image
            timestamp = int(time.time())
            output_path = os.path.join(self.character_dir, f"character_{action}_{timestamp}.png")
            saved_image = self.save_image(response, output_path)
            
            generated_sprites.append({
                'action': action,
                'image_path': output_path,
                'image': saved_image
            })
        
        return generated_sprites

    def generate_sprite_animation(self, reference_image, action_type):
        """Generate sprite animation using Gemini - 6 frames (attack or jump)"""
        import time
        import numpy as np
        
        # Input validation
        if reference_image is None:
            return [], "❌ Please upload a character reference image first."
        
        if action_type not in ["attack", "jump"]:
            return [], "❌ Please select a valid action type (attack or jump)."
        
        try:
            # Get file path from Gradio upload object
            if hasattr(reference_image, 'name'):
                image_path = reference_image.name
            else:
                image_path = reference_image
            
            print(f"🔍 Generating 6-frame {action_type} animation with Gemini...")
            print(f"Image path: {image_path}")
            
            # Load the reference image
            reference_img = PIL.Image.open(image_path)
            
            # Define frame prompts based on action type
            if action_type == "attack":
                frame_prompts = {
                    "frame1_idle": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, idle ready stance: head slightly turned right, calm eyes forward, torso upright and relaxed, right hand holding weapon low at side, left arm resting naturally, feet shoulder-width apart, faint small glow at weapon tip, transparent background. 

Weapon consistency rule: The weapon must remain EXACTLY the same as in the reference image — same shape, size, color, and design details. Do NOT change or redesign the weapon in any way. The character must hold the same weapon throughout all frames.

CRITICAL: Character must face RIGHT direction.""",
                    
                    "frame2_chargeup": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, charge-up pose: head focused on weapon tip, torso leaning slightly back, right arm lifting weapon upward with elbow bent, left hand balancing or supporting, feet stable with weight shifted backward, small glowing orb forming at weapon tip with spark particles, transparent background. CRITICAL: Character must face RIGHT direction.""",
                    
                    "frame3_aim": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, pre-attack aiming pose: head locked forward with fierce focus, torso leaning slightly forward, right arm extending weapon forward, left arm balancing near chest, front foot pressing down, energy orb at weapon tip growing brighter with small electric arcs, transparent background. CRITICAL: Character must face RIGHT direction.""",
                    
                    "frame4_lunge": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lunge attack-prep pose: head determined and looking forward, torso thrust forward, right arm fully extended pushing weapon ahead, left arm stretched back for balance, front leg stepping forward bearing weight, weapon tip glowing at peak intensity with bright aura and motion trails, transparent background. CRITICAL: Character must face RIGHT direction, same as other frames.""",
                    
                    "frame5_impact": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, attack impact pose: head focused forward, torso leaning into the strike, right arm extended holding weapon, left arm offset for balance, front foot planted, massive energy burst from weapon tip with bright white core and colored shockwave rings, spark particles around, transparent background. CRITICAL: Character must face RIGHT direction.""",
                    
                    "frame6_aftershock": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, aftershock dissipate pose: head slightly lowered but still facing right, expression calm but focused, torso slightly leaned forward holding weapon extended after impact, both hands steady but relaxed, feet fixed in same stance as impact frame. 
Bright energy from weapon tip has just faded — residual pink light rings expand outward, fading into transparency with soft glow, small spark particles dispersing and disappearing, faint motion blur suggesting energy release completion. 
Transparent background. CRITICAL: Character must face RIGHT direction, maintain same pivot and proportions as previous frames."""
                }
            else:  # jump
                frame_prompts = {
                    "frame1_prepare": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump preparation pose: head slightly tilted down, eyes forward, torso slightly crouched, knees bent, right hand holding the same weapon low near waist, left arm slightly back for balance, feet shoulder-width pressing down as if gathering strength to jump. 
Transparent background. Maintain SAME weapon design/shape/size/colors as reference; 1:1 head-to-body, two arms two legs, SAME pivot as other actions. CRITICAL: Character must face RIGHT direction.""",

                    "frame2_launch": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump launch pose: head oriented slightly upward, torso pushing upward dynamically, both legs extending from crouch, right arm pulling weapon slightly backward for momentum, left arm forward balancing, small dust particles under feet. 
Transparent background. SAME weapon & proportions & pivot. CRITICAL: Character must face RIGHT direction.""",

                    "frame3_air_rise": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, mid-air rising pose: head slightly up, torso extended, legs tucked slightly toward body, right arm holding weapon diagonally across the front, left arm extended backward for balance, faint motion lines beneath character. 
Transparent background. SAME weapon, SAME pivot, 1:1 chibi. CRITICAL: Character must face RIGHT direction.""",

                    "frame4_air_peak": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, jump apex pose: head level, torso upright, both legs lightly bent as if floating at the top, right arm steady holding weapon horizontally, left arm relaxed near side, subtle floating particles around. 
Transparent background. SAME weapon & proportions & pivot. CRITICAL: Character must face RIGHT direction.""",

                    "frame5_air_fall": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, descending pose: head angled slightly downward, torso leaning a bit forward, right arm and weapon angled downward preparing to land, left arm behind for balance, legs extended downward with knees slightly bent, thin downward motion trails. 
Transparent background. SAME weapon & pivot. CRITICAL: Character must face RIGHT direction.""",

                    "frame6_land": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, landing impact pose: head slightly forward, torso lowered with deep knee bend, front foot planted, back foot heel lifted, right hand gripping weapon forward for stability, small dust clouds under feet and a tiny shock ring. 
Transparent background. Maintain SAME weapon (no redesign), 1:1 ratio, two arms two legs, SAME pivot as previous frames. CRITICAL: Character must face RIGHT direction."""
                }
            
            # Generate all 6 frames
            generated_images = []
            output_dir = os.path.join(os.getenv("OUTPUT_DIR", "data/output"), "characters")
            os.makedirs(output_dir, exist_ok=True)
            
            # Add original reference image as first frame
            generated_images.append(image_path)
            print(f"✅ Original character added as first frame: {image_path}")
            
            for frame_name, prompt in frame_prompts.items():
                print(f"🎨 Generating {frame_name}...")
                
                try:
                    # Generate image using Gemini
                    content = [prompt, reference_img]
                    response = self.image_gen_client.models.generate_content(
                        model=self.image_gen_model_name,
                        contents=content
                    )
                    
                    # Save the generated image
                    timestamp = int(time.time())
                    output_path = os.path.join(output_dir, f"{action_type}_{frame_name}_{timestamp}.png")
                    
                    # Save image from Gemini response
                    saved_image = self.save_image(response, output_path)
                    
                    if saved_image:
                        generated_images.append(output_path)
                        print(f"✅ {frame_name} saved: {output_path}")
                    else:
                        print(f"⚠️ Failed to save {frame_name}")
                    
                    # Longer delay between requests to avoid rate limiting
                    time.sleep(3)
                    
                except Exception as frame_error:
                    error_msg = str(frame_error)
                    if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                        print(f"⚠️ {frame_name} failed due to quota limit")
                        return [], "❌ Gemini API 할당량이 소진되었습니다. 잠시 후 다시 시도해주세요. (429 RESOURCE_EXHAUSTED)"
                    else:
                        print(f"⚠️ {frame_name} failed: {error_msg}")
                        # Continue with other frames even if one fails
            
            if len(generated_images) == 7:  # Original + 6 generated frames
                # Create combined sprite sheet using numpy.hstack
                print("🎨 Creating combined sprite sheet...")
                try:
                    # Load all images and convert to RGB if needed
                    images = []
                    for i, img_path in enumerate(generated_images):
                        print(f"Loading image {i+1}: {img_path}")
                        img = PIL.Image.open(img_path)
                        # Convert to RGB if image has transparency (RGBA)
                        if img.mode in ('RGBA', 'LA', 'P'):
                            # Create white background for transparent images
                            background = PIL.Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                        print(f"Image {i+1} loaded: {img.size}, mode: {img.mode}")
                    
                    # Resize all images to the same height (use the first image's height)
                    base_height = images[0].height
                    print(f"Base height: {base_height}")
                    resized_images = []
                    for i, img in enumerate(images):
                        # Calculate new width maintaining aspect ratio
                        aspect_ratio = img.width / img.height
                        new_width = int(base_height * aspect_ratio)
                        resized_img = img.resize((new_width, base_height), PIL.Image.Resampling.LANCZOS)
                        resized_images.append(resized_img)
                        print(f"Resized image {i+1}: {resized_img.size}")
                    
                    # Convert to numpy arrays and stack horizontally
                    numpy_images = [np.array(img) for img in resized_images]
                    print(f"Converting to numpy arrays, shapes: {[arr.shape for arr in numpy_images]}")
                    combined_array = np.hstack(numpy_images)
                    print(f"Combined array shape: {combined_array.shape}")
                    
                    # Convert back to PIL Image
                    combined_image = PIL.Image.fromarray(combined_array)
                    
                    # Save combined image
                    timestamp = int(time.time())
                    combined_path = os.path.join(output_dir, f"{action_type}_combined_{timestamp}.png")
                    combined_image.save(combined_path, 'PNG')
                    
                    # Add combined image to the list
                    generated_images.append(combined_path)
                    print(f"✅ Combined sprite sheet saved: {combined_path}")
                    
                    action_emoji = "⚔️" if action_type == "attack" else "🦘"
                    return generated_images, f"✅ Successfully generated 8 frames (Original + 6 {action_type} frames + Combined sprite sheet) with Gemini! 🎮{action_emoji}"
                    
                except Exception as combine_error:
                    import traceback
                    print(f"⚠️ Failed to create combined sprite sheet: {combine_error}")
                    print(f"Full traceback: {traceback.format_exc()}")
                    action_emoji = "⚔️" if action_type == "attack" else "🦘"
                    return generated_images, f"✅ Generated 7 frames (Original + 6 {action_type} frames) with Gemini! (Combined sheet failed: {str(combine_error)}) 🎮{action_emoji}"
                    
            elif len(generated_images) > 1:  # At least original + some generated frames
                generated_count = len(generated_images) - 1  # Subtract original
                return generated_images, f"⚠️ Generated {generated_count}/6 {action_type} frames. Some frames failed."
            else:
                return [], "❌ Failed to generate any frames."
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"{action_type} animation generation error: {error_msg}")
            print(traceback.format_exc())
            return [], f"❌ Error during generation: {error_msg}\nPlease try again."

    def generate_dead_animation(self, reference_image):
        """Generate dead animation using Gemini - 5 frames"""
        import time
        import numpy as np
        
        # Input validation
        if reference_image is None:
            return [], "❌ Please upload a character reference image first."
        
        try:
            # Get file path from Gradio upload object
            if hasattr(reference_image, 'name'):
                image_path = reference_image.name
            else:
                image_path = reference_image
            
            print("🔍 Generating 5-frame dead animation with Gemini...")
            print(f"Image path: {image_path}")
            
            # Load the reference image
            reference_img = PIL.Image.open(image_path)
            
            # Define 5 frame prompts for dead animation
            frame_prompts_dead = {
                "frame1_hit_recoil": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, just hit by a strong impact. 
Head snapping backward LEFT of torso, eyes wide open with pain or shock, eyebrows sharply raised. 
Mouth open in a small gasp, torso bending back 15°, one foot losing balance.
Both arms flail from recoil, weapon shaking loosely in hand.
Expression: stunned and in pain — NOT calm. Transparent background. SAME weapon (shape/color/size). CRITICAL: Character must face RIGHT direction.""",

                "frame2_knockback_airborne": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lifted into the air mid-knockback.
Head still LEFT of body but tilted back further, eyes half-open with fading awareness, mouth slightly open as if gasping mid-air.
Torso rotated backward about 45°, legs lifting higher to the RIGHT, arms spread from inertia.
Expression: dazed and slipping consciousness. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction.""",

                "frame3_mid_flip": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, mid-air slow rotation between falling and upside-down.
Head still LEFT of legs, slightly lower than torso (about 75° rotation from upright).
Torso diagonal with chest pointing upward-left, legs slightly higher toward RIGHT.
Both arms extended diagonally from body, following spin inertia.
Expression fading — eyes half-closed, mouth small and tense.
Weapon tilting backward along spin, still in hand. Gravity acts downward, rotation CLOCKWISE, not too steep. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction.""",

                "frame4_fall_transition": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, descending mid-fall rotation.
Head LEFT of legs but now lower, near horizontal level (about 140° rotation from upright).
Torso curved slightly backward, legs still higher to RIGHT.
Arms and weapon trailing downward naturally from momentum.
Expression weak, eyes mostly closed, body showing limpness.
Gravity pulls character down, maintaining CLOCKWISE rotation (head always LEFT of legs).
Transparent background. SAME weapon/pivot/proportion. CRITICAL: Character must face RIGHT direction.""",

                "frame5_rest": """다음 캐릭터를 프롬프트에 맞게 이미지 생성해줘.

Pixel-art character facing RIGHT, lying motionless on ground.
Head LEFT of torso, resting sideways; eyes fully closed; mouth slightly parted; expression devoid of life, limbs relaxed and heavy.
Weapon on the ground next to hand, no glow, no movement.
No peace, no smile — just weight and stillness. Transparent background. SAME weapon/pivot. CRITICAL: Character must face RIGHT direction."""
            }
            
            # Generate all 5 frames
            generated_images = []
            output_dir = os.path.join(os.getenv("OUTPUT_DIR", "data/output"), "characters")
            os.makedirs(output_dir, exist_ok=True)
            
            # Add original reference image as first frame
            generated_images.append(image_path)
            print(f"✅ Original character added as first frame: {image_path}")
            
            for frame_name, prompt in frame_prompts_dead.items():
                print(f"🎨 Generating {frame_name}...")
                
                try:
                    # Generate image using Gemini
                    content = [prompt, reference_img]
                    response = self.image_gen_client.models.generate_content(
                        model=self.image_gen_model_name,
                        contents=content
                    )
                    
                    # Save the generated image
                    timestamp = int(time.time())
                    output_path = os.path.join(output_dir, f"dead_{frame_name}_{timestamp}.png")
                    
                    # Save image from Gemini response
                    saved_image = self.save_image(response, output_path)
                    
                    if saved_image:
                        generated_images.append(output_path)
                        print(f"✅ {frame_name} saved: {output_path}")
                    else:
                        print(f"⚠️ Failed to save {frame_name}")
                    
                    # Longer delay between requests to avoid rate limiting
                    time.sleep(3)
                    
                except Exception as frame_error:
                    error_msg = str(frame_error)
                    if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                        print(f"⚠️ {frame_name} failed due to quota limit")
                        return [], "❌ Gemini API 할당량이 소진되었습니다. 잠시 후 다시 시도해주세요. (429 RESOURCE_EXHAUSTED)"
                    else:
                        print(f"⚠️ {frame_name} failed: {error_msg}")
                        # Continue with other frames even if one fails
            
            if len(generated_images) == 6:  # Original + 5 generated frames
                # Create combined sprite sheet using numpy.hstack
                print("🎨 Creating combined sprite sheet...")
                try:
                    # Load all images and convert to RGB if needed
                    images = []
                    for i, img_path in enumerate(generated_images):
                        print(f"Loading image {i+1}: {img_path}")
                        img = PIL.Image.open(img_path)
                        # Convert to RGB if image has transparency (RGBA)
                        if img.mode in ('RGBA', 'LA', 'P'):
                            # Create white background for transparent images
                            background = PIL.Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                        print(f"Image {i+1} loaded: {img.size}, mode: {img.mode}")
                    
                    # Resize all images to the same height (use the first image's height)
                    base_height = images[0].height
                    print(f"Base height: {base_height}")
                    resized_images = []
                    for i, img in enumerate(images):
                        # Calculate new width maintaining aspect ratio
                        aspect_ratio = img.width / img.height
                        new_width = int(base_height * aspect_ratio)
                        resized_img = img.resize((new_width, base_height), PIL.Image.Resampling.LANCZOS)
                        resized_images.append(resized_img)
                        print(f"Resized image {i+1}: {resized_img.size}")
                    
                    # Convert to numpy arrays and stack horizontally
                    numpy_images = [np.array(img) for img in resized_images]
                    print(f"Converting to numpy arrays, shapes: {[arr.shape for arr in numpy_images]}")
                    combined_array = np.hstack(numpy_images)
                    print(f"Combined array shape: {combined_array.shape}")
                    
                    # Convert back to PIL Image
                    combined_image = PIL.Image.fromarray(combined_array)
                    
                    # Save combined image
                    timestamp = int(time.time())
                    combined_path = os.path.join(output_dir, f"dead_combined_{timestamp}.png")
                    combined_image.save(combined_path, 'PNG')
                    
                    # Add combined image to the list
                    generated_images.append(combined_path)
                    print(f"✅ Combined sprite sheet saved: {combined_path}")
                    
                    return generated_images, f"✅ Successfully generated 7 frames (Original + 5 dead frames + Combined sprite sheet) with Gemini! 🎮💀"
                    
                except Exception as combine_error:
                    import traceback
                    print(f"⚠️ Failed to create combined sprite sheet: {combine_error}")
                    print(f"Full traceback: {traceback.format_exc()}")
                    return generated_images, f"✅ Generated 6 frames (Original + 5 dead frames) with Gemini! (Combined sheet failed: {str(combine_error)}) 🎮💀"
                    
            elif len(generated_images) > 1:  # At least original + some generated frames
                generated_count = len(generated_images) - 1  # Subtract original
                return generated_images, f"⚠️ Generated {generated_count}/5 dead frames. Some frames failed."
            else:
                return [], "❌ Failed to generate any frames."
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"Dead animation generation error: {error_msg}")
            print(traceback.format_exc())
            return [], f"❌ Error during generation: {error_msg}\nPlease try again."

    def _build_character_prompt(self, character_description: str, style_preferences: dict = None) -> str:
        """Build the prompt for character generation."""
        base_prompt = f"""
        Create a 2D game character sprite based on the following description:
        {character_description}
        
        The character should be:
        - Designed for 2D games
        - Clear and recognizable at small sizes
        - Well-defined silhouette
        - Consistent art style
        - Follow the reference image if provided
        """
        
        if style_preferences:
            style_instructions = self._get_style_instructions(style_preferences)
            base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
        
        return base_prompt

    def _build_sprite_prompt(self, character_description: str, action: str, style_preferences: dict = None) -> str:
        """Build the prompt for sprite generation."""
        base_prompt = f"""
        Create a 2D game character sprite showing the character performing the action: {action}
        
        Character description: {character_description}
        
        The sprite should be:
        - Designed for 2D games
        - Clear and recognizable at small sizes
        - Suitable for sprite animation
        - Well-defined silhouette
        - Consistent art style
        - Show the character in the middle of performing the action
        - Follow the reference image if provided
        """
        
        if style_preferences:
            style_instructions = self._get_style_instructions(style_preferences)
            base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
        
        return base_prompt

    def _build_background_prompt(self, background_description: str, orientation: str, style_preferences: dict = None) -> str:
        """Build the prompt for background generation."""
        aspect_ratio = "16:9" if orientation == "landscape" else "9:16"
        
        base_prompt = f"""
        Create a 2D game background based on the following description:
        {background_description}
        
        The background should be:
        - Designed for 2D games
        - {orientation} orientation ({aspect_ratio} aspect ratio)
        - Suitable for parallax scrolling
        - Clear and detailed
        - Consistent art style
        - No characters or interactive elements
        - Follow the reference image if provided
        """
        
        if style_preferences:
            style_instructions = self._get_style_instructions(style_preferences)
            base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
        
        return base_prompt

    def _build_item_prompt(self, item_description: str, style_preferences: dict = None) -> str:
        """Build the prompt for item generation."""
        base_prompt = f"""
        Create a 2D game item sprite based on the following description:
        {item_description}
        
        The item should be:
        - Designed for 2D games
        - Clear and recognizable at small sizes
        - Suitable for inventory systems
        - Well-defined silhouette
        - Consistent art style
        - Isolated on transparent background
        - Follow the reference image if provided
        """
        
        if style_preferences:
            style_instructions = self._get_style_instructions(style_preferences)
            base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
        
        return base_prompt

    def _get_style_instructions(self, style_preferences: dict) -> str:
        """Generate style instructions based on user preferences."""
        if not style_preferences:
            return ""
        
        instructions = []
        
        if style_preferences.get('art_style'):
            instructions.append(f"Art Style: {style_preferences['art_style']}")
        
        if style_preferences.get('mood'):
            instructions.append(f"Mood: {style_preferences['mood']}")
        
        if style_preferences.get('color_palette'):
            instructions.append(f"Color Palette: {style_preferences['color_palette']}")
        
        if style_preferences.get('character_style'):
            instructions.append(f"Character Style: {style_preferences['character_style']}")
        
        if style_preferences.get('line_style'):
            instructions.append(f"Line Style: {style_preferences['line_style']}")
        
        if style_preferences.get('composition'):
            instructions.append(f"Composition: {style_preferences['composition']}")
        
        if style_preferences.get('additional_notes'):
            instructions.append(f"Additional Notes: {style_preferences['additional_notes']}")
        
        return "\n".join(instructions)

# Global generator instance for interface functions
_global_generator = None

def get_global_generator():
    """Get or create the global generator instance."""
    global _global_generator
    if _global_generator is None:
        _global_generator = GameAssetGenerator()
    return _global_generator
