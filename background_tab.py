"""UI construction and bindings for the background generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import gradio as gr

from utils import ART_STYLES, COLOR_PALETTES, COMPOSITION_STYLES, LINE_STYLES, MOOD_OPTIONS
from shared import (
    bind_config_loader,
    create_config_dropdown,
    register_prompt_preview,
    render_style_preferences,
)


@dataclass
class BackgroundTabComponents:
    """Holds Gradio components that make up the background tab."""

    description: gr.Textbox
    orientation: gr.Radio
    art_style: gr.Dropdown
    mood: gr.Dropdown
    color_palette: gr.Dropdown
    line_style: gr.Dropdown
    composition: gr.Dropdown
    additional_notes: gr.Textbox
    config_dropdown: gr.Dropdown
    load_button: gr.Button
    generate_button: gr.Button
    status: gr.Textbox
    prompt_display: gr.Textbox
    output: gr.Image


def create_background_tab(initial_configs: Iterable[str]) -> BackgroundTabComponents:
    """Create the background tab layout and return its components."""

    with gr.Tab("🌄 Background Generation"):
        with gr.Row():
            with gr.Column(scale=2):
                description = gr.Textbox(
                    label="Background Description",
                    placeholder=(
                        "Describe your background: A medieval castle, a futuristic city, "
                        "a peaceful forest, etc."
                    ),
                    lines=5,
                )

                orientation = gr.Radio(
                    choices=["landscape", "portrait"],
                    value="landscape",
                    label="Orientation",
                )

                gr.Markdown("### 🎨 Style Preferences")
                style_preferences = render_style_preferences(
                    art_style_options=ART_STYLES,
                    mood_options=MOOD_OPTIONS,
                    color_palette_options=COLOR_PALETTES,
                    line_style_options=LINE_STYLES,
                    composition_options=COMPOSITION_STYLES,
                )

                additional_notes = gr.Textbox(
                    label="Additional Style Notes",
                    placeholder="Any specific style preferences or artistic directions...",
                    lines=3,
                )

                gr.Markdown("### ⚙️ Load Settings")
                with gr.Row():
                    config_dropdown = create_config_dropdown(initial_configs)
                    load_button = gr.Button("📂 Load Settings", variant="secondary", size="sm")

                generate_button = gr.Button("🌄 Generate Background", variant="primary", size="lg")

                status = gr.Textbox(
                    label="Status",
                    value="Ready to generate background...",
                    interactive=False,
                )

            with gr.Column(scale=1):
                gr.Markdown("### 📝 Generated Prompt")
                prompt_display = gr.Textbox(
                    label="Complete Prompt",
                    value="Enter background description and style preferences to see the generated prompt...",
                    lines=8,
                    interactive=False,
                    show_copy_button=True,
                )

                output = gr.Image(
                    label="Generated Background",
                    show_label=True,
                )

    return BackgroundTabComponents(
        description=description,
        orientation=orientation,
        art_style=style_preferences.art_style,
        mood=style_preferences.mood,
        color_palette=style_preferences.color_palette,
        line_style=style_preferences.line_style,
        composition=style_preferences.composition,
        additional_notes=additional_notes,
        config_dropdown=config_dropdown,
        load_button=load_button,
        generate_button=generate_button,
        status=status,
        prompt_display=prompt_display,
        output=output,
    )


def bind_background_tab_events(
    components: BackgroundTabComponents,
    preview_prompt: Callable,
    generate_background: Callable,
    load_config: Callable,
) -> None:
    """Wire up callbacks for the background tab."""

    preview_inputs = [
        components.description,
        components.orientation,
        components.art_style,
        components.mood,
        components.color_palette,
        components.line_style,
        components.composition,
        components.additional_notes,
    ]

    register_prompt_preview(preview_inputs, preview_prompt, components.prompt_display)

    components.generate_button.click(
        fn=generate_background,
        inputs=preview_inputs,
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
            components.line_style,
            components.composition,
            components.additional_notes,
            components.status,
        ],
        preview_fn=preview_prompt,
        preview_inputs=preview_inputs,
        preview_output=components.prompt_display,
    )
