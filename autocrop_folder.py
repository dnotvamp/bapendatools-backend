import sys
import os
import zipfile
import shutil
import cv2
import traceback
from pathlib import Path

# ===============================
# SAFE IMPORT YOLO
# ===============================
try:
    from ultralytics import YOLO
except Exception as e:
    print("❌ Failed to import ultralytics:", str(e), file=sys.stderr)
    YOLO = None


# ===============================
# UTIL FUNCTIONS
# ===============================
def log(msg):
    print(f"[AUTO-CROP] {msg}")


def error(msg):
    print(f"[ERROR] {msg}", file=sys.stderr)


def clean_folder(folder):
    if os.path.exists(folder):
        shutil.rmtree(folder)
    os.makedirs(folder, exist_ok=True)


def is_image(filename):
    return filename.lower().endswith(('.png', '.jpg', '.jpeg'))


# ===============================
# MAIN FUNCTION
# ===============================
def main():
    try:
        if len(sys.argv) < 2:
            error("Usage: python autocrop_folder.py <input_zip> [extract_dir] [output_dir] [model_path]")
            sys.exit(2)

        input_zip = sys.argv[1]
        extract_dir = sys.argv[2] if len(sys.argv) > 2 else "uploads/extracted/tmp"
        output_dir = sys.argv[3] if len(sys.argv) > 3 else "output/tmp"
        model_path = sys.argv[4] if len(sys.argv) > 4 else os.environ.get("MODEL_PATH", "best.pt")

        log(f"Input ZIP: {input_zip}")
        log(f"Extract dir: {extract_dir}")
        log(f"Output dir: {output_dir}")
        log(f"Model path: {model_path}")

        # ===============================
        # VALIDASI INPUT ZIP
        # ===============================
        if not os.path.exists(input_zip):
            error(f"Input zip not found: {input_zip}")
            sys.exit(3)

        # ===============================
        # PREPARE FOLDERS
        # ===============================
        clean_folder(extract_dir)
        clean_folder(output_dir)

        # ===============================
        # EXTRACT ZIP
        # ===============================
        log("Extracting ZIP...")
        with zipfile.ZipFile(input_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        # ===============================
        # VALIDASI YOLO
        # ===============================
        if YOLO is None:
            error("ultralytics not installed.")
            sys.exit(5)

        if not os.path.exists(model_path):
            error(f"Model not found at: {model_path}")
            sys.exit(4)

        log("Loading YOLO model...")
        model = YOLO(model_path)

        # ===============================
        # PROCESS IMAGES
        # ===============================
        processed_count = 0
        image_found = False

        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if not is_image(file):
                    continue

                image_found = True
                img_path = os.path.join(root, file)
                log(f"Processing: {img_path}")

                img = cv2.imread(img_path)
                if img is None:
                    error(f"Failed to read image: {img_path}")
                    continue

                try:
                    results = model(img)[0]
                except Exception as e:
                    error(f"YOLO inference failed: {str(e)}")
                    continue

                if results.boxes is None or len(results.boxes) == 0:
                    shutil.copy2(img_path, os.path.join(output_dir, file))
                    continue

                largest_box = None
                max_area = 0

                for box in results.boxes:
                    try:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        area = (x2 - x1) * (y2 - y1)
                        if area > max_area:
                            max_area = area
                            largest_box = (x1, y1, x2, y2)
                    except Exception:
                        continue

                if largest_box:
                    x1, y1, x2, y2 = largest_box
                    h, w = img.shape[:2]

                    # SAFE BOUNDARY CHECK
                    x1 = max(0, min(x1, w - 1))
                    x2 = max(0, min(x2, w))
                    y1 = max(0, min(y1, h - 1))
                    y2 = max(0, min(y2, h))

                    if x2 <= x1 or y2 <= y1:
                        shutil.copy2(img_path, os.path.join(output_dir, file))
                        continue

                    crop = img[y1:y2, x1:x2]
                    out_name = f"{Path(file).stem}_crop.png"
                    cv2.imwrite(os.path.join(output_dir, out_name), crop)
                    processed_count += 1

        if not image_found:
            error("No valid images found inside ZIP.")
            sys.exit(6)

        log(f"SUCCESS: {processed_count} images processed.")
        sys.exit(0)

    except Exception:
        error("FATAL ERROR:")
        traceback.print_exc()
        sys.exit(1)


# ===============================
# ENTRY POINT
# ===============================
if __name__ == "__main__":
    main()
