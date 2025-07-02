import os
import json
from glob import glob

# Paths
SVG_ROOT = os.path.join(os.path.dirname(__file__), '../colorful_icons')
OLD_MAPPING_PATH = os.path.join(os.path.dirname(__file__), 'mapping.json')
NEW_MAPPING_PATH = os.path.join(os.path.dirname(__file__), 'mapping.json')

# Load old mapping (png/jpg to slide number)
try:
    with open(OLD_MAPPING_PATH, 'r') as f:
        old_mapping = json.load(f)
except Exception:
    old_mapping = {}

def get_slide_number(svg_name, old_mapping):
    # Try to match by base name (ignore extension)
    base = os.path.splitext(svg_name)[0]
    for k, v in old_mapping.items():
        if os.path.splitext(k)[0].lower() == base.lower():
            return v
    # Not found, prompt user
    while True:
        try:
            slide = int(input(f"Enter slide number for {svg_name}: "))
            return slide
        except ValueError:
            print("Please enter a valid integer.")

def main():
    mapping = []
    for category in os.listdir(SVG_ROOT):
        cat_path = os.path.join(SVG_ROOT, category)
        if not os.path.isdir(cat_path):
            continue
        for svg_path in glob(os.path.join(cat_path, '*.svg')):
            filename = os.path.basename(svg_path)
            title = os.path.splitext(filename)[0].replace('_', ' ')
            slide_number = get_slide_number(filename, old_mapping)
            mapping.append({
                'filename': filename,
                'title': title,
                'slide_number': slide_number,
                'category': category
            })
    # Write new mapping
    with open(NEW_MAPPING_PATH, 'w') as f:
        json.dump(mapping, f, indent=2)
    print(f"✅ New mapping written to {NEW_MAPPING_PATH}")

if __name__ == '__main__':
    main() 