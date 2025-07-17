import csv
import json
import os

def csv_to_mapping_json(csv_file, output_file, theme_filter=None):
    """
    Convert CSV to mapping.json format
    
    Args:
        csv_file: Path to the CSV file
        output_file: Path to output JSON file
        theme_filter: Optional theme filter ('bcore', 'light', or None for all)
    """
    mapping = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Apply theme filter if specified
            if theme_filter and row['theme'] != theme_filter:
                continue
                
            # Create mapping entry
            entry = {
                'filename': row['filename'],
                'title': row['title'],
                'slide_number': int(row['slide_number']),
                'category': row['category']
            }
            
            mapping.append(entry)
    
    # Sort by slide number
    mapping.sort(key=lambda x: x['slide_number'])
    
    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"✅ Converted CSV to {output_file}")
    print(f"📊 Found {len(mapping)} infographics")
    
    # Print summary by category
    categories = {}
    for item in mapping:
        cat = item['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📋 Summary by category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")
    
    if theme_filter:
        print(f"\n🎨 Theme: {theme_filter}")
    else:
        print(f"\n🎨 Themes: bcore and light")

def main():
    csv_file = 'infographics_mapping.csv'
    output_file = 'mapping.json'
    
    # Check if CSV file exists
    if not os.path.exists(csv_file):
        print(f"❌ Error: {csv_file} not found!")
        return
    
    print("🔄 Converting CSV to mapping.json...")
    print("Using option 3: Generate mapping for both themes")
    
    # Use option 3 by default (both themes)
    csv_to_mapping_json(csv_file, output_file, None)

if __name__ == '__main__':
    main() 