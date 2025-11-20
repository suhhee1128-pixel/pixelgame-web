"""Shared UI helpers and constants for the Gradio interface."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Sequence

import gradio as gr

DEFAULT_CHOICES: list[str] = ["None"]
FILE_TYPES: list[str] = [".png", ".jpg", ".jpeg", ".webp"]


@dataclass
class StylePreferenceControls:
    """Collection of dropdowns that capture user style preferences."""

    art_style: gr.Dropdown
    mood: gr.Dropdown
    color_palette: gr.Dropdown
    line_style: gr.Dropdown
    composition: gr.Dropdown
    character_style: gr.Dropdown | None = None


def _create_style_dropdown(label: str, options: Sequence[str]) -> gr.Dropdown:
    """Create a dropdown that defaults to the shared \"None\" option."""

    return gr.Dropdown(
        choices=DEFAULT_CHOICES + list(options),
        value="None",
        label=label,
    )


def render_style_preferences(
    *,
    art_style_options: Sequence[str],
    mood_options: Sequence[str],
    color_palette_options: Sequence[str],
    line_style_options: Sequence[str],
    composition_options: Sequence[str],
    include_character_style: bool = False,
    character_style_options: Sequence[str] | None = None,
) -> StylePreferenceControls:
    """Render the standard style preference row used across tabs."""

    with gr.Row():
        with gr.Column():
            art_style = _create_style_dropdown("Art Style", art_style_options)
            mood = _create_style_dropdown("Overall Mood", mood_options)
            color_palette = _create_style_dropdown("Color Palette", color_palette_options)

        with gr.Column():
            character_style = None
            if include_character_style:
                if character_style_options is None:
                    raise ValueError("character_style_options must be provided when include_character_style is True")
                character_style = _create_style_dropdown("Character Style", character_style_options)
            line_style = _create_style_dropdown("Line Art Style", line_style_options)
            composition = _create_style_dropdown("Composition Style", composition_options)

    return StylePreferenceControls(
        art_style=art_style,
        mood=mood,
        color_palette=color_palette,
        character_style=character_style,
        line_style=line_style,
        composition=composition,
    )


def create_config_dropdown(initial_configs: Sequence[str], label: str = "Saved Settings Selection") -> gr.Dropdown:
    """Return a dropdown pre-populated with stored configuration names."""

    return gr.Dropdown(
        choices=list(initial_configs),
        value="None",
        label=label,
        interactive=True,
        allow_custom_value=True,
    )


def create_reference_upload(label: str = "Upload Reference", file_types: Iterable[str] = FILE_TYPES) -> gr.File:
    """Return a file uploader for optional reference images."""

    return gr.File(label=label, file_types=list(file_types))


def register_prompt_preview(
    preview_inputs: Sequence[gr.components.Component],
    preview_fn: Callable,
    preview_output: gr.components.Component,
) -> None:
    """Attach a preview callback to every input component in the sequence."""

    for trigger in preview_inputs:
        trigger.change(
            fn=preview_fn,
            inputs=list(preview_inputs),
            outputs=[preview_output],
        )


def bind_config_loader(
    *,
    button: gr.Button,
    load_fn: Callable,
    dropdown: gr.Dropdown,
    outputs: Sequence[gr.components.Component],
    preview_fn: Callable | None = None,
    preview_inputs: Sequence[gr.components.Component] | None = None,
    preview_output: gr.components.Component | None = None,
) -> None:
    """Bind the load configuration button and optionally refresh the preview."""

    load_event = button.click(
        fn=load_fn,
        inputs=[dropdown],
        outputs=list(outputs),
    )

    if preview_fn and preview_inputs and preview_output is not None:
        load_event.then(
            fn=preview_fn,
            inputs=list(preview_inputs),
            outputs=[preview_output],
        )
