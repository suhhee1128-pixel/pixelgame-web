# sora2_client.py
import os, time, base64, requests
from openai import OpenAI
import time
from dotenv import load_dotenv
from PIL import Image

# .env 파일 로드
load_dotenv()

SORA_API_BASE = "https://api.openai.com/v1/video"  # 예시 엔드포인트(문서 확인)
SORA_MODEL = os.getenv("SORA2_MODEL", "sora-2")    # 공식 문서 표기 사용
API_KEY = os.getenv("OPENAI_API_KEY")

def resize_image_to_video_size(image_path, target_width=720, target_height=1280):
    """이미지를 비디오 크기에 맞게 리사이즈"""
    with Image.open(image_path) as img:
        # 이미지를 정확한 크기로 리사이즈
        resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        # 임시 파일로 저장
        temp_path = "temp_resized_image.png"
        resized_img.save(temp_path)
        return temp_path

def generate_motion_video(prompt:str, ref_image_path:str=None,
                          duration_s:int=3, width:int=720, height:int=1280,
                          seed:int=None, style_preset:str=None, webhook_url:str=None):
    headers = {"Authorization": f"Bearer {API_KEY}"}


    client = OpenAI(api_key=API_KEY)
    
    # 참조 이미지 파일 준비 (크기 조정)
    input_reference = None
    temp_image_path = None
    if ref_image_path:
        # 이미지를 비디오 크기에 맞게 리사이즈
        temp_image_path = resize_image_to_video_size(ref_image_path, 720, 1280)
        input_reference = open(temp_image_path, "rb")
    
    #Sora 720x1280 
    #sora pro 1280 x 720
    response = client.videos.create(
        model="sora-2",
        prompt=prompt,
        input_reference=input_reference,
        size="720x1280",
        seconds=4
    )
    print(response)
    
    # 파일 닫기 및 임시 파일 정리
    if input_reference:
        input_reference.close()
    if temp_image_path and os.path.exists(temp_image_path):
        os.remove(temp_image_path)

    video_id = response.id
    while True:
        status = client.videos.retrieve(video_id)
        if status.status == "completed":
            break
        elif status.status == "failed":
            raise Exception("Generation failed")
        time.sleep(10)

    content = client.videos.download_content(video_id)
    with open("output2.mp4", "wb") as f:
        f.write(content.read())

if __name__ == "__main__":
    ref_image_path = "./image/cat1.png"
    prompt="A cute black cat character with vibrant green eyes, dressed in a playful pink hoodie and cap, walks in a lively and dynamic pose, channeling the spirited movement of a cartoon character. The scene showcases the cat's fluid gait, emphasizing the swing of its tail and movement of its legs. Set against a clean white background, the vivid colors and charming details of the cat's attire are accentuated, creating a visually striking contrast. Captured in medium shot with clear, bright lighting, the atmosphere is cheerful and energetic, bringing the character to life in a delightful way."

    generate_motion_video(prompt, ref_image_path)