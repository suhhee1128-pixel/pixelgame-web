from PIL import Image
import os
from collections import deque

def crop_center_component(img_path, output_path):
    try:
        with Image.open(img_path) as img:
            img = img.convert("RGBA")
            width, height = img.size
            pixels = img.load()
            
            # Visited array
            visited = set()
            
            # Start from center
            start_x, start_y = width // 2, height // 2
            
            # Check if center is transparent. If so, search spirally for a non-transparent pixel
            if pixels[start_x, start_y][3] == 0:
                print("Center is transparent. Searching for content...")
                found = False
                # Simple spiral or just scan center area
                for r in range(1, min(width, height)//2, 10):
                    if found: break
                    for i in range(-r, r+1, 5): # Step 5 for speed
                        if found: break
                        # Check top/bottom rows of box
                        for x in [start_x + i, start_x - i]:
                            if 0 <= x < width:
                                for y in [start_y - r, start_y + r]:
                                    if 0 <= y < height and pixels[x, y][3] > 0:
                                        start_x, start_y = x, y
                                        found = True
                                        break
                if not found:
                    print("Could not find content near center.")
                    return False

            print(f"Starting flood fill from ({start_x}, {start_y})")
            
            # BFS to find connected component
            queue = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            
            min_x, max_x = start_x, start_x
            min_y, max_y = start_y, start_y
            
            count = 0
            
            while queue:
                x, y = queue.popleft()
                
                # Update bbox
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                
                count += 1
                if count % 10000 == 0:
                    print(f"Processed {count} pixels...")

                # Check neighbors (4-connectivity)
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            # If alpha > 10 (tolerance for semi-transparent edges)
                            if pixels[nx, ny][3] > 10:
                                visited.add((nx, ny))
                                queue.append((nx, ny))
                            else:
                                # Mark as visited to avoid re-checking transparent pixels too many times?
                                # No, because we only add to queue if it's part of component.
                                # But we should keep track of visited transparent pixels to avoid checking them again?
                                # Actually, standard BFS visited set should contain ALL visited nodes.
                                # BUT here we only traverse the component.
                                # So we check color before adding to queue.
                                # We can't add transparent pixels to 'visited' if we don't traverse them.
                                # But we need to avoid checking the same transparent neighbor multiple times from different component pixels.
                                # So we can have a 'checked' set.
                                pass
                                
            print(f"Component found. BBox: ({min_x}, {min_y}, {max_x}, {max_y})")
            
            # Crop
            # Add a small padding
            padding = 5
            crop_box = (
                max(0, min_x - padding),
                max(0, min_y - padding),
                min(width, max_x + 1 + padding),
                min(height, max_y + 1 + padding)
            )
            
            cropped_img = img.crop(crop_box)
            cropped_img.save(output_path)
            print(f"Saved cropped image to {output_path}")
            return True

    except Exception as e:
        print(f"Error: {e}")
        return False

# Run the crop
crop_center_component('public/start-button-1.png', 'public/start-button-cropped.png')

