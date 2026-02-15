import sys
import os
import zipfile
import shutil
import cv2
import traceback

try:
    from ultralytics import YOLO
except Exception as e:
    print("Failed to import ultralytics:", str(e), file=sys.stderr)
    YOLO = None


def clean_folder(folder):
    if os.path.exists(folder):
        shutil.rmtree(folder)
    os.makedirs(folder, exist_ok=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python autocrop_folder.py <input_zip> [extract_dir] [output_dir] [model_path]", file=sys.stderr)
        sys.exit(2)

    input_zip = sys.argv[1]
    extract_dir = sys.argv[2] if len(sys.argv) > 2 else 'uploads/extracted/tmp'
    output_dir = sys.argv[3] if len(sys.argv) > 3 else 'output/tmp'
    model_path = sys.argv[4] if len(sys.argv) > 4 else os.environ.get('MODEL_PATH', 'best.pt')

    try:
        print("Input ZIP:", input_zip)
        print("Extract dir:", extract_dir)
        print("Output dir:", output_dir)
        print("Model path:", model_path)

        if not os.path.exists(input_zip):
            print(f"Input zip not found: {input_zip}", file=sys.stderr)
            sys.exit(3)

        clean_folder(extract_dir)
        clean_folder(output_dir)

        with zipfile.ZipFile(input_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        if YOLO is None:
            print("ultralytics not installed", file=sys.stderr)
            sys.exit(5)

        if not os.path.exists(model_path):
            print(f"Model not found: {model_path}", file=sys.stderr)
            sys.exit(4)

        model = YOLO(model_path)

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

                if not results.boxes:
                    shutil.copy2(img_path, os.path.join(output_dir, img_name))
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
                    crop = img[y1:y2, x1:x2]
                    out_name = f"{os.path.splitext(img_name)[0]}_crop.png"
                    cv2.imwrite(os.path.join(output_dir, out_name), crop)

        print("SUCCESS: Cropping completed")
        sys.exit(0)

    except Exception as e:
        print("FATAL ERROR:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
