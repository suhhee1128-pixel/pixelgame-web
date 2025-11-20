"""UI construction and bindings for the settings management tab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Tuple

import gradio as gr

from utils import ART_STYLES, CHARACTER_STYLES, COLOR_PALETTES, COMPOSITION_STYLES, LINE_STYLES, MOOD_OPTIONS
from shared import create_config_dropdown, render_style_preferences


@dataclass
class SettingsTabComponents:
    """Holds Gradio components that make up the settings tab."""

    load_config_dropdown: gr.Dropdown
    load_button: gr.Button
    load_status: gr.Textbox
    delete_config_dropdown: gr.Dropdown
    delete_button: gr.Button
    delete_status: gr.Textbox
    save_name: gr.Textbox
    save_art_style: gr.Dropdown
    save_mood: gr.Dropdown
    save_color_palette: gr.Dropdown
    save_character_style: gr.Dropdown
    save_line_style: gr.Dropdown
    save_composition: gr.Dropdown
    save_additional_notes: gr.Textbox
    save_button: gr.Button
    save_status: gr.Textbox


def create_settings_tab(initial_configs: Iterable[str]) -> SettingsTabComponents:
    """Create the settings management tab and return its components."""

    with gr.Tab("⚙️ Setting"):
        gr.Markdown("### 💾 Save and Load Style Settings")
        gr.Markdown("Save and load frequently used style settings for reuse.")

        with gr.Row():
            with gr.Column(scale=1):
                gr.Markdown("#### Saved Settings Load")
                load_config_dropdown = create_config_dropdown(initial_configs)

                load_button = gr.Button("📂 Load Settings", variant="secondary")

                load_status = gr.Textbox(
                    label="Status",
                    value="Select a setting and click the load button.",
                    interactive=False,
                )

                gr.Markdown("#### Delete Settings")
                delete_config_dropdown = create_config_dropdown(initial_configs, "Select a setting to delete")

                delete_button = gr.Button("🗑️ Delete Settings", variant="stop")

                delete_status = gr.Textbox(
                    label="Delete Status",
                    value="Select a setting to delete.",
                    interactive=False,
                )

            with gr.Column(scale=2):
                gr.Markdown("#### Save Current Settings")
                gr.Markdown("You can save the current settings by adjusting the settings below.")

                save_name = gr.Textbox(
                    label="Setting Name",
                    placeholder="e.g. My Basic Style, Fantasy Style, Pixel Art, etc.",
                    lines=1,
                )

                style_preferences = render_style_preferences(
                    art_style_options=ART_STYLES,
                    mood_options=MOOD_OPTIONS,
                    color_palette_options=COLOR_PALETTES,
                    line_style_options=LINE_STYLES,
                    composition_options=COMPOSITION_STYLES,
                    include_character_style=True,
                    character_style_options=CHARACTER_STYLES,
                )

                save_additional_notes = gr.Textbox(
                    label="Additional Style Notes",
                    placeholder="Additional style notes...",
                    lines=3,
                )

                save_button = gr.Button("💾 Save Settings", variant="primary", size="lg")

                save_status = gr.Textbox(
                    label="Save Status",
                    value="Enter the settings and click the save button.",
                    interactive=False,
                )

        gr.Markdown("### 📋 Usage")
        gr.Markdown(
            """
            1. **Save Settings**: Adjust the settings fields to your desired values, enter the setting name, and click the 'Save Settings' button.
            2. **Load Settings**: Select a setting from the saved settings list and click the 'Load Settings' button.
            3. **Delete Settings**: Select a setting you no longer need and click the 'Delete Settings' button.
            """
        )

    return SettingsTabComponents(
        load_config_dropdown=load_config_dropdown,
        load_button=load_button,
        load_status=load_status,
        delete_config_dropdown=delete_config_dropdown,
        delete_button=delete_button,
        delete_status=delete_status,
        save_name=save_name,
        save_art_style=style_preferences.art_style,
        save_mood=style_preferences.mood,
        save_color_palette=style_preferences.color_palette,
        save_character_style=style_preferences.character_style,
        save_line_style=style_preferences.line_style,
        save_composition=style_preferences.composition,
        save_additional_notes=save_additional_notes,
        save_button=save_button,
        save_status=save_status,
    )


def bind_settings_tab_events(
    components: SettingsTabComponents,
    save_config: Callable,
    load_config: Callable,
    delete_config: Callable,
) -> Tuple[gr.events.EventListener, gr.events.EventListener, gr.events.EventListener]:
    """Wire up callbacks for the settings tab and return the event listeners."""

    save_event = components.save_button.click(
        fn=save_config,
        inputs=[
            components.save_name,
            components.save_art_style,
            components.save_mood,
            components.save_color_palette,
            components.save_character_style,
            components.save_line_style,
            components.save_composition,
            components.save_additional_notes,
        ],
        outputs=[components.save_status],
    )

    load_event = components.load_button.click(
        fn=load_config,
        inputs=[components.load_config_dropdown],
        outputs=[
            components.save_art_style,
            components.save_mood,
            components.save_color_palette,
            components.save_character_style,
            components.save_line_style,
            components.save_composition,
            components.save_additional_notes,
            components.load_status,
        ],
    )

    delete_event = components.delete_button.click(
        fn=delete_config,
        inputs=[components.delete_config_dropdown],
        outputs=[components.delete_status, components.delete_config_dropdown],
    )

    return save_event, load_event, delete_event
