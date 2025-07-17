import os
import json
from glob import glob

# Paths
INFOGraphics_ROOT = os.path.dirname(__file__)
OLD_MAPPING_PATH = os.path.join(INFOGraphics_ROOT, 'mapping.json')
NEW_MAPPING_PATH = os.path.join(INFOGraphics_ROOT, 'mapping.json')

# Load old mapping to preserve existing slide numbers
try:
    with open(OLD_MAPPING_PATH, 'r') as f:
        old_mapping = json.load(f)
        # Convert to dict for easier lookup
        old_mapping_dict = {item['filename']: item['slide_number'] for item in old_mapping}
        print(f"Loaded {len(old_mapping_dict)} existing mappings")
except Exception as e:
    print(f"Error loading old mapping: {e}")
    old_mapping_dict = {}

def get_slide_number(png_name, old_mapping_dict):
    # Remove _bcore suffix for matching
    base_name = png_name.replace('_bcore.PNG', '.png')
    
    # Try to match by base name
    if base_name in old_mapping_dict:
        return old_mapping_dict[base_name]
    
    # Try to match by filename without extension
    base_without_ext = os.path.splitext(base_name)[0]
    for filename, slide_num in old_mapping_dict.items():
        if os.path.splitext(filename)[0] == base_without_ext:
            return slide_num
    
    # Not found, assign next available number
    max_slide = max(old_mapping_dict.values()) if old_mapping_dict else 0
    return max_slide + 1

def get_category_from_filename(filename):
    """Determine category based on filename patterns"""
    filename_lower = filename.lower()
    
    if 'timeline' in filename_lower or 'timelnie' in filename_lower:
        return 'Timeline'
    elif 'percentage' in filename_lower or 'disk' in filename_lower or 'pineapple' in filename_lower:
        return 'Percentage'
    elif 'process' in filename_lower or 'steps' in filename_lower or 'arrow' in filename_lower:
        return 'Process'
    elif 'network' in filename_lower or 'bubbles' in filename_lower:
        return 'Network'
    elif 'platform' in filename_lower or 'market' in filename_lower or 'product' in filename_lower:
        return 'Business'
    elif 'circle' in filename_lower or 'ring' in filename_lower:
        return 'Business'
    elif '3d' in filename_lower or 'box' in filename_lower or 'mountain' in filename_lower:
        return 'Business'
    else:
        return 'Business'  # Default category

def main():
    mapping = []
    # Find all PNG files in the current directory
    png_files = glob(os.path.join(INFOGraphics_ROOT, '*.PNG'))
    print(f"Found {len(png_files)} PNG files")
    
    # Track processed base filenames to avoid duplicates
    processed_bases = set()
    
    for png_path in png_files:
        filename = os.path.basename(png_path)
        
        # Only process _bcore.PNG files to avoid duplicates
        if not filename.endswith('_bcore.PNG'):
            continue
            
        # Create base filename (without _bcore suffix)
        base_filename = filename.replace('_bcore.PNG', '.png')
        
        # Skip if we've already processed this base filename
        if base_filename in processed_bases:
            continue
            
        processed_bases.add(base_filename)
        
        # Generate title from filename
        title = base_filename.replace('.png', '').replace('_', ' ').replace('-', ' ')
        
        # Get slide number
        slide_number = get_slide_number(filename, old_mapping_dict)
        
        # Determine category
        category = get_category_from_filename(filename)
        
        mapping.append({
            'filename': base_filename,  # Store base filename without theme suffix
            'title': title,
            'slide_number': slide_number,
            'category': category
        })
    
    # Sort by slide number
    mapping.sort(key=lambda x: x['slide_number'])
    
    # Write new mapping
    with open(NEW_MAPPING_PATH, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"✅ New mapping written to {NEW_MAPPING_PATH}")
    print(f"📊 Found {len(mapping)} infographics")
    
    # Print summary by category
    categories = {}
    for item in mapping:
        cat = item['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📋 Summary by category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

if __name__ == '__main__':
    main() 