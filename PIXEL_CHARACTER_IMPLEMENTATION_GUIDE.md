# 픽셀 캐릭터 생성 기능 완전 구현 가이드

## 📋 개요
이 가이드는 픽셀 캐릭터 생성 기능을 다른 프로젝트에 100% 동일하게 구현하기 위한 완전한 문서입니다.

---

## 🗂️ 필요한 파일 구조

```
your_project/
├── pixel_character_generator.py    # 핵심 로직 파일
├── your_app.py                      # Gradio UI 앱 파일
├── .env                             # API 키 설정 파일
├── .gitignore                       # .env 보안 설정
└── data/
    └── output/                      # 생성된 이미지 저장 폴더
```

---

## 📦 1. 필수 패키지 설치

### requirements.txt
```txt
gradio>=4.0.0
google-genai>=1.0.0
python-dotenv>=1.0.0
Pillow>=10.0.0
```

### 설치 명령어
```bash
pip install gradio google-genai python-dotenv Pillow
```

---

## 🔑 2. 환경 변수 설정

### `.env` 파일 생성
```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Output Directory (optional)
OUTPUT_DIR=data/output

# Image Model Name (optional)
IMAGE_MODEL_NAME=gemini-2.5-flash-image-preview
```

### `.gitignore` 파일에 추가
```gitignore
# Environment variables and API keys
.env
.env.local
.env.*.local
*.key
*.pem
config.json
secrets.json
api_keys.txt
```

---

## 📄 3. pixel_character_generator.py (전체 코드)

