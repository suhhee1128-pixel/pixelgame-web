# 2D Game Asset Generator 🎮✨

AI-powered 2D game asset generation tool! Create characters, backgrounds, items, and all the assets you need for 2D games using Google's Gemini AI models.

## 🌟 Key Features

- **🎨 AI-Powered Generation**: Automatically generate characters, backgrounds, and items with AI
- **🎭 Style Customization**: Various art styles, moods, color palettes, and composition options
- **🏃 Sprite Generation**: Batch generate multiple action sprites for characters
- **⚙️ Configuration Management**: Save and reuse frequently used style settings
- **🖼️ Reference Images**: Upload reference images for consistent character design
- **🖥️ Web Interface**: User-friendly Gradio interface

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or higher
- Google Gemini API key
- UV package manager (recommended) or pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HenryKang1/Sprite_generator1.git
   cd Sprite_generator
   ```

2. **Install dependencies**
   ```bash
   # Using UV (recommended)
   uv sync
   ```

3. **Set up environment variables**
   ```bash
   # Method 1: Copy .env_example file (Recommended)
   copy .env_example .env
   
   # Method 2: Create .env file directly
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
   ```
   
   **Important**: Change `GEMINI_API_KEY` to your actual API key in the `.env` file!

4. **Run the application**
   ```bash
   uv run game_asset_app.py
   ```

5. **Access the interface**
   Open your browser and navigate to `http://localhost:7861`

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
Sprite_generator/
├── game_asset_app.py      # Main Gradio interface
├── game_asset_generator.py # Core game asset generation logic
├── config_manager.py      # Configuration management module
├── utils.py              # Utility functions and style options
├── pyproject.toml        # Project configuration
├── .env                  # Environment variables (create this)
├── data/
│   ├── output/           # Generated assets
│   │   ├── characters/   # Character images
│   │   ├── backgrounds/  # Background images
│   │   ├── items/        # Item images
│   │   └── references/   # Reference images
│   ├── configs/          # Saved configurations
│   │   └── saved_configs.json
│   └── examples/         # Example files
└── README.md
```

## 🛠️ Configuration

### Environment Variables

Create a `.env` file and set the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
OUTPUT_DIR=data/output
IMAGE_MODEL_NAME=gemini-2.5-flash-image-preview
```

### API Setup

1. **Get Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

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

## 📋 Usage Examples

You can use this tool to generate game assets for various game types:

1. **RPG Games**: Warriors, mages, archers, and their weapons and armor
2. **Platformer Games**: Action sprites for jumping, running, attacking, etc.
3. **Puzzle Games**: Various items and background elements
4. **Adventure Games**: Environmental backgrounds and interactive objects

## 🤝 Contributing

If you'd like to contribute to this project:

1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for more details.

## 🙏 Acknowledgments

- Google Gemini AI models
- Gradio team
- All contributors

*Transform your imagination into 2D game assets with the power of AI!*