import sys
import os
import zipfile
import shutil
import cv2

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

def clean_folder(folder):
    if os.path.exists(folder):
        shutil.rmtree(folder)
    os.makedirs(folder, exist_ok=True)

def main():
    # Argumen:
    # argv[1] = input_zip (required)
    # argv[2] = extract_dir (optional)
    # argv[3] = output_dir (optional)
    # argv[4] = model_path (optional) or env MODEL_PATH
    if len(sys.argv) < 2:
        print("Usage: python autocrop_folder.py <input_zip> [extract_dir] [output_dir] [model_path]", file=sys.stderr)
        sys.exit(2)

    input_zip = sys.argv[1]
    extract_dir = sys.argv[2] if len(sys.argv) > 2 else 'uploads/extracted/tmp'
    output_dir = sys.argv[3] if len(sys.argv) > 3 else 'output/tmp'
    model_path = sys.argv[4] if len(sys.argv) > 4 else os.environ.get('MODEL_PATH', 'best.pt')

    try:
        # Validasi input zip
        if not os.path.exists(input_zip):
            print(f"Input zip not found: {input_zip}", file=sys.stderr)
            sys.exit(3)

        # Bersihkan target folder
        clean_folder(extract_dir)
        clean_folder(output_dir)

        # Extract ZIP
        with zipfile.ZipFile(input_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        # Validasi model
        if YOLO is None:
            print("ultralytics.YOLO not available; ensure ultralytics is installed", file=sys.stderr)
            sys.exit(5)

        if not os.path.exists(model_path):
            print(f"Model not found: {model_path}", file=sys.stderr)
            sys.exit(4)

        model = YOLO(model_path)

        # Proses semua gambar secara rekursif
        for root, dirs, files in os.walk(extract_dir):
            for img_name in files:
                if not img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                    continue
                img_path = os.path.join(root, img_name)
                img = cv2.imread(img_path)
                if img is None:
                    print(f"Failed to read {img_path}", file=sys.stderr)
                    continue

                results = model(img)[0]

                if len(results.boxes) == 0:
                    # Tidak ada deteksi → salin gambar asli
                    shutil.copy2(img_path, os.path.join(output_dir, img_name))
                    continue

                # Cari bounding box terbesar
                largest_box = None
                max_area = 0
                for box in results.boxes:
                    try:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                    except Exception:
                        continue
                    area = (x2 - x1) * (y2 - y1)
                    if area > max_area:
                        max_area = area
                        largest_box = (x1, y1, x2, y2)

                if largest_box:
                    x1, y1, x2, y2 = largest_box
                    h, w = img.shape[:2]
                    x1 = max(0, min(x1, w-1))
                    x2 = max(0, min(x2, w))
                    y1 = max(0, min(y1, h-1))
                    y2 = max(0, min(y2, h))
                    if x2 <= x1 or y2 <= y1:
                        shutil.copy2(img_path, os.path.join(output_dir, img_name))
                        continue
                    crop = img[y1:y2, x1:x2]
                    out_name = f"{os.path.splitext(img_name)[0]}_crop.png"
                    cv2.imwrite(os.path.join(output_dir, out_name), crop)

        print("✅ Selesai: semua crop tersimpan di folder", output_dir)
        sys.exit(0)
    except Exception as e:
        print("Exception in autocrop_folder:", str(e), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()