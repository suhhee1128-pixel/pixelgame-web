"""UI construction and bindings for the item generation tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import gradio as gr

from utils import ART_STYLES, COLOR_PALETTES, COMPOSITION_STYLES, LINE_STYLES, MOOD_OPTIONS
from shared import (
    bind_config_loader,
    create_config_dropdown,
    create_reference_upload,
    register_prompt_preview,
    render_style_preferences,
)


@dataclass
class ItemTabComponents:
    """Holds Gradio components that make up the item tab."""

    description: gr.Textbox
    art_style: gr.Dropdown
    mood: gr.Dropdown
    color_palette: gr.Dropdown
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


def create_item_tab(initial_configs: Iterable[str]) -> ItemTabComponents:
    """Create the item tab layout and return its components."""

    with gr.Tab("🧰 Item Generation"):
        with gr.Row():
            with gr.Column(scale=2):
                description = gr.Textbox(
                    label="Item Description",
                    placeholder="Describe your item: A magic sword, a futuristic gadget, etc.",
                    lines=5,
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

                gr.Markdown("### 🖼️ Item Reference (Optional)")
                reference_image = create_reference_upload("Upload Item Reference")

                gr.Markdown("### ⚙️ Load Settings")
                with gr.Row():
                    config_dropdown = create_config_dropdown(initial_configs)
                    load_button = gr.Button("📂 Load Settings", variant="secondary", size="sm")

                generate_button = gr.Button("🧰 Generate Item", variant="primary", size="lg")

                status = gr.Textbox(
                    label="Status",
                    value="Ready to generate item...",
                    interactive=False,
                )

            with gr.Column(scale=1):
                gr.Markdown("### 📝 Generated Prompt")
                prompt_display = gr.Textbox(
                    label="Complete Prompt",
                    value="Enter item description and style preferences to see the generated prompt...",
                    lines=8,
                    interactive=False,
                    show_copy_button=True,
                )

                output = gr.Image(
                    label="Generated Item",
                    show_label=True,
                )

    return ItemTabComponents(
        description=description,
        art_style=style_preferences.art_style,
        mood=style_preferences.mood,
        color_palette=style_preferences.color_palette,
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
    )


def bind_item_tab_events(
    components: ItemTabComponents,
    preview_prompt: Callable,
    generate_item: Callable,
    load_config: Callable,
) -> None:
    """Wire up callbacks for the item tab."""

    preview_inputs = [
        components.description,
        components.art_style,
        components.mood,
        components.color_palette,
        components.line_style,
        components.composition,
        components.additional_notes,
    ]

    register_prompt_preview(preview_inputs, preview_prompt, components.prompt_display)

    components.generate_button.click(
        fn=generate_item,
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
            components.line_style,
            components.composition,
            components.additional_notes,
            components.status,
        ],
        preview_fn=preview_prompt,
        preview_inputs=preview_inputs,
        preview_output=components.prompt_display,
    )
