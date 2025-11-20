from PIL import Image

def resize_image_with_padding(image, target_width=1280, target_height=720, background_color=(255, 255, 255, 255)):
    """비율을 유지하면서 패딩을 추가하여 이미지 크기 조정"""
    # 현재 이미지 크기
    original_width, original_height = image.size
    
    # 비율 계산
    width_ratio = target_width / original_width
    height_ratio = target_height / original_height
    
    # 더 작은 비율을 사용하여 비율 유지
    scale_ratio = min(width_ratio, height_ratio)
    
    # 새로운 크기 계산
    new_width = int(original_width * scale_ratio)
    new_height = int(original_height * scale_ratio)
    
    # 이미지 리사이즈
    resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # 패딩 계산
    pad_width = (target_width - new_width) // 2
    pad_height = (target_height - new_height) // 2
    
    # 새 이미지 생성 (흰색 배경)
    new_image = Image.new('RGBA', (target_width, target_height), background_color)
    
    # 리사이즈된 이미지를 중앙에 붙여넣기
    new_image.paste(resized_image, (pad_width, pad_height), resized_image if resized_image.mode == 'RGBA' else None)
    
    return new_image

# 테스트 코드는 제거됨
# 사용 예시:
from image_resize import resize_image_with_padding
from PIL import Image

image = Image.open("Left_1.png")
resized_image = resize_image_with_padding(image, 1280, 720)
resized_image.save("resized_Left_1.png")