```python
"""
픽셀 캐릭터 생성기 - Gemini API를 사용한 픽셀 아트 캐릭터 생성
"""

import os
import PIL
from google import genai
from dotenv import load_dotenv
import time
from PIL import Image
import json
from pathlib import Path
import base64
import io

# Load environment variables
load_dotenv()


class PixelCharacterGenerator:
    def __init__(self):
        """Initialize the character generator with API client and configuration."""
        # Get API key from environment
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            print("⚠️  GEMINI_API_KEY not found in environment variables.")
            print("Please set your API key in .env file: GEMINI_API_KEY=your_key_here")
            raise ValueError("GEMINI_API_KEY is required but not found.")
        
        # Debug: Print API key status
        print(f"🔑 API Key loaded: {self.api_key[:10]}..." if self.api_key else "❌ No API key found")
        
        self.output_dir = os.getenv("OUTPUT_DIR", "data/output")
        self.image_gen_model_name = os.getenv("IMAGE_MODEL_NAME", "gemini-2.5-flash-image-preview")
        
        # Initialize Gemini client
        try:
            print("🔄 Initializing Gemini client...")
            self.image_gen_client = genai.Client(api_key=self.api_key)
            print("✅ Gemini client initialized successfully")
        except Exception as e:
            print(f"❌ Error initializing Gemini client: {e}")
            raise ValueError(f"Failed to initialize Gemini API client: {e}")
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

    def save_image(self, response, path):
        """Save the generated image from response."""
        for part in response.parts:
            if image := part.as_image():
                image.save(path)
                return image
        return None

# Global generator instance
_global_generator = None

def get_global_pixel_generator():
    """Get or create the global pixel generator instance."""
    global _global_generator
    if _global_generator is None:
        _global_generator = PixelCharacterGenerator()
    return _global_generator

def generate_pixel_character_interface(description: str, color: str = "None", mood: str = "None", weapon: str = "None"):
    """Interface function for pixel character generation - transparent PNG, front view, original quality."""
    generator = get_global_pixel_generator()
    try:
        if not description or not description.strip():
            return "❌ Please enter a character description.", None
        
        # Build detailed prompt for PIXEL ART character generation
        prompt = "Create a PIXEL ART character sprite with these specifications:\n\n"
        prompt += f"Character: {description}\n"
        
        # Add color preference if selected
        if color and color != "None":
            prompt += f"Primary color scheme: {color}\n"
        
        # Add mood preference if selected
        if mood and mood != "None":
            prompt += f"Overall mood: {mood}\n"
        
        # Add weapon preference if selected
        if weapon and weapon != "None":
            if weapon == "Baguette":
                prompt += f"Weapon: Long French bread baguette (held in hand)\n"
            elif weapon == "Magic Wand":
                prompt += f"Weapon: Magical staff/wand with glowing tip\n"
            elif weapon == "Candy":
                prompt += f"Weapon: Large lollipop/candy stick (like a colorful spiral candy on a stick)\n"
            elif weapon == "Sword":
                prompt += f"Weapon: Sword (medieval/fantasy style)\n"
        
        prompt += "\nMANDATORY PIXEL ART STYLE REQUIREMENTS:\n"
        prompt += "- **CONSISTENT STYLE**: Must look like it came from the same game/site as other characters\n"
        prompt += "- **PIXEL ART ONLY**: Retro pixel art style, NOT smooth/realistic art\n"
        prompt += "- **CHIBI PROPORTIONS**: Large head, small body - cute deformed style\n"
        prompt += "- **HEAD TO BODY RATIO: 1:1** - Head size MUST equal body size (equal proportions)\n"
        prompt += "- Clear pixelated edges, visible individual pixels\n"
        prompt += "- Limited color palette (8-16 colors recommended)\n"
        prompt += "- Clean pixel-perfect outlines\n"
        prompt += "- Front-facing view\n"
        prompt += "- Single character, centered composition\n"
        prompt += "- White background (will be made transparent)\n"
        prompt += "- Game sprite aesthetic (like 8-bit, 16-bit, or 32-bit era)\n"
        prompt += "- Sharp, blocky pixel style - NOT anti-aliased or smooth\n"
        prompt += "- Retro video game character design\n"
        prompt += "- IMPORTANT: Face/head height = body height (1:1 ratio)\n"
        prompt += "- **UNIFORM STYLE**: Same art style, proportions, and rendering as reference characters\n"
        
        # Generate timestamp for unique filename
        timestamp = int(time.time())
        temp_output_path = os.path.join(generator.output_dir, f"character_temp_{timestamp}.png")
        output_path = os.path.join(generator.output_dir, f"character_{timestamp}.png")
        
        # Generate image using Gemini
        print(f"🎮 Generating PIXEL ART character: {description[:50]}...")
        print(f"   Style: Pixel Art (Retro Game Sprite)")
        print(f"   Color: {color}, Mood: {mood}")
        
        try:
            response = generator.image_gen_client.models.generate_content(
                model=generator.image_gen_model_name,
                contents=[prompt]
            )
            
            # Save the generated image
            saved_image = generator.save_image(response, temp_output_path)
            
            if saved_image:
                # Use original high-quality image without resizing
                img = Image.open(temp_output_path)
                
                # Convert to RGBA if not already (for transparency support)
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Save as high-quality PNG
                img.save(output_path, 'PNG', optimize=False, quality=100)
                
                # Clean up temp file
                if os.path.exists(temp_output_path) and temp_output_path != output_path:
                    os.remove(temp_output_path)
                
                actual_size = img.size
                print(f"✅ PIXEL ART character generated successfully: {output_path} ({actual_size[0]}x{actual_size[1]})")
                return f"✅ Pixel art character generated successfully! 🎮 (Size: {actual_size[0]}x{actual_size[1]} PNG)", output_path
            else:
                return "❌ Image generation failed. Please try again.", None
                
        except Exception as gen_error:
            print(f"Generation error: {gen_error}")
            return f"❌ Generation error: {str(gen_error)}", None
            
    except Exception as e:
        import traceback
        print(f"Error in generate_character_interface: {e}")
        print(traceback.format_exc())
        return f"❌ Error occurred: {str(e)}", None
```

---

## 🎨 4. Gradio UI 코드 (your_app.py에 추가)

### 4-1. Import 문 (파일 상단)
```python
import gradio as gr
from pixel_character_generator import generate_pixel_character_interface
import os
import time
from PIL import Image
```

### 4-2. Wrapper 함수 정의
```python
def generate_pixel_character(description, color, mood, weapon):
    """Pixel character generation interface function"""
    # Input validation
    if not description or not description.strip():
        return "❌ Please enter a character description. e.g., 'cute pink-haired person', 'scary blue dragon'", None
    
    try:
        # Generate pixel character
        status, img_path = generate_pixel_character_interface(description, color, mood, weapon)
        return status, img_path
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Pixel character generation error: {error_msg}")
        print(traceback.format_exc())
        return f"❌ Error during generation: {error_msg}\nPlease try again.", None
```

