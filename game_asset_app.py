"""Gradio application entry point for the 2D game asset generator."""

from __future__ import annotations

import gradio as gr
from PIL import Image
import os
import zipfile
import tempfile
from datetime import datetime

from config_manager import get_global_config_manager
from game_asset_generator import get_global_generator
from character_sprites_tab import bind_character_sprites_tab_events, create_character_sprites_tab
from sprite_images_tab import bind_sprite_images_tab_events, create_sprite_images_tab
from dead_sprite_tab import bind_dead_sprite_tab_events, create_dead_sprite_tab
from background_tab import bind_background_tab_events, create_background_tab
from character_tab import bind_character_tab_events, create_character_tab
from item_tab import bind_item_tab_events, create_item_tab
from pixel_character_tab import bind_pixel_character_tab_events, create_pixel_character_tab, generate_pixel_character
from settings_tab import bind_settings_tab_events, create_settings_tab
from shared import DEFAULT_CHOICES
from prompt_builder import (
    build_user_preferences, preview_character_prompt, preview_sprite_prompt,
    preview_background_prompt, preview_item_prompt
)


# 이미지 조작 함수들

def _convert_to_pil_image(image):
    """다양한 형태의 이미지를 PIL Image로 변환하는 헬퍼 함수"""
    if image is None:
        return None

    try:
        if isinstance(image, str):
            # 파일 경로인 경우
            return Image.open(image)
        elif hasattr(image, "save") and hasattr(image, "mode"):
            # 이미 PIL Image인 경우
            return image
        elif hasattr(image, "read"):  # BytesIO 또는 file-like 객체
            # BytesIO나 다른 file-like 객체인 경우
            try:
                # 현재 위치를 저장
                current_pos = image.tell()
                # PIL Image로 열기
                pil_image = Image.open(image)
                # 원래 위치로 되돌리기
                image.seek(current_pos)
                return pil_image
            except Exception as bytes_error:
                print(f"Error converting BytesIO to PIL: {bytes_error}")
                return None
        elif hasattr(image, "shape"):
            # numpy 배열인 경우
            if len(image.shape) == 3:
                # RGB 이미지
                if image.shape[2] == 3:
                    return Image.fromarray(image.astype("uint8"), "RGB")
                elif image.shape[2] == 4:
                    return Image.fromarray(image.astype("uint8"), "RGBA")
            elif len(image.shape) == 2:
                # 그레이스케일 이미지
                return Image.fromarray(image.astype("uint8"), "L")
        return None
    except Exception as e:  # pragma: no cover - defensive logging
        print(f"Error converting image to PIL: {e}")
        return None


def flip_image_horizontal(image):
    """이미지를 좌우 반전시킵니다."""
    pil_image = _convert_to_pil_image(image)
    if pil_image is None:
        return None

    try:
        return pil_image.transpose(Image.FLIP_LEFT_RIGHT)
    except Exception as e:  # pragma: no cover - defensive logging
        print(f"Error flipping image: {e}")
        return None


def rotate_image_90(image):
    """이미지를 90도 시계방향으로 회전시킵니다."""
    pil_image = _convert_to_pil_image(image)
    if pil_image is None:
        return None

    try:
        return pil_image.rotate(-90, expand=True)
    except Exception as e:  # pragma: no cover - defensive logging
        print(f"Error rotating image: {e}")
        return None


def rotate_image_180(image):
    """이미지를 180도 회전시킵니다."""
    pil_image = _convert_to_pil_image(image)
    if pil_image is None:
        return None

    try:
        return pil_image.rotate(180, expand=True)
    except Exception as e:  # pragma: no cover - defensive logging
        print(f"Error rotating image: {e}")
        return None


def rotate_image_270(image):
    """이미지를 270도 시계방향으로 회전시킵니다."""
    pil_image = _convert_to_pil_image(image)
    if pil_image is None:
        return None

    try:
        return pil_image.rotate(90, expand=True)
    except Exception as e:  # pragma: no cover - defensive logging
        print(f"Error rotating image: {e}")
        return None


