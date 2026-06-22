import os
import shutil

def main():
    base_dir = r"z:\MISS3 Dropbox\Server Data\printednest\Antigravity\architekt_prazdnoty"
    shots_dir = os.path.join(base_dir, "img", "screenshots")

    # Mapping of fallback targets to their sources
    fallbacks = {
        "02_14_custom.png": "02_13_custom.png",
        "02_16_custom.png": "02_15_custom.png",
        "02_17_custom.png": "02_15_custom.png",
        "02_19_custom.png": "02_18_custom.png",
        "02_20_custom.png": "02_18_custom.png",
        "02_21_custom.png": "02_23_custom.png",
        "02_22_custom.png": "02_23_custom.png",
        "02_24_custom.png": "02_27_custom.png",
        "02_25_custom.png": "02_27_custom.png",
        "02_26_custom.png": "02_27_custom.png",
    }

    for dst, src in fallbacks.items():
        src_path = os.path.join(shots_dir, src)
        dst_path = os.path.join(shots_dir, dst)
        if os.path.exists(src_path):
            shutil.copy(src_path, dst_path)
            print(f"Copied {src} -> {dst}")
        else:
            print(f"Source not found: {src}")

if __name__ == "__main__":
    main()
