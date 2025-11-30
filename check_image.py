from PIL import Image
import os

try:
    img_path = 'public/start-button-1.png'
    if os.path.exists(img_path):
        with Image.open(img_path) as img:
            print(f"Image size: {img.size}")
            print(f"Image mode: {img.mode}")
            # bbox = img.getbbox()
            # if bbox:
            #     print(f"Content bbox: {bbox}")
            # else:
            #     print("Image is empty/transparent")
    else:
        print("File not found")
except Exception as e:
    print(f"Error: {e}")