### 4-3. Gradio UI 탭 코드
```python
with gr.Blocks(title="Your App", theme=gr.themes.Soft()) as demo:
    
    with gr.Tab("🎮 Pixel Character"):
        gr.Markdown("## 🎮 Pixel Character Generator")
        gr.Markdown("Generate retro-style pixel art characters with AI!")
        
        with gr.Row():
            with gr.Column(scale=2):
                # Character description input
                pixel_character_description = gr.Textbox(
                    label="Character Description",
                    placeholder='e.g., "cute pink-haired person", "scary blue dragon", "small robot"',
                    lines=3
                )
                
                # Additional options
                gr.Markdown("### Additional Options (Optional)")
                with gr.Row():
                    pixel_character_color = gr.Dropdown(
                        choices=["None", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Black", "White", "Brown", "Orange", "Gray", "Gold", "Silver"],
                        value="None",
                        label="Hair Color / Primary Color",
                        interactive=True
                    )
                    pixel_character_mood = gr.Dropdown(
                        choices=["None", "Cute", "Scary", "Futuristic", "Fantasy", "Elegant", "Powerful"],
                        value="None",
                        label="Mood",
                        interactive=True
                    )
                
                pixel_character_weapon = gr.Dropdown(
                    choices=["None", "Baguette", "Magic Wand", "Candy", "Sword"],
                    value="None",
                    label="Weapon",
                    interactive=True
                )
                
                generate_pixel_character_btn = gr.Button("🎨 Generate Pixel Character", variant="primary", size="lg")
                
                pixel_character_status = gr.Textbox(
                    label="Status",
                    value="Enter character description and click generate button",
                    interactive=False
                )
                
            with gr.Column(scale=1):
                # Generated character display
                pixel_character_output = gr.Image(
                    label="Generated Pixel Art Character",
                    show_label=True
                )
                
                gr.Markdown("### 🎮 Pixel Art Settings")
                gr.Markdown("""
                - **Style**: Retro Pixel Art (Fixed)
                - **Proportions**: Chibi Style (1:1 head-to-body ratio)
                - **View**: Front-facing (Fixed)
                - **Output Format**: High-quality PNG
                - **Feel**: 8/16/32-bit game sprite
                """)
        
        gr.Markdown("---")
        gr.Markdown("### 📖 Usage Guide")
        gr.Markdown("""
        1. Enter your desired character in **Character Description**
           - Examples: "cute pink-haired wizard", "scary blue dragon", "small robot warrior"
        2. Optionally select **Hair Color/Primary Color**, **Mood**, and **Weapon**
        3. Click **Generate Pixel Character** button to create a pixel art style character
        4. The generated image is ready to use in game development
        """)
    
    # Event Handler
    generate_pixel_character_btn.click(
        fn=generate_pixel_character,
        inputs=[pixel_character_description, pixel_character_color, pixel_character_mood, pixel_character_weapon],
        outputs=[pixel_character_status, pixel_character_output]
    )
    
    # Launch
    demo.launch(server_name="0.0.0.0", server_port=7860)
```

---

## 🚀 5. 완전한 독립 실행 예제 (standalone_pixel_app.py)

