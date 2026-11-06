#!/usr/bin/env python3
"""
Converts Supabase objects JSON export into the full Zumi / Universal Word Pack v2 format
with optimized base64 embedded images, clean Hindi/English names, speech-friendly
alternate names, and multi-format compatibility for offline import in Zumi.
"""

import json
import urllib.request
import io
import os
import sys
import base64
from datetime import datetime
from PIL import Image, ImageOps

# Alternate names map for natural child / caregiver speech recognition matching
ALTERNATE_NAMES_MAP = {
    "gym ball": ["ball", "exercise ball", "workout ball", "swiss ball", "yoga ball", "big ball"],
    "charger": ["phone charger", "mobile charger", "cable", "charging cable", "adapter"],
    "tv remote": ["remote", "remote control", "tv"],
    "bhujia": ["bhujiya", "bhujiaa", "namkeen", "sev"],
    "shorts": ["short", "nikkar", "boxers", "half pant"],
    "milk": ["doodh", "dudh", "milk glass", "warm milk"],
    "caliper": ["vernier caliper", "measuring caliper", "scale"],
    "spoon": ["chamach", "chammach", "tea spoon"],
    "massager gun": ["massager", "massage gun", "massage"],
    "upma": ["uppumavu", "rava upma"],
    "salt": ["namak", "table salt"],
    "bowl": ["katori", "pyala", "pyali", "dish"],
    "gilas": ["glass", "water glass", "steel glass", "tumbler"],
    "hot bag": ["hot water bag", "heating pad", "hot water bottle", "warm bag"],
    "jhula": ["swing", "jhoola", "cradle"],
    "pillow": ["takiya", "cushion"],
    "towel": ["gamchha", "hand towel", "bath towel"],
    "chaddi": ["underwear", "undies", "underpants"],
    "pajama": ["pyjama", "pyjamas", "pajamas", "lower"],
    "chocolate": ["choc", "choccy", "candy", "sweet"],
    "yes": ["haan", "ha", "sahi", "correct", "okay"],
    "giddi": ["gidi", "giddi toy"],
    "no": ["nahi", "nahin", "na", "galat", "wrong"],
    "baniyan": ["vest", "undershirt", "banyan", "ganji"],
    "ipad": ["tablet", "tab", "apple ipad"],
    "diaper": ["nappy", "pampers", "daipar"],
    "dustbin": ["trash can", "garbage can", "kachra dabba", "waste bin"],
    "curtain": ["parda", "curtains", "drapes"],
    "chasma": ["chashma", "glasses", "spectacles", "specs"],
    "stand mobile": ["mobile stand", "phone stand", "stand", "holder"],
    "naal": ["nal", "ghode ki naal", "horseshoe"],
    "idli": ["idly", "rava idli", "steamed cake"],
    "napkin": ["tissue", "serviette", "rumal", "paper napkin"],
    "dawai mummy ki": ["dawai", "mummy ki dawai", "medicine", "tablets", "pills"],
    "powder": ["talcum powder", "face powder", "baby powder"],
    "rajai": ["quilt", "blanket", "kambal"],
    "pant": ["pants", "trousers", "jeans"],
    "mobile mummy ka": ["mummy ka mobile", "mummy ka phone", "phone", "mobile"],
    "socks": ["sock", "moze", "jurab"],
    "speaker": ["bluetooth speaker", "soundbox", "audio speaker"],
    "bottle": ["water bottle", "paani ki bottle", "flask"],
    "fridge": ["refrigerator", "freezer"],
    "headphone": ["headphones", "earphones", "headset"],
}

def parse_iso_to_epoch_ms(iso_str):
    if not iso_str:
        return int(datetime.now().timestamp() * 1000)
    try:
        # e.g. "2025-12-01T10:30:48.974505+00:00"
        clean = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        return int(dt.timestamp() * 1000)
    except Exception:
        return int(datetime.now().timestamp() * 1000)

def title_case_name(name):
    clean = " ".join(name.strip().split())
    # Capitalize each word
    return " ".join([word.capitalize() for word in clean.split(" ")])