# 설정 드롭다운 보조 함수

def _dropdown_update(choices, value="None"):
    """공통으로 사용하는 드롭다운 업데이트 헬퍼"""
    return gr.update(choices=choices, value=value)


def _refresh_all_config_dropdowns():
    """저장된 설정을 다시 읽어 모든 드롭다운을 갱신"""
    configs = get_saved_configs()
    update = _dropdown_update(configs)
    return (update, update, update, update, update, update)


# 프롬프트 빌드 및 미리보기 헬퍼는 ui/prompt_builder.py로 이동됨


# 생성 인터페이스 함수들

def generate_character_interface(character_description, art_style, mood, color_palette,
                                 character_style, line_style, composition, additional_notes,
                                 reference_image):
    """Interface function for character generation."""
    generator = get_global_generator()
    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)

        reference_path = None
        if reference_image is not None:
            reference_path = generator.save_reference_image(reference_image)

        image_path, _ = generator.generate_character_image(
            character_description, user_preferences, reference_path
        )

        return image_path, "✅ Character generated successfully!"

    except Exception as e:  # pragma: no cover - defensive logging
        error_msg = f"❌ Error generating character: {str(e)}"
        return None, error_msg


def generate_character_animation_with_frames_interface(character_description, action, art_style, mood,
                                                       color_palette, character_style, line_style, composition,
                                                       additional_notes, reference_image, duration, extract_frames, 
                                                       frame_skip, frame_name_prefix):
    """Interface function for character animation generation with optional frame extraction."""
    generator = get_global_generator()
    try:
        if not action or not action.strip():
            return None, [], "Please provide an action for animation.", gr.update(visible=False), gr.update(visible=False)

        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)

        reference_path = None
        if reference_image is not None:
            reference_path = generator.save_reference_image(reference_image)
            print(f"🎭 Using user's generated character for animation: {reference_path}")
        else:
            print("⚠️ No reference character provided. Animation will be generated from description only.")

        video_path = generator.generate_character_animation(
            character_description, action.strip(), user_preferences, reference_path, duration
        )

        extracted_frames = []
        if extract_frames and video_path:
            try:
                extracted_frames_data, _ = generator.extract_frames_from_video(
                    video_path, 
                    frame_interval=frame_skip, 
                    frame_name_prefix=frame_name_prefix
                )
                extracted_frames = [frame["frame_path"] for frame in extracted_frames_data]
                print(f"🎬 Extracted {len(extracted_frames)} frames from animation")
            except Exception as e:  # pragma: no cover - defensive logging
                print(f"⚠️ Frame extraction failed: {e}")

        status_msg = f"✅ Generated animation for '{action}' successfully!"
        if extracted_frames:
            status_msg += f" Extracted {len(extracted_frames)} frames."

        # 다운로드 버튼 표시 여부 결정
        show_download_buttons = len(extracted_frames) > 0

        return video_path, extracted_frames, status_msg, gr.update(visible=show_download_buttons), gr.update(visible=False)

    except Exception as e:  # pragma: no cover - defensive logging
        error_msg = f"❌ Error generating animation: {str(e)}"
        return None, [], error_msg, gr.update(visible=False), gr.update(visible=False)


