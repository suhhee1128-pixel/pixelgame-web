"""프롬프트 빌더 모듈 - UI에서 사용하는 프롬프트 생성 및 미리보기 기능"""

from __future__ import annotations

from typing import Dict, Optional


def build_user_preferences(art_style: str, mood: str, color_palette: str, 
                          character_style: Optional[str], line_style: str, 
                          composition: str, additional_notes: str) -> Dict[str, str]:
    """사용자 설정을 딕셔너리로 구성하는 공통 함수"""
    user_preferences = {}
    if art_style and art_style != "None":
        user_preferences["art_style"] = art_style
    if mood and mood != "None":
        user_preferences["mood"] = mood
    if color_palette and color_palette != "None":
        user_preferences["color_palette"] = color_palette
    if character_style and character_style != "None":
        user_preferences["character_style"] = character_style
    if line_style and line_style != "None":
        user_preferences["line_style"] = line_style
    if composition and composition != "None":
        user_preferences["composition"] = composition
    if additional_notes and additional_notes.strip():
        user_preferences["additional_notes"] = additional_notes.strip()
    return user_preferences


def get_style_instructions(style_preferences: Dict[str, str]) -> str:
    """스타일 설정을 기반으로 스타일 지시사항 생성"""
    if not style_preferences:
        return ""
    
    instructions = []
    
    if style_preferences.get('art_style'):
        instructions.append(f"Art Style: {style_preferences['art_style']}")
    
    if style_preferences.get('mood'):
        instructions.append(f"Mood: {style_preferences['mood']}")
    
    if style_preferences.get('color_palette'):
        instructions.append(f"Color Palette: {style_preferences['color_palette']}")
    
    if style_preferences.get('character_style'):
        instructions.append(f"Character Style: {style_preferences['character_style']}")
    
    if style_preferences.get('line_style'):
        instructions.append(f"Line Style: {style_preferences['line_style']}")
    
    if style_preferences.get('composition'):
        instructions.append(f"Composition: {style_preferences['composition']}")
    
    if style_preferences.get('additional_notes'):
        instructions.append(f"Additional Notes: {style_preferences['additional_notes']}")
    
    return "\n".join(instructions)


def build_character_prompt(character_description: str, style_preferences: Optional[Dict[str, str]] = None) -> str:
    """캐릭터 생성용 프롬프트 빌드"""
    base_prompt = f"""
    Create a character image based on the following description:
    {character_description}
    
    The character should be:
    - Entire character's body shows in the image
    - Clear and recognizable at small sizes
    - Well-defined silhouette
    - no background
    - no other objects
    - Consistent art style
    - Follow the reference image if provided
    - No shadows
    """
    
    if style_preferences:
        style_instructions = get_style_instructions(style_preferences)
        base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
    
    return base_prompt


def build_sprite_prompt(character_description: str, action: str, style_preferences: Optional[Dict[str, str]] = None) -> str:
    """스프라이트 생성용 프롬프트 빌드"""
    base_prompt = f"""
    Create a 2D character sprite showing the character performing the action: {action}
    
    Character description: {character_description}
    
    The sprite should be:
    - Clear and recognizable at small sizes
    - Suitable for sprite animation
    - Well-defined silhouette
    - Consistent art style
    - Show the character in the middle of performing the action
    - Follow the reference image if provided
    """
    
    if style_preferences:
        style_instructions = get_style_instructions(style_preferences)
        base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
    
    return base_prompt


def build_background_prompt(background_description: str, orientation: str, style_preferences: Optional[Dict[str, str]] = None) -> str:
    """배경 생성용 프롬프트 빌드"""
    aspect_ratio = "16:9" if orientation == "landscape" else "9:16"
    
    base_prompt = f"""
    Create a 2D game background based on the following description:
    {background_description}
    
    The background should be:
    - Designed for 2D games
    - {orientation} orientation ({aspect_ratio} aspect ratio)
    - Suitable for parallax scrolling
    - Clear and detailed
    - Consistent art style
    - No characters or interactive elements
    - Follow the reference image if provided
    """
    
    if style_preferences:
        style_instructions = get_style_instructions(style_preferences)
        base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
    
    return base_prompt


