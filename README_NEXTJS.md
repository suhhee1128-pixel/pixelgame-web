# 2D Game Asset Generator (Next.js) 🎮✨

AI-powered 2D game asset generation tool! Create characters, backgrounds, items, and all the assets you need for 2D games using Google's Gemini AI models.

## 🌟 Key Features

- **🎨 AI-Powered Generation**: Automatically generate characters, backgrounds, and items with AI
- **🎭 Style Customization**: Various art styles, moods, color palettes, and composition options
- **🏃 Sprite Generation**: Batch generate multiple action sprites for characters
- **⚙️ Configuration Management**: Save and reuse frequently used style settings
- **🖼️ Reference Images**: Upload reference images for consistent character design
- **🖥️ Modern Web Interface**: Beautiful Next.js web application

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Google Gemini API key

### Installation

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   OUTPUT_DIR=data/output
   IMAGE_MODEL_NAME=gemini-2.5-flash-image-preview
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📖 Usage Guide

### 👤 **Character Generation**

1. Enter character description in the text area
2. Select style preferences (optional)
3. Upload reference image (optional)
4. Click "Generate Character" button

### 🏃 **Character Sprite Generation**

1. Enter character description
2. Enter action list separated by commas (e.g., idle, walk, run, jump)
3. Select style preferences
4. Click "Generate Sprites" button

### 🌄 **Background Generation**

1. Enter background description
2. Select orientation (landscape/portrait)
3. Select style preferences
4. Click "Generate Background" button

### 🎒 **Item Generation**

1. Enter item description
2. Select style preferences
3. Upload reference image (optional)
4. Click "Generate Item" button

### ⚙️ **Configuration Management**

1. Save frequently used style settings
2. Load and reuse saved settings
3. Delete unnecessary settings

## 🏗️ Project Structure

```
gameai/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── generate/     # Generation endpoints
│   │   ├── config/       # Configuration endpoints
│   │   ├── images/       # Image serving
│   │   └── prompt/       # Prompt preview
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/            # React components
│   └── tabs/             # Tab components
├── lib/                   # Utilities and libraries
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Utility functions
│   ├── game-asset-generator.ts  # Generator class
│   └── config-manager.ts # Configuration manager
├── data/                  # Data directory
│   ├── output/           # Generated assets
│   └── configs/         # Saved configurations
└── package.json
```

## 🛠️ Configuration

### Environment Variables (🔒 절대 레포에 올리지 말 것)

1. **`.env.local` 파일은 무조건 로컬 전용**
   - 이 레포의 `.gitignore` 에 이미 다음이 들어 있어서 GitHub로 푸시되지 않습니다:
   - `.env*.local`, `.env`
2. **민감 정보는 코드에 직접 쓰지 말고, `.env.local` 에만 넣으세요.**
3. `GEMINI_API_KEY` 는 예시/더미 값만 쓰고, 진짜 키는 절대 커밋하지 마세요.

예시는 다음처럼 작성합니다:

```env
GEMINI_API_KEY=your_gemini_api_key_here  # ⚠️ 여기에는 진짜 키 말고, 예시/로컬 값만
OUTPUT_DIR=data/output
IMAGE_MODEL_NAME=gemini-2.5-flash-image-preview
```

### API Setup

1. **Get Gemini API Key (로컬에서만 사용)**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - 절대 README나 코드, 커밋, 이슈에 붙여넣지 마세요.
   - **오직 `.env.local` 파일에만** 넣어서 사용하세요.

## 🎨 Style Options

Choose from various art styles, moods, color palettes, character styles, and composition options to create unique game assets:

- **Art Styles**: Traditional Manga/Anime, Shonen, Shoujo, Seinen, Chibi, Cyberpunk, Fantasy, Horror, etc.
- **Moods**: Epic, Dark/Mysterious, Light/Cheerful, Dramatic, Action-packed, etc.
- **Color Palettes**: Full Color, Black & White, Sepia, Monochromatic, Warm Tones, Cool Tones, etc.
- **Character Styles**: Detailed/Realistic, Stylized/Expressive, Simple/Clean, etc.

## 🔧 Advanced Features

- **Smart Prompts**: Generate optimized prompts while maintaining character consistency
- **Reference Images**: Upload reference images to guide style, composition, and character appearance
- **Configuration Management**: Save and reuse frequently used style settings
- **Batch Generation**: Generate multiple action sprites at once

## 📋 Build for Production

```bash
npm run build
npm start
```

## 🤝 Contributing

If you'd like to contribute to this project:

1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is distributed under the MIT License.

*Transform your imagination into 2D game assets with the power of AI!*