```python
"""
픽셀 캐릭터 생성기 - 독립 실행 가능한 완전한 앱
"""

import os
import gradio as gr
from google import genai
from dotenv import load_dotenv
import time
from PIL import Image

# Load environment variables
load_dotenv()


class PixelCharacterGenerator:
    def __init__(self):
        """Initialize the character generator with API client and configuration."""
        # Get API key from environment
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            print("⚠️  GEMINI_API_KEY not found in environment variables.")
            print("Please set your API key in .env file: GEMINI_API_KEY=your_key_here")
            raise ValueError("GEMINI_API_KEY is required but not found.")
        
        # Debug: Print API key status
        print(f"🔑 API Key loaded: {self.api_key[:10]}..." if self.api_key else "❌ No API key found")
        
        self.output_dir = os.getenv("OUTPUT_DIR", "data/output")
        self.image_gen_model_name = os.getenv("IMAGE_MODEL_NAME", "gemini-2.5-flash-image-preview")
        
        # Initialize Gemini client
        try:
            print("🔄 Initializing Gemini client...")
            self.image_gen_client = genai.Client(api_key=self.api_key)
            print("✅ Gemini client initialized successfully")
        except Exception as e:
            print(f"❌ Error initializing Gemini client: {e}")
            raise ValueError(f"Failed to initialize Gemini API client: {e}")
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

    def save_image(self, response, path):
        """Save the generated image from response."""
        for part in response.parts:
            if image := part.as_image():
                image.save(path)
                return image
        return None


# Global generator instance
_global_generator = None

def get_global_pixel_generator():
    """Get or create the global pixel generator instance."""
    global _global_generator
    if _global_generator is None:
        _global_generator = PixelCharacterGenerator()
    return _global_generator


def generate_pixel_character_interface(description: str, color: str = "None", mood: str = "None", weapon: str = "None"):
    """Interface function for pixel character generation."""
    generator = get_global_pixel_generator()
    try:
        if not description or not description.strip():
            return "❌ Please enter a character description.", None
        
        # Build detailed prompt for PIXEL ART character generation
        prompt = "Create a PIXEL ART character sprite with these specifications:\n\n"
        prompt += f"Character: {description}\n"
        
        # Add color preference if selected
        if color and color != "None":
            prompt += f"Primary color scheme: {color}\n"
        
        # Add mood preference if selected
        if mood and mood != "None":
            prompt += f"Overall mood: {mood}\n"
        
        # Add weapon preference if selected
        if weapon and weapon != "None":
            if weapon == "Baguette":
                prompt += f"Weapon: Long French bread baguette (held in hand)\n"
            elif weapon == "Magic Wand":
                prompt += f"Weapon: Magical staff/wand with glowing tip\n"
            elif weapon == "Candy":
                prompt += f"Weapon: Large lollipop/candy stick (like a colorful spiral candy on a stick)\n"
            elif weapon == "Sword":
                prompt += f"Weapon: Sword (medieval/fantasy style)\n"
        
        prompt += "\nMANDATORY PIXEL ART STYLE REQUIREMENTS:\n"
        prompt += "- **CONSISTENT STYLE**: Must look like it came from the same game/site as other characters\n"
        prompt += "- **PIXEL ART ONLY**: Retro pixel art style, NOT smooth/realistic art\n"
        prompt += "- **CHIBI PROPORTIONS**: Large head, small body - cute deformed style\n"
        prompt += "- **HEAD TO BODY RATIO: 1:1** - Head size MUST equal body size (equal proportions)\n"
        prompt += "- Clear pixelated edges, visible individual pixels\n"
        prompt += "- Limited color palette (8-16 colors recommended)\n"
        prompt += "- Clean pixel-perfect outlines\n"
        prompt += "- Front-facing view\n"
        prompt += "- Single character, centered composition\n"
        prompt += "- White background (will be made transparent)\n"
        prompt += "- Game sprite aesthetic (like 8-bit, 16-bit, or 32-bit era)\n"
        prompt += "- Sharp, blocky pixel style - NOT anti-aliased or smooth\n"
        prompt += "- Retro video game character design\n"
        prompt += "- IMPORTANT: Face/head height = body height (1:1 ratio)\n"
        prompt += "- **UNIFORM STYLE**: Same art style, proportions, and rendering as reference characters\n"
        
        # Generate timestamp for unique filename
        timestamp = int(time.time())
        temp_output_path = os.path.join(generator.output_dir, f"character_temp_{timestamp}.png")
        output_path = os.path.join(generator.output_dir, f"character_{timestamp}.png")
        
        # Generate image using Gemini
        print(f"🎮 Generating PIXEL ART character: {description[:50]}...")
        print(f"   Style: Pixel Art (Retro Game Sprite)")
        print(f"   Color: {color}, Mood: {mood}")
        
        try:
            response = generator.image_gen_client.models.generate_content(
                model=generator.image_gen_model_name,
                contents=[prompt]
            )
            
            # Save the generated image
            saved_image = generator.save_image(response, temp_output_path)
            
            if saved_image:
                # Use original high-quality image without resizing
                img = Image.open(temp_output_path)
                
                # Convert to RGBA if not already (for transparency support)
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Save as high-quality PNG
                img.save(output_path, 'PNG', optimize=False, quality=100)
                
                # Clean up temp file
                if os.path.exists(temp_output_path) and temp_output_path != output_path:
                    os.remove(temp_output_path)
                
                actual_size = img.size
                print(f"✅ PIXEL ART character generated successfully: {output_path} ({actual_size[0]}x{actual_size[1]})")
                return f"✅ Pixel art character generated successfully! 🎮 (Size: {actual_size[0]}x{actual_size[1]} PNG)", output_path
            else:
                return "❌ Image generation failed. Please try again.", None
                
        except Exception as gen_error:
            print(f"Generation error: {gen_error}")
            return f"❌ Generation error: {str(gen_error)}", None
            
    except Exception as e:
        import traceback
        print(f"Error in generate_character_interface: {e}")
        print(traceback.format_exc())
        return f"❌ Error occurred: {str(e)}", None


def generate_pixel_character(description, color, mood, weapon):
    """Pixel character generation wrapper function"""
    # Input validation
    if not description or not description.strip():
        return "❌ Please enter a character description. e.g., 'cute pink-haired person', 'scary blue dragon'", None
    
    try:
        # Generate pixel character
        status, img_path = generate_pixel_character_interface(description, color, mood, weapon)
        return status, img_path
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Pixel character generation error: {error_msg}")
        print(traceback.format_exc())
        return f"❌ Error during generation: {error_msg}\nPlease try again.", None


# Create Gradio Interface
def create_pixel_character_app():
    with gr.Blocks(title="Pixel Character Generator", theme=gr.themes.Soft()) as demo:
        gr.Markdown("# 🎮 Pixel Character Generator")
        gr.Markdown("Generate retro-style pixel art characters with AI!")
        
        with gr.Row():
            with gr.Column(scale=2):
                # Character description input
                pixel_character_description = gr.Textbox(
                    label="Character Description",
                    placeholder='e.g., "cute pink-haired person", "scary blue dragon", "small robot"',
                    lines=3
                )
                
                # Additional options
                gr.Markdown("### Additional Options (Optional)")
                with gr.Row():
                    pixel_character_color = gr.Dropdown(
                        choices=["None", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Black", "White", "Brown", "Orange", "Gray", "Gold", "Silver"],
                        value="None",
                        label="Hair Color / Primary Color",
                        interactive=True
                    )
                    pixel_character_mood = gr.Dropdown(
                        choices=["None", "Cute", "Scary", "Futuristic", "Fantasy", "Elegant", "Powerful"],
                        value="None",
                        label="Mood",
                        interactive=True
                    )
                
                pixel_character_weapon = gr.Dropdown(
                    choices=["None", "Baguette", "Magic Wand", "Candy", "Sword"],
                    value="None",
                    label="Weapon",
                    interactive=True
                )
                
                generate_pixel_character_btn = gr.Button("🎨 Generate Pixel Character", variant="primary", size="lg")
                
                pixel_character_status = gr.Textbox(
                    label="Status",
                    value="Enter character description and click generate button",
                    interactive=False
                )
                
            with gr.Column(scale=1):
                # Generated character display
                pixel_character_output = gr.Image(
                    label="Generated Pixel Art Character",
                    show_label=True
                )
                
                gr.Markdown("### 🎮 Pixel Art Settings")
                gr.Markdown("""
                - **Style**: Retro Pixel Art (Fixed)
                - **Proportions**: Chibi Style (1:1 head-to-body ratio)
                - **View**: Front-facing (Fixed)
                - **Output Format**: High-quality PNG
                - **Feel**: 8/16/32-bit game sprite
                """)
        
        gr.Markdown("---")
        gr.Markdown("### 📖 Usage Guide")
        gr.Markdown("""
        1. Enter your desired character in **Character Description**
           - Examples: "cute pink-haired wizard", "scary blue dragon", "small robot warrior"
        2. Optionally select **Hair Color/Primary Color**, **Mood**, and **Weapon**
        3. Click **Generate Pixel Character** button to create a pixel art style character
        4. The generated image is ready to use in game development
        """)
        
        # Event Handler
        generate_pixel_character_btn.click(
            fn=generate_pixel_character,
            inputs=[pixel_character_description, pixel_character_color, pixel_character_mood, pixel_character_weapon],
            outputs=[pixel_character_status, pixel_character_output]
        )
    
    return demo


if __name__ == "__main__":
    demo = create_pixel_character_app()
    demo.launch(
        share=True,
        server_name="0.0.0.0",
        server_port=7860
    )
```

