"""UI construction and bindings for the dead sprite generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import gradio as gr

from shared import create_reference_upload


@dataclass
class DeadSpriteTabComponents:
    """Holds Gradio components that make up the dead sprite tab."""

    reference_image: gr.File
    generate_button: gr.Button
    status: gr.Textbox
    gallery: gr.Gallery


def create_dead_sprite_tab(initial_configs: Iterable[str]) -> DeadSpriteTabComponents:
    """Create the dead sprite tab layout and return its components."""

    with gr.Tab("💀 Dead Sprite"):
        gr.Markdown("## 💀 Dead Animation Generator (Gemini)")
        gr.Markdown("Generate a complete 5-frame death sequence: Hit Recoil → Knockback Airborne → Mid Flip → Fall Down → Rest")
        
        with gr.Row():
            with gr.Column(scale=2):
                # Reference Image Upload Section
                gr.Markdown("### 🖼️ Character Reference (Required)")
                gr.Markdown("*Upload your character PNG image to generate dead animation frames*")
                reference_image = create_reference_upload("Upload Character Image")
                
                generate_button = gr.Button("💀 Generate 5 Frames", variant="primary", size="lg")
                
                # Status display
                status = gr.Textbox(
                    label="Status",
                    value="Upload character image and click generate to create 7-frame dead animation (Original + 5 frames + Combined sprite sheet)...",
                    interactive=False
                )
                
                # Info
                gr.Markdown("### 📋 Dead Animation Frames")
                gr.Markdown("""
                **Frame 1**: Original character (uploaded)
                **Frame 2**: Hit recoil pose (15° backward tilt)
                **Frame 3**: Knockback airborne pose (45° rotation)
                **Frame 4**: Mid flip pose (75° rotation, slow rotation)
                **Frame 5**: Fall transition pose (140° rotation, descending)
                **Frame 6**: Rest pose (fully on ground)
                **Frame 7**: Combined sprite sheet (all frames horizontally)
                
                *Character will maintain exact appearance from uploaded image*
                """)
            
            with gr.Column(scale=1):
                gallery = gr.Gallery(
                    label="Generated Dead Animation Frames",
                    show_label=True,
                    columns=2,
                    rows=3,
                    height="auto",
                    allow_preview=True
                )
                
                # Frame download info
                gr.Markdown("### 💾 Frame Download")
                gr.Markdown("""
                **Frame 순서**: Original → Hit Recoil (15°) → Knockback Airborne (45°) → Mid Flip (75°) → Fall Transition (140°) → Rest → Combined Sheet
                
                *각 프레임을 클릭하여 개별 다운로드 가능*
                """)

    return DeadSpriteTabComponents(
        reference_image=reference_image,
        generate_button=generate_button,
        status=status,
        gallery=gallery,
    )


def bind_dead_sprite_tab_events(
    components: DeadSpriteTabComponents,
    generate_dead_animation: Callable,
) -> None:
    """Wire up callbacks for the dead sprite tab."""

    components.generate_button.click(
        fn=generate_dead_animation,
        inputs=[components.reference_image],
        outputs=[components.gallery, components.status],
    )
