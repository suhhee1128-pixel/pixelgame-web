from PIL import Image
import os

try:
    img_path = 'public/start-button-1.png'
    if os.path.exists(img_path):
        with Image.open(img_path) as img:
            print(f"Image size: {img.size}")
            print(f"Image mode: {img.mode}")
            
            bbox = img.getbbox()
            print(f"BBox: {bbox}")
            
            # Check corners
            corners = [
                img.getpixel((0, 0)),
                img.getpixel((img.width-1, 0)),
                img.getpixel((0, img.height-1)),
                img.getpixel((img.width-1, img.height-1))
            ]
            print(f"Corner pixels: {corners}")
            
            # Check center
            center_pixel = img.getpixel((img.width//2, img.height//2))
            print(f"Center pixel: {center_pixel}")

            # Check alpha channel if exists
            if img.mode == 'RGBA':
                extrema = img.getextrema()
                print(f"Extrema: {extrema}")
                alpha_extrema = extrema[3]
                print(f"Alpha extrema: {alpha_extrema}")
                
                if alpha_extrema[0] == 255:
                     print("Image is fully opaque (no transparency)")
                else:
                     print("Image has transparency")

    else:
        print("File not found")
except Exception as e:
    print(f"Error: {e}")