---

## 📝 6. 실행 방법

### Step 1: 파일 생성
```bash
# 1. 프로젝트 폴더 생성
mkdir pixel_character_project
cd pixel_character_project

# 2. 필요한 폴더 생성
mkdir -p data/output

# 3. 파일 생성
touch .env
touch pixel_character_generator.py
touch standalone_pixel_app.py
touch .gitignore
touch requirements.txt
```

### Step 2: 파일 내용 작성
- `.env` 파일에 API 키 입력
- `pixel_character_generator.py`에 핵심 로직 코드 복사
- `standalone_pixel_app.py`에 완전한 독립 실행 코드 복사
- `.gitignore`에 보안 설정 추가
- `requirements.txt`에 패키지 목록 작성

### Step 3: 패키지 설치 및 실행
```bash
# 패키지 설치
pip install -r requirements.txt

# 서버 실행
python3 standalone_pixel_app.py
```

---

## 🔍 7. 의존성 정리

### 직접 의존성:
- `pixel_character_generator.py` → 없음 (독립적)
- Gradio UI → `pixel_character_generator.py`의 `generate_pixel_character_interface()` 함수

### 외부 패키지:
- `gradio` - UI 프레임워크
- `google-genai` - Gemini API 클라이언트
- `python-dotenv` - 환경 변수 로드
- `Pillow` - 이미지 처리

