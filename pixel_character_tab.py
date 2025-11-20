"""UI construction and bindings for the pixel character generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import gradio as gr

from pixel_character_generator import generate_pixel_character_interface


@dataclass
class PixelCharacterTabComponents:
    """Holds Gradio components that make up the pixel character tab."""

    description: gr.Textbox
    color: gr.Dropdown
    mood: gr.Dropdown
    weapon: gr.Dropdown
    generate_button: gr.Button
    status: gr.Textbox
    output: gr.Image


def create_pixel_character_tab() -> PixelCharacterTabComponents:
    """Create the pixel character tab layout and return its components."""

    with gr.Tab("🎮 Pixel Character"):
        gr.Markdown("## 🎮 Pixel Character Generator")
        gr.Markdown("Generate retro-style pixel art characters with AI!")
        
        with gr.Row():
            with gr.Column(scale=2):
                # Character description input
                description = gr.Textbox(
                    label="Character Description",
                    placeholder='e.g., "cute pink-haired person", "scary blue dragon", "small robot"',
                    lines=3
                )
                
                # Additional options
                gr.Markdown("### Additional Options (Optional)")
                with gr.Row():
                    color = gr.Dropdown(
                        choices=["None", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Black", "White", "Brown", "Orange", "Gray", "Gold", "Silver"],
                        value="None",
                        label="Hair Color / Primary Color",
                        interactive=True
                    )
                    mood = gr.Dropdown(
                        choices=["None", "Cute", "Scary", "Futuristic", "Fantasy", "Elegant", "Powerful"],
                        value="None",
                        label="Mood",
                        interactive=True
                    )
                
                weapon = gr.Dropdown(
                    choices=["None", "Baguette", "Magic Wand", "Candy", "Sword"],
                    value="None",
                    label="Weapon",
                    interactive=True
                )
                
                generate_button = gr.Button("🎨 Generate Pixel Character", variant="primary", size="lg")
                
                status = gr.Textbox(
                    label="Status",
                    value="Enter character description and click generate button",
                    interactive=False
                )
                
            with gr.Column(scale=1):
                # Generated character display
                output = gr.Image(
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

    return PixelCharacterTabComponents(
        description=description,
        color=color,
        mood=mood,
        weapon=weapon,
        generate_button=generate_button,
        status=status,
        output=output,
    )


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


def bind_pixel_character_tab_events(
    tab: PixelCharacterTabComponents,
    generate_fn: Callable,
) -> None:
    """Bind event handlers for the pixel character tab."""
    
    tab.generate_button.click(
        fn=generate_fn,
        inputs=[tab.description, tab.color, tab.mood, tab.weapon],
        outputs=[tab.status, tab.output],
    )