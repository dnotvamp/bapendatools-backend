import os
import shutil
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ========================
# 1. Terima argument dari NestJS
# ========================
if len(sys.argv) < 4:
    print(f"Usage: {sys.argv[0]} <input_zip> <extract_dir> <output_dir>", file=sys.stderr)
    sys.exit(1)

input_zip = sys.argv[1]       # Path ke ZIP yang di-upload
extract_dir = sys.argv[2]     # Folder untuk extract ZIP
output_dir = sys.argv[3]      # Output folder
folder_hasil = os.path.join(output_dir, "belumcrop")

print(f"[INFO] Input ZIP: {input_zip}")
print(f"[INFO] Extract Dir: {extract_dir}")
print(f"[INFO] Output Dir: {output_dir}")
print(f"[INFO] Result Folder: {folder_hasil}")

try:
    # ========================
    # 2. Validasi input
    # ========================
    if not os.path.exists(input_zip):
        print(f"❌ File ZIP tidak ditemukan: {input_zip}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(input_zip):
        print(f"❌ {input_zip} bukan file", file=sys.stderr)
        sys.exit(1)

    # ========================
    # 3. Extract ZIP
    # ========================
    print(f"[INFO] Extracting ZIP...")
    import zipfile
    try:
        with zipfile.ZipFile(input_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print(f"[SUCCESS] ZIP extracted to {extract_dir}")
    except zipfile.BadZipFile as e:
        print(f"❌ File ZIP tidak valid: {e}", file=sys.stderr)
        sys.exit(1)

    # ========================
    # 4. Setup output folder
    # ========================
    os.makedirs(folder_hasil, exist_ok=True)
    print(f"✅ Output folder created: {folder_hasil}")

    if not os.path.exists(extract_dir):
        print(f"❌ Folder '{extract_dir}' tidak ditemukan.", file=sys.stderr)
        sys.exit(1)

    # ========================
    # 5. Define helper functions
    # ========================
    ekstensi_valid = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

    bulan = {
        "januari", "februari", "maret", "april", "mei", "juni",
        "juli", "agustus", "september", "oktober", "november", "desember"
    }

    def bersihkan_nama(nama):
        nama = nama.lower().replace("_", " ").replace("-", " ")
        kata = nama.split()

        hasil = []
        for k in kata:
            if re.match(r"^\d+$", k) or k in bulan:
                break
            hasil.append(k)

        if not hasil:
            hasil = kata[:2] if kata else ["Untitled"]

        nama_bersih = " ".join(hasil)
        nama_bersih = re.sub(r"\s+", " ", nama_bersih).strip()
        return nama_bersih.title()

    # ========================
    # 6. Find and organize images
    # ========================
    print(f"[INFO] Scanning for images...")

    gambar_list = []
    for root, dirs, files in os.walk(extract_dir):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ekstensi_valid:
                gambar_list.append(os.path.join(root, f))
                print(f"[INFO] Found image: {f}")

    gambar_list.sort()
    print(f"[INFO] Total images found: {len(gambar_list)}")

    if not gambar_list:
        print("⚠️ Tidak ditemukan file gambar.", file=sys.stderr)
        # Jangan exit(1), karena mungkin ZIP kosong tapi proses valid
        sys.exit(0)

    # ========================
    # 7. Copy and organize images
    # ========================
    print(f"[INFO] Organizing images...")

    count = 0
    for path_file in gambar_list:
        try:
            nama_file = os.path.basename(path_file)
            nama_tanpa_ext = os.path.splitext(nama_file)[0]
            nama_folder = bersihkan_nama(nama_tanpa_ext)

            folder_tujuan = os.path.join(folder_hasil, nama_folder)
            os.makedirs(folder_tujuan, exist_ok=True)

            destinasi = os.path.join(folder_tujuan, nama_file)

            # Handle duplicate filenames
            if os.path.exists(destinasi):
                base, ext = os.path.splitext(nama_file)
                i = 1
                while True:
                    newname = f"{base} ({i}){ext}"
                    destinasi = os.path.join(folder_tujuan, newname)
                    if not os.path.exists(destinasi):
                        break
                    i += 1
                print(f"[INFO] File exists, renaming to: {newname}")

            shutil.copy2(path_file, destinasi)
            count += 1
            print(f"[SUCCESS] Copied: {nama_file} -> {nama_folder}/{newname if os.path.exists(destinasi) else nama_file}")

        except Exception as e:
            print(f"❌ Gagal memproses {path_file}: {e}", file=sys.stderr)

    # ========================
    # 8. Verify output
    # ========================
    print(f"[INFO] Verifying output...")

    output_files = []
    for root, dirs, files in os.walk(folder_hasil):
        for f in files:
            output_files.append(os.path.join(root, f))

    print(f"[INFO] Output contains {len(output_files)} files:")
    for f in output_files:
        print(f"  - {f}")

    if len(output_files) == 0:
        print(f"⚠️ Output folder is empty!", file=sys.stderr)
        sys.exit(0)  # Bukan error, mungkin ZIP kosong

    print(f"\n✅ Selesai. {count} gambar disalin ke '{folder_hasil}'.")
    sys.exit(0)

except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)