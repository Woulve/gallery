from fractions import Fraction
import os
import json
import subprocess
from datetime import datetime
from pathlib import Path
from PIL import Image, ExifTags

data_file = "./src/app/models/image-data.ts"
image_folder = "./public/images/minified"

# Read existing images
existing_images = []
if os.path.exists(data_file):
    with open(data_file, "r", encoding="utf-8") as f:
        content = f.read()
    try:
        existing_images = json.loads(
            content.split("ImageData: Image[] = ")[-1]
            .rstrip(";")
            .replace("new Date", "")
        )
    except Exception:
        pass


def extract_exif(img):
    """Extracts EXIF metadata from an image."""
    exif_data = {}
    try:
        exif_info = img._getexif()
        if exif_info:
            exif_data = {
                ExifTags.TAGS.get(tag, tag): value for tag, value in exif_info.items()
            }
    except Exception:
        pass
    return {
        "cameraMaker": exif_data.get("Make"),
        "cameraModel": exif_data.get("Model"),
        "fStop": exif_data.get("FNumber"),
        "exposureTime": format_exposure_time(exif_data.get("ExposureTime", 0)),
        "iso": exif_data.get("ISOSpeedRatings"),
        "focalLength": int(exif_data.get("FocalLength")),
    }


def try_exiftool(image_path):
    """Uses exiftool (if available) to extract metadata."""
    try:
        result = subprocess.run(
            ["exiftool", "-j", image_path], capture_output=True, text=True
        )
        if result.returncode == 0:
            exif_json = json.loads(result.stdout)
            if exif_json:
                return {
                    "cameraMaker": exif_json[0].get("Make"),
                    "cameraModel": exif_json[0].get("Model"),
                    "fStop": exif_json[0].get("FNumber"),
                    "exposureTime": exif_json[0].get("ExposureTime"),
                    "iso": exif_json[0].get("ISO"),
                    "focalLength": exif_json[0].get("FocalLength"),
                }
    except Exception:
        pass
    return None


def get_image_data(image_path):
    """Extracts metadata from an image file."""
    timestamp = datetime.utcfromtimestamp(os.stat(image_path).st_mtime).isoformat()
    with Image.open(image_path) as img:
        width, height = img.size
        exif_data = try_exiftool(image_path) or extract_exif(img)
    return {
        "url": os.path.relpath(image_path, "./public").replace("\\", "/"),
        "timestamp": f"new Date('{timestamp}')",
        "width": width,
        "height": height,
        **{k: v for k, v in exif_data.items() if v is not None},
    }


def format_exposure_time(seconds):
    if seconds <= 0:
        return "N/A"
    fraction = Fraction(seconds).limit_denominator(10000)
    return f"{fraction.numerator}/{fraction.denominator}"


# Collect image metadata
images = [
    get_image_data(img)
    for img in Path(image_folder).glob("*.*")
    if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
]

# Generate TypeScript output
image_data_ts = (
    "import { Image } from './image.model';\n\nexport const ImageData: Image[] = [\n"
)
image_data_ts += ",\n".join(
    "  { "
    + ", ".join(
        (
            f"{k}: '{v}'"
            if isinstance(v, str) and not v.startswith("new Date")
            else f"{k}: {v}"
        )
        for k, v in img.items()
    )
    + " }"
    for img in images
)
image_data_ts += "\n];\n"

# Write to file
with open(data_file, "w", encoding="utf-8") as f:
    f.write(image_data_ts)

print(f"Updated {data_file} with {len(images)} images.")