def download_and_optimize_image(url, max_dim=800, quality=82):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ZumiImport/1.0)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw_bytes = resp.read()

    img = Image.open(io.BytesIO(raw_bytes))
    img = ImageOps.exif_transpose(img)

    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

    # Scale down preserving aspect ratio
    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    if has_alpha:
        img.save(buf, format="PNG", optimize=True)
        mime = "image/png"
    else:
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        mime = "image/jpeg"

    comp_bytes = buf.getvalue()
    b64 = base64.b64encode(comp_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"

    return data_url, mime, len(raw_bytes), len(comp_bytes), img.size

def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/zumi/input_objects.json"
    output_files = [
        "/home/ubuntu/zumi/zumi-import-pack.json",
        "/home/ubuntu/zumi/public/zumi-import-pack.json",
    ]

    print(f"Reading input JSON from: {input_file}")
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_objects = data.get("objects", [])
    print(f"Found {len(raw_objects)} objects to process.\n")

    universal_words = []
    zumi_objects = []
    flashcards = []
    media_items = []
    total_raw_size = 0
    total_comp_size = 0

    category_id = "objects"
    category_name = "Everyday Objects"

    for i, raw in enumerate(raw_objects):
        obj_id = raw.get("id") or f"obj_{i+1}"
        raw_name = raw.get("name_english", "").strip()
        name_lower = raw_name.lower()
        display_name = title_case_name(raw_name)
        hindi_name = raw.get("name_hindi")
        if hindi_name:
            hindi_name = hindi_name.strip()
        else:
            hindi_name = ""

        created_ms = parse_iso_to_epoch_ms(raw.get("created_at"))
        updated_ms = parse_iso_to_epoch_ms(raw.get("updated_at"))

        alternate_names = ALTERNATE_NAMES_MAP.get(name_lower, [])

        image_url = raw.get("image_url")
        print(f"[{i+1}/{len(raw_objects)}] Processing '{display_name}' ({image_url.split('/')[-1]})...")

        data_url, mime, raw_size, comp_size, dims = download_and_optimize_image(image_url)
        total_raw_size += raw_size
        total_comp_size += comp_size

        image_id = f"img-{obj_id}"

        # 1. Universal Word Item (clean, single imageDataUrl)
        u_word = {
            "id": obj_id,
            "word": name_lower,
            "text": raw_name.upper(),
            "englishWord": display_name,
            "hindiWord": hindi_name or "",
            "category": category_name,
            "categoryId": category_id,
            "alternateNames": alternate_names,
            "imageDataUrl": data_url,
            "imageId": image_id,
            "createdAt": created_ms,
            "orderIndex": i,
            "enabled": True,
        }
        universal_words.append(u_word)

        # 2. Native Zumi ObjectCard representation
        z_obj = {
            "id": obj_id,
            "name": display_name,
            "normalizedName": name_lower,
            "alternateNames": alternate_names,
            "secondLanguageName": hindi_name or None,
            "imageDataUrl": data_url,
            "mimeType": mime,
            "createdAt": created_ms,
            "updatedAt": updated_ms,
        }
        zumi_objects.append(z_obj)

        # 3. CogniCard flashcard representation
        flashcard = {
            "id": obj_id,
            "categoryId": category_id,
            "englishWord": display_name,
            "hindiWord": hindi_name or display_name,
            "imagePath": "",
            "imageBase64": data_url,
            "englishAudioBase64": "",
            "hindiAudioBase64": "",
        }
        flashcards.append(flashcard)

    categories = [
        {
            "id": category_id,
            "name": category_name,
            "icon": "📦",
            "color": "#f43f5e",
            "enabled": True,
        }
    ]

    universal_pack = {
        "version": 2,
        "format": "universal-word-pack",
        "appName": "Zumi Voice Assistant",
        "exportedAt": datetime.now().astimezone().isoformat(),
        "totalWords": len(universal_words),
        "totalCategories": len(categories),
        "categories": categories,
        "words": universal_words,
        "objects": zumi_objects,
        "flashcards": flashcards,
        "settings": {
            "showSecondLanguage": True,
            "autoSpeak": True,
            "imageFit": "contain",
        },
    }

    compact_pack = {
        "appName": "Zumi Voice Assistant",
        "exportedAt": datetime.now().astimezone().isoformat(),
        "version": 2,
        "totalObjects": len(zumi_objects),
        "objects": zumi_objects,
    }

    print("\n--- Summary ---")
    print(f"Total objects converted: {len(universal_words)}")
    print(f"Total original images size: {total_raw_size / (1024*1024):.2f} MB")
    print(f"Total optimized images size: {total_comp_size / (1024*1024):.2f} MB")

    for out_path in output_files:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(universal_pack, f, indent=2, ensure_ascii=False)
        file_size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"Saved Universal Word Pack: {out_path} ({file_size_mb:.2f} MB)")

    compact_paths = [
        "/home/ubuntu/zumi/zumi-objects-compact.json",
        "/home/ubuntu/zumi/public/zumi-objects-compact.json",
    ]
    for c_path in compact_paths:
        with open(c_path, "w", encoding="utf-8") as f:
            json.dump(compact_pack, f, indent=2, ensure_ascii=False)
        c_size_mb = os.path.getsize(c_path) / (1024 * 1024)
        print(f"Saved Compact Zumi Pack: {c_path} ({c_size_mb:.2f} MB)")

    print("\nConversion successfully completed!")

if __name__ == "__main__":
    main()
