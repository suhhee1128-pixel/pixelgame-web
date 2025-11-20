"""UI construction and bindings for the character generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import gradio as gr

from utils import ART_STYLES, CHARACTER_STYLES, COLOR_PALETTES, COMPOSITION_STYLES, LINE_STYLES, MOOD_OPTIONS
from shared import (
    bind_config_loader,
    create_config_dropdown,
    create_reference_upload,
    register_prompt_preview,
    render_style_preferences,
)


@dataclass
class CharacterTabComponents:
    """Holds Gradio components that make up the character tab."""

    description: gr.Textbox
    art_style: gr.Dropdown
    mood: gr.Dropdown
    color_palette: gr.Dropdown
    character_style: gr.Dropdown
    line_style: gr.Dropdown
    composition: gr.Dropdown
    additional_notes: gr.Textbox
    reference_image: gr.File
    config_dropdown: gr.Dropdown
    load_button: gr.Button
    generate_button: gr.Button
    status: gr.Textbox
    prompt_display: gr.Textbox
    output: gr.Image
    flip_button: gr.Button
    rotate_90_button: gr.Button
    rotate_180_button: gr.Button
    rotate_270_button: gr.Button


def create_character_tab(initial_configs: Iterable[str]) -> CharacterTabComponents:
    """Create the character tab layout and return its components."""

    with gr.Tab("👤 Character Generation"):
        with gr.Row():
            with gr.Column(scale=2):
                description = gr.Textbox(
                    label="Character Description",
                    placeholder=(
                        "Describe your character: A brave knight in shining armor, "
                        "a cute cat wizard, etc."
                    ),
                    lines=5,
                )

                gr.Markdown("### 🎨 Style Preferences")
                style_preferences = render_style_preferences(
                    art_style_options=ART_STYLES,
                    mood_options=MOOD_OPTIONS,
                    color_palette_options=COLOR_PALETTES,
                    line_style_options=LINE_STYLES,
                    composition_options=COMPOSITION_STYLES,
                    include_character_style=True,
                    character_style_options=CHARACTER_STYLES,
                )

                additional_notes = gr.Textbox(
                    label="Additional Style Notes",
                    placeholder="Any specific style preferences or artistic directions...",
                    lines=3,
                )

                gr.Markdown("### 🖼️ Character Reference (Optional)")
                gr.Markdown("*Upload a reference image to maintain character consistency*")
                reference_image = create_reference_upload("Upload Character Reference")

                gr.Markdown("### ⚙️ Load Settings")
                with gr.Row():
                    config_dropdown = create_config_dropdown(initial_configs)
                    load_button = gr.Button("📂 Load Settings", variant="secondary", size="sm")

                generate_button = gr.Button("🎨 Generate Character", variant="primary", size="lg")

                status = gr.Textbox(
                    label="Status",
                    value="Ready to generate character...",
                    interactive=False,
                )

            with gr.Column(scale=1):
                gr.Markdown("### 📝 Generated Prompt")
                prompt_display = gr.Textbox(
                    label="Complete Prompt",
                    value="Enter character description and style preferences to see the generated prompt...",
                    lines=8,
                    interactive=False,
                    show_copy_button=True,
                )

                output = gr.Image(
                    label="Generated Character",
                    format="png",
                    show_label=True,
                    interactive=False,
                )

                gr.Markdown("### 🔄 Image Manipulation")
                gr.Markdown("*Transform your generated character image*")
                with gr.Row():
                    flip_button = gr.Button("🔄 Flip Horizontal", variant="secondary", size="sm")
                    rotate_90_button = gr.Button("↻ Rotate 90°", variant="secondary", size="sm")
                    rotate_180_button = gr.Button("↻ Rotate 180°", variant="secondary", size="sm")
                    rotate_270_button = gr.Button("↻ Rotate 270°", variant="secondary", size="sm")

    return CharacterTabComponents(
        description=description,
        art_style=style_preferences.art_style,
        mood=style_preferences.mood,
        color_palette=style_preferences.color_palette,
        character_style=style_preferences.character_style,
        line_style=style_preferences.line_style,
        composition=style_preferences.composition,
        additional_notes=additional_notes,
        reference_image=reference_image,
        config_dropdown=config_dropdown,
        load_button=load_button,
        generate_button=generate_button,
        status=status,
        prompt_display=prompt_display,
        output=output,
        flip_button=flip_button,
        rotate_90_button=rotate_90_button,
        rotate_180_button=rotate_180_button,
        rotate_270_button=rotate_270_button,
    )


def bind_character_tab_events(
    components: CharacterTabComponents,
    preview_prompt: Callable,
    generate_character: Callable,
    load_config: Callable,
    flip_image: Callable,
    rotate_90: Callable,
    rotate_180: Callable,
    rotate_270: Callable,
) -> None:
    """Wire up callbacks for the character tab."""

    preview_inputs = [
        components.description,
        components.art_style,
        components.mood,
        components.color_palette,
        components.character_style,
        components.line_style,
        components.composition,
        components.additional_notes,
    ]

    register_prompt_preview(preview_inputs, preview_prompt, components.prompt_display)

    components.generate_button.click(
        fn=generate_character,
        inputs=preview_inputs + [components.reference_image],
        outputs=[components.output, components.status],
    )

    bind_config_loader(
        button=components.load_button,
        load_fn=load_config,
        dropdown=components.config_dropdown,
        outputs=[
            components.art_style,
            components.mood,
            components.color_palette,
            components.character_style,
            components.line_style,
            components.composition,
            components.additional_notes,
            components.status,
        ],
        preview_fn=preview_prompt,
        preview_inputs=preview_inputs,
        preview_output=components.prompt_display,
    )

    components.flip_button.click(
        fn=flip_image,
        inputs=[components.output],
        outputs=[components.output],
    )
    components.rotate_90_button.click(
        fn=rotate_90,
        inputs=[components.output],
        outputs=[components.output],
    )
    components.rotate_180_button.click(
        fn=rotate_180,
        inputs=[components.output],
        outputs=[components.output],
    )
    components.rotate_270_button.click(
        fn=rotate_270,
        inputs=[components.output],
        outputs=[components.output],
    )