def download_all_frames_interface(frames_gallery):
    """Download all extracted frames as a ZIP file."""
    try:
        if not frames_gallery or len(frames_gallery) == 0:
            return gr.update(visible=False), "❌ No frames available for download."
        
        # Handle different data formats from Gradio Gallery
        frame_paths = []
        for item in frames_gallery:
            frame_path = None
            if isinstance(item, tuple):
                # If it's a tuple, take the first element (usually the path)
                frame_path = item[0] if len(item) > 0 else None
            elif isinstance(item, str):
                # If it's a string, use it directly
                frame_path = item
            elif isinstance(item, list) and len(item) > 0:
                # If it's a list, take the first element
                frame_path = item[0]
            else:
                continue
            
            # Ensure frame_path is a string before checking if it exists
            if frame_path and isinstance(frame_path, str) and os.path.exists(frame_path):
                frame_paths.append(frame_path)
        
        if not frame_paths:
            return gr.update(visible=False), "❌ No valid frame files found for download."
        
        # Create ZIP file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"animation_frames_{timestamp}.zip"
        
        # Create temporary ZIP file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_zip:
            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for frame_path in frame_paths:
                    # Get filename from path
                    filename = os.path.basename(frame_path)
                    zipf.write(frame_path, filename)
            
            # Return the temporary file path for Gradio to handle download
            return gr.update(value=temp_zip.name, visible=True), f"✅ Created ZIP file with {len(frame_paths)} frames. Click the download button below!"
    
    except Exception as e:
        import traceback
        print(f"❌ Full error traceback: {traceback.format_exc()}")
        return gr.update(visible=False), f"❌ Error downloading frames: {str(e)}"




def generate_character_animation_interface(character_description, action, art_style, mood,
                                           color_palette, character_style, line_style, composition,
                                           additional_notes, reference_image, duration):
    """Interface function for character animation generation using user's generated character."""
    generator = get_global_generator()
    try:
        if not action or not action.strip():
            return None, "Please provide an action for animation."

        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)

        reference_path = None
        if reference_image is not None:
            reference_path = generator.save_reference_image(reference_image)
            print(f"🎭 Using user's generated character for animation: {reference_path}")
        else:
            print("⚠️ No reference character provided. Animation will be generated from description only.")

        video_path = generator.generate_character_animation(
            character_description, action.strip(), user_preferences, reference_path, duration
        )

        if reference_path:
            return video_path, f"✅ Generated animation for '{action}' using your character successfully!"
        else:
            return video_path, f"✅ Generated animation for '{action}' from description successfully!"

    except Exception as e:  # pragma: no cover - defensive logging
        error_msg = f"❌ Error generating animation: {str(e)}"
        return None, error_msg


def generate_background_interface(background_description, orientation, art_style, mood,
                                  color_palette, line_style, composition, additional_notes):
    """Interface function for background generation."""
    generator = get_global_generator()
    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, None, line_style, composition, additional_notes)

        image_path, _ = generator.generate_background_image(
            background_description, orientation, user_preferences
        )

        return image_path, f"✅ Background generated successfully! ({orientation})"

    except Exception as e:  # pragma: no cover - defensive logging
        error_msg = f"❌ Error generating background: {str(e)}"
        return None, error_msg


def generate_character_sprites_interface(character_description, actions_text, art_style, mood, 
                                       color_palette, character_style, line_style, composition, 
                                       additional_notes, reference_image):
    """Interface function for character sprite generation."""
    generator = get_global_generator()
    try:
        # Parse actions from text input
        actions = [action.strip() for action in actions_text.split(',') if action.strip()]
        if not actions:
            return [], "Please provide at least one action separated by commas."
        
        # Build user preferences dictionary
        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)
        
        # Handle reference image
        reference_path = None
        if reference_image is not None:
            reference_path = generator.save_reference_image(reference_image)
        
        # Generate character sprites
        generated_sprites = generator.generate_character_sprites(
            character_description, actions, user_preferences, reference_path
        )
        
        # Return image paths for gallery display
        image_paths = [sprite['image_path'] for sprite in generated_sprites]
        
        return image_paths, f"✅ Generated {len(generated_sprites)} sprites successfully!"
        
    except Exception as e:
        error_msg = f"❌ Error generating sprites: {str(e)}"
        return [], error_msg


def generate_sprite_animation_interface(reference_image, action_type):
    """Interface function for sprite animation generation."""
    generator = get_global_generator()
    try:
        return generator.generate_sprite_animation(reference_image, action_type)
    except Exception as e:
        error_msg = f"❌ Error generating sprite animation: {str(e)}"
        return [], error_msg


