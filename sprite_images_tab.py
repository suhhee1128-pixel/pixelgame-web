"""UI construction and bindings for the sprite images generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import gradio as gr

from shared import create_reference_upload


@dataclass
class SpriteImagesTabComponents:
    """Holds Gradio components that make up the sprite images tab."""

    action_type_dropdown: gr.Dropdown
    reference_image: gr.File
    generate_button: gr.Button
    status: gr.Textbox
    animation_info: gr.Markdown
    frame_info: gr.Markdown
    gallery: gr.Gallery


def create_sprite_images_tab(initial_configs: Iterable[str]) -> SpriteImagesTabComponents:
    """Create the sprite images tab layout and return its components."""

    with gr.Tab("🎮 Sprite Images"):
        gr.Markdown("## 🎮 Universal Sprite Animation Generator (Gemini)")
        gr.Markdown("Generate 6-frame sprite animations: Choose between Attack or Jump sequences")
        
        with gr.Row():
            with gr.Column(scale=2):
                # Action Type Selection
                gr.Markdown("### ⚙️ Animation Type")
                action_type_dropdown = gr.Dropdown(
                    choices=["attack", "jump"],
                    value="attack",
                    label="Select Animation Type",
                    info="Choose between Attack or Jump animation sequence"
                )
                
                # Reference Image Upload Section
                gr.Markdown("### 🖼️ Character Reference (Required)")
                gr.Markdown("*Upload your character PNG image to generate sprite animation frames*")
                reference_image = create_reference_upload("Upload Character Image")
                
                generate_button = gr.Button("🎮 Generate 6 Frames", variant="primary", size="lg")
                
                # Status display
                status = gr.Textbox(
                    label="Status",
                    value="Select animation type, upload character image and click generate to create 8-frame animation (Original + 6 frames + Combined sprite sheet)...",
                    interactive=False
                )
                
                # Dynamic Info based on action type
                gr.Markdown("### 📋 Animation Frames")
                animation_info = gr.Markdown("""
                **Attack Animation Frames**:
                **Frame 1**: Original character (uploaded)
                **Frame 2**: Idle ready stance
                **Frame 3**: Charge-up pose
                **Frame 4**: Pre-attack aiming pose
                **Frame 5**: Lunge attack-prep pose
                **Frame 6**: Attack impact pose
                **Frame 7**: Aftershock dissipate pose
                **Frame 8**: Combined sprite sheet (all frames horizontally)
                
                *Character will maintain exact appearance from uploaded image*
                """)
            
            with gr.Column(scale=1):
                gallery = gr.Gallery(
                    label="Generated Sprite Animation Frames",
                    show_label=True,
                    columns=2,
                    rows=3,
                    height="auto",
                    allow_preview=True
                )
                
                # Dynamic Frame download info
                gr.Markdown("### 💾 Frame Download")
                frame_info = gr.Markdown("""
                **Attack Frame 순서**: Original → Idle → Charge-up → Aiming → Lunge → Impact → Aftershock → Combined Sheet
                
                *각 프레임을 클릭하여 개별 다운로드 가능*
                """)

    return SpriteImagesTabComponents(
        action_type_dropdown=action_type_dropdown,
        reference_image=reference_image,
        generate_button=generate_button,
        status=status,
        animation_info=animation_info,
        frame_info=frame_info,
        gallery=gallery,
    )


def bind_sprite_images_tab_events(
    components: SpriteImagesTabComponents,
    generate_animation: Callable,
    update_animation_info: Callable,
) -> None:
    """Wire up callbacks for the sprite images tab."""

    components.generate_button.click(
        fn=generate_animation,
        inputs=[components.reference_image, components.action_type_dropdown],
        outputs=[components.gallery, components.status],
    )
    
    # Action type 변경 시 정보 업데이트
    components.action_type_dropdown.change(
        fn=update_animation_info,
        inputs=[components.action_type_dropdown],
        outputs=[components.animation_info, components.frame_info],
    )
