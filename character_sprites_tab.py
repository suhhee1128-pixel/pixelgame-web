"""UI construction and bindings for the character sprites generation tab."""

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
class CharacterSpritesTabComponents:
    """Holds Gradio components that make up the character sprites tab."""

    description: gr.Textbox
    actions_text: gr.Textbox
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
    gallery: gr.Gallery


def create_character_sprites_tab(initial_configs: Iterable[str]) -> CharacterSpritesTabComponents:
    """Create the character sprites tab layout and return its components."""

    with gr.Tab("🏃 Character Sprites"):
        with gr.Row():
            with gr.Column(scale=2):
                description = gr.Textbox(
                    label="Character Description",
                    placeholder=(
                        "Describe your character: A brave knight in shining armor, "
                        "a cute cat wizard, etc."
                    ),
                    lines=3,
                )

                actions_text = gr.Textbox(
                    label="Actions (comma-separated)",
                    placeholder="idle, walk, run, jump, attack, defend, etc.",
                    lines=2,
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
                    lines=2,
                )

                gr.Markdown("### 🖼️ Character Reference (Optional)")
                gr.Markdown("*Upload a reference image to maintain character consistency*")
                reference_image = create_reference_upload("Upload Character Reference")

                gr.Markdown("### ⚙️ Load Settings")
                with gr.Row():
                    config_dropdown = create_config_dropdown(initial_configs)
                    load_button = gr.Button("📂 Load Settings", variant="secondary", size="sm")

                generate_button = gr.Button("🏃 Generate Sprites", variant="primary", size="lg")

                status = gr.Textbox(
                    label="Status",
                    value="Ready to generate sprites...",
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

                gallery = gr.Gallery(
                    label="Generated Sprites",
                    show_label=True,
                    columns=2,
                    rows=3,
                    height="auto",
                )

    return CharacterSpritesTabComponents(
        description=description,
        actions_text=actions_text,
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
        gallery=gallery,
    )


def bind_character_sprites_tab_events(
    components: CharacterSpritesTabComponents,
    preview_prompt: Callable,
    generate_sprites: Callable,
    load_config: Callable,
) -> None:
    """Wire up callbacks for the character sprites tab."""

    preview_inputs = [
        components.description,
        components.actions_text,
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
        fn=generate_sprites,
        inputs=preview_inputs + [components.reference_image],
        outputs=[components.gallery, components.status],
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