def generate_dead_animation_interface(reference_image):
    """Interface function for dead animation generation."""
    generator = get_global_generator()
    try:
        return generator.generate_dead_animation(reference_image)
    except Exception as e:
        error_msg = f"❌ Error generating dead animation: {str(e)}"
        return [], error_msg


def update_animation_info(action_type):
    """Update animation info based on selected action type"""
    if action_type == "attack":
        animation_text = """
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
        """
        frame_text = """
        **Attack Frame 순서**: Original → Idle → Charge-up → Aiming → Lunge → Impact → Aftershock → Combined Sheet
        
        *각 프레임을 클릭하여 개별 다운로드 가능*
        """
    else:  # jump
        animation_text = """
        **Jump Animation Frames**:
        **Frame 1**: Original character (uploaded)
        **Frame 2**: Jump preparation pose
        **Frame 3**: Jump launch pose
        **Frame 4**: Mid-air rising pose
        **Frame 5**: Jump apex pose
        **Frame 6**: Descending pose
        **Frame 7**: Landing impact pose
        **Frame 8**: Combined sprite sheet (all frames horizontally)
        
        *Character will maintain exact appearance from uploaded image*
        """
        frame_text = """
        **Jump Frame 순서**: Original → Prepare → Launch → Air Rise → Air Peak → Air Fall → Land → Combined Sheet
        
        *각 프레임을 클릭하여 개별 다운로드 가능*
        """
    
    return animation_text, frame_text


def generate_item_interface(item_description, art_style, mood, color_palette,
                            line_style, composition, additional_notes, reference_image):
    """Interface function for item generation."""
    generator = get_global_generator()
    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, None, line_style, composition, additional_notes)

        reference_path = None
        if reference_image is not None:
            reference_path = generator.save_reference_image(reference_image)

        image_path, _ = generator.generate_item_image(
            item_description, user_preferences, reference_path
        )

        return image_path, "✅ Item generated successfully!"

    except Exception as e:  # pragma: no cover - defensive logging
        error_msg = f"❌ Error generating item: {str(e)}"
        return None, error_msg


# 설정 저장/불러오기 인터페이스

def save_config_interface(config_name, art_style, mood, color_palette,
                          character_style, line_style, composition, additional_notes):
    """설정을 저장하는 인터페이스 함수"""
    config_manager = get_global_config_manager()
    try:
        if not config_name.strip():
            return "❌ Please enter a setting name."

        config_data = {
            "art_style": art_style if art_style != "None" else None,
            "mood": mood if mood != "None" else None,
            "color_palette": color_palette if color_palette != "None" else None,
            "character_style": character_style if character_style != "None" else None,
            "line_style": line_style if line_style != "None" else None,
            "composition": composition if composition != "None" else None,
            "additional_notes": additional_notes.strip() if additional_notes.strip() else None,
        }

        config_data = {k: v for k, v in config_data.items() if v is not None}

        if config_manager.save_config(config_name, config_data):
            return f"✅ Setting '{config_name}' saved successfully!"
        else:
            return "❌ Failed to save setting."

    except Exception as e:  # pragma: no cover - defensive logging
        return f"❌ Error: {str(e)}"


def load_config_interface(config_name):
    """설정을 불러오는 인터페이스 함수"""
    config_manager = get_global_config_manager()
    try:
        if not config_name or config_name == "None":
            return "None", "None", "None", "None", "None", "None", "None", "설정을 선택해주세요."

        config_data = config_manager.load_config(config_name)

        if config_data:
            return (
                config_data.get("art_style", "None"),
                config_data.get("mood", "None"),
                config_data.get("color_palette", "None"),
                config_data.get("character_style", "None"),
                config_data.get("line_style", "None"),
                config_data.get("composition", "None"),
                config_data.get("additional_notes", ""),
                f"✅ 설정 '{config_name}'을 불러왔습니다!",
            )
        else:
            return "None", "None", "None", "None", "None", "None", "None", "❌ Setting not found."

    except Exception as e:  # pragma: no cover - defensive logging
        return "None", "None", "None", "None", "None", "None", "None", f"❌ Error: {str(e)}"