### 환경 변수:
- `GEMINI_API_KEY` (필수)
- `OUTPUT_DIR` (선택, 기본값: "data/output")
- `IMAGE_MODEL_NAME` (선택, 기본값: "gemini-2.5-flash-image-preview")

---

## ✅ 8. 체크리스트

다른 AI가 구현할 때 확인해야 할 사항:

- [ ] `pixel_character_generator.py` 파일 생성 및 전체 코드 복사
- [ ] `.env` 파일 생성 및 `GEMINI_API_KEY` 설정
- [ ] `.gitignore`에 `.env` 추가
- [ ] `requirements.txt` 생성 및 패키지 설치
- [ ] `data/output` 폴더 생성
- [ ] Gradio UI 코드 복사 (탭, wrapper 함수, 이벤트 핸들러)
- [ ] Import 문 확인
- [ ] 서버 실행 및 테스트

---

## 🎯 9. 핵심 포인트

### 꼭 지켜야 할 사항:
1. **API 키 보안**: `.env` 파일을 반드시 `.gitignore`에 추가
2. **1:1 비율**: 머리와 몸의 크기가 같아야 함 (치비 스타일)
3. **픽셀 아트 스타일**: 부드러운 아트가 아닌 픽셀 아트
4. **전면 뷰**: 캐릭터가 정면을 바라봄
5. **투명 배경**: PNG 형식으로 저장

### 옵션 값:
- **Color**: Red, Blue, Green, Yellow, Pink, Purple, Black, White, Brown, Orange, Gray, Gold, Silver
- **Mood**: Cute, Scary, Futuristic, Fantasy, Elegant, Powerful
- **Weapon**: Baguette, Magic Wand, Candy, Sword

---

## 🔧 10. 트러블슈팅

### API 키 오류
```
Error: GEMINI_API_KEY not found
Solution: .env 파일에 GEMINI_API_KEY=your_key 추가
```

### 폴더 생성 오류
```
Error: [Errno 2] No such file or directory: 'data/output'
Solution: mkdir -p data/output
```

### Import 오류
```
Error: ModuleNotFoundError: No module named 'google.genai'
Solution: pip install google-genai
```

---

## 📌 요약

**복사해야 할 파일:**
1. ✅ `pixel_character_generator.py` (전체)
2. ✅ `.env` (API 키)
3. ✅ Gradio UI 코드 3개 부분:
   - Import 문
   - Wrapper 함수 (`generate_pixel_character`)
   - UI 탭 코드 + 이벤트 핸들러

**이 가이드대로 하면 100% 동일하게 구현 가능합니다!** 🎮✨