def build_item_prompt(item_description: str, style_preferences: Optional[Dict[str, str]] = None) -> str:
    """아이템 생성용 프롬프트 빌드"""
    base_prompt = f"""
    Create a 2D game item sprite based on the following description:
    {item_description}
    
    The item should be:
    - Designed for 2D games
    - Clear and recognizable at small sizes
    - Suitable for inventory systems
    - Well-defined silhouette
    - Consistent art style
    - Isolated on transparent background
    - Follow the reference image if provided
    """
    
    if style_preferences:
        style_instructions = get_style_instructions(style_preferences)
        base_prompt += f"\n\nStyle Requirements:\n{style_instructions}"
    
    return base_prompt


def build_animation_prompt(character_description: str, action: str, style_preferences: Optional[Dict[str, str]] = None) -> str:
    """애니메이션 생성용 프롬프트 빌드"""
    base_prompt = f"{character_description} performing {action} action"
    
    # Add style preferences
    if style_preferences:
        style_instructions = get_style_instructions(style_preferences)
        if style_instructions:
            base_prompt += f". Style: {style_instructions}"
    
    # Add animation-specific instructions
    animation_instructions = f"""
    The character should be performing a smooth, natural {action} movement. 
    The animation should be fluid and dynamic, showing the character's motion clearly.
    Keep the character consistent throughout the animation.
    Set against a clean background to focus on the character's movement.
    The animation should be suitable for game use with clear, readable motion.
    """
    
    return base_prompt + animation_instructions


# 프롬프트 미리보기 함수들
def preview_character_prompt(character_description: str, art_style: str, mood: str, color_palette: str,
                           character_style: str, line_style: str, composition: str, additional_notes: str) -> str:
    """캐릭터 생성 프롬프트 미리보기"""
    if not character_description or not character_description.strip():
        return "Enter a character description to see the generated prompt..."

    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)
        prompt = build_character_prompt(character_description, user_preferences)
        return prompt
    except Exception as e:
        return f"Error generating prompt preview: {str(e)}"


def preview_animation_prompt(character_description: str, action: str, art_style: str, mood: str, color_palette: str,
                           character_style: str, line_style: str, composition: str, additional_notes: str) -> str:
    """애니메이션 생성 프롬프트 미리보기"""
    if not character_description or not character_description.strip():
        return "Enter a character description to see the generated prompt..."

    if not action or not action.strip():
        return "Enter an animation action to see the generated prompt..."

    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)
        prompt = build_animation_prompt(character_description, action.strip(), user_preferences)
        return prompt
    except Exception as e:
        return f"Error generating prompt preview: {str(e)}"


def preview_background_prompt(background_description: str, orientation: str, art_style: str, mood: str, color_palette: str,
                            line_style: str, composition: str, additional_notes: str) -> str:
    """배경 생성 프롬프트 미리보기"""
    if not background_description or not background_description.strip():
        return "Enter a background description to see the generated prompt..."

    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, None, line_style, composition, additional_notes)
        prompt = build_background_prompt(background_description, orientation, user_preferences)
        return prompt
    except Exception as e:
        return f"Error generating prompt preview: {str(e)}"


def preview_sprite_prompt(character_description: str, actions_text: str, art_style: str, mood: str, color_palette: str,
                         character_style: str, line_style: str, composition: str, additional_notes: str) -> str:
    """스프라이트 생성 프롬프트 미리보기"""
    if not character_description or not character_description.strip():
        return "Enter a character description to see the generated prompt..."
    
    if not actions_text or not actions_text.strip():
        return "Enter actions to see the generated prompt..."
    
    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, character_style, line_style, composition, additional_notes)
        actions = [action.strip() for action in actions_text.split(',') if action.strip()]
        if actions:
            # Show prompt for the first action as an example
            prompt = build_sprite_prompt(character_description, actions[0], user_preferences)
            return prompt
        else:
            return "Enter valid actions separated by commas..."
    except Exception as e:
        return f"Error generating prompt preview: {str(e)}"


def preview_item_prompt(item_description: str, art_style: str, mood: str, color_palette: str,
                       line_style: str, composition: str, additional_notes: str) -> str:
    """아이템 생성 프롬프트 미리보기"""
    if not item_description or not item_description.strip():
        return "Enter an item description to see the generated prompt..."

    try:
        user_preferences = build_user_preferences(art_style, mood, color_palette, None, line_style, composition, additional_notes)
        prompt = build_item_prompt(item_description, user_preferences)
        return prompt
    except Exception as e:
        return f"Error generating prompt preview: {str(e)}"