def delete_config_interface(config_name):
    """설정을 삭제하는 인터페이스 함수"""
    config_manager = get_global_config_manager()
    try:
        if not config_name or config_name == "None":
            configs = get_saved_configs()
            return "Please select a setting to delete.", _dropdown_update(configs)

        if config_manager.delete_config(config_name):
            configs = get_saved_configs()
            return f"✅ Setting '{config_name}' deleted successfully!", _dropdown_update(configs)
        else:
            configs = get_saved_configs()
            return f"❌ Failed to delete setting '{config_name}'.", _dropdown_update(configs)

    except Exception as e:  # pragma: no cover - defensive logging
        configs = get_saved_configs()
        return f"❌ Error: {str(e)}", _dropdown_update(configs)


# 설정 목록 헬퍼

def get_saved_configs():
    """저장된 설정 목록을 반환"""
    config_manager = get_global_config_manager()
    configs = config_manager.get_config_names()
    return DEFAULT_CHOICES + configs


# 앱 생성 함수

def create_game_asset_interface():
    """Create and wire up the Gradio Blocks interface."""
    initial_configs = get_saved_configs()

    with gr.Blocks(
        title="2D Game Asset Generator",
        theme=gr.themes.Soft(),
    ) as demo:
        gr.Markdown("# 🎮 2D Game Asset Generator")
        gr.Markdown("Create characters, backgrounds, and items for your 2D games using AI!")

        character_tab = create_character_tab(initial_configs)
        character_sprites_tab = create_character_sprites_tab(initial_configs)
        sprite_images_tab = create_sprite_images_tab(initial_configs)
        dead_sprite_tab = create_dead_sprite_tab(initial_configs)
        background_tab = create_background_tab(initial_configs)
        item_tab = create_item_tab(initial_configs)
        pixel_character_tab = create_pixel_character_tab()
        settings_tab = create_settings_tab(initial_configs)

        bind_character_tab_events(
            character_tab,
            preview_character_prompt,
            generate_character_interface,
            load_config_interface,
            flip_image_horizontal,
            rotate_image_90,
            rotate_image_180,
            rotate_image_270,
        )

        bind_character_sprites_tab_events(
            character_sprites_tab,
            preview_sprite_prompt,
            generate_character_sprites_interface,
            load_config_interface,
        )

        bind_sprite_images_tab_events(
            sprite_images_tab,
            generate_sprite_animation_interface,
            update_animation_info,
        )

        bind_dead_sprite_tab_events(
            dead_sprite_tab,
            generate_dead_animation_interface,
        )

        bind_background_tab_events(
            background_tab,
            preview_background_prompt,
            generate_background_interface,
            load_config_interface,
        )

        bind_item_tab_events(
            item_tab,
            preview_item_prompt,
            generate_item_interface,
            load_config_interface,
        )

        bind_pixel_character_tab_events(
            pixel_character_tab,
            generate_pixel_character,
        )

        save_event, _, delete_event = bind_settings_tab_events(
            settings_tab,
            save_config_interface,
            load_config_interface,
            delete_config_interface,
        )

        refresh_targets = [
            settings_tab.load_config_dropdown,
            settings_tab.delete_config_dropdown,
            character_tab.config_dropdown,
            character_sprites_tab.config_dropdown,
            background_tab.config_dropdown,
            item_tab.config_dropdown,
        ]

        save_event.then(fn=_refresh_all_config_dropdowns, outputs=refresh_targets)
        delete_event.then(fn=_refresh_all_config_dropdowns, outputs=refresh_targets)

        demo.load(fn=_refresh_all_config_dropdowns, outputs=refresh_targets)

    return demo


if __name__ == "__main__":
    demo = create_game_asset_interface()
    demo.launch(
        share=True,
        server_name="0.0.0.0",
        server_port=7863,
    )
