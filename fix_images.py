import pandas as pd
import kagglehub
import os
import requests
import time

PARTIAL_FILE = "anime_fixed_images_partial.csv"
FINAL_FILE = "anime_fixed_images.csv"


# -----------------------------
# LOAD DATA (RESUME OR FRESH)
# -----------------------------
if os.path.exists(PARTIAL_FILE):
    print("🔄 Resuming from partial file...")
    df = pd.read_csv(PARTIAL_FILE)

    # load existing progress
    images = df["image_url"].tolist()

else:
    print("🆕 Starting fresh...")
    path = kagglehub.dataset_download("azathoth42/myanimelist")
    df = pd.read_csv(os.path.join(path, "anime_cleaned.csv"))

    images = []


# -----------------------------
# IMAGE FETCH FUNCTION (RETRY)
# -----------------------------
def get_image(title):
    url = f"https://api.jikan.moe/v4/anime?q={title}&limit=1"

    for attempt in range(3):
        try:
            res = requests.get(url, timeout=10)
            data = res.json()

            return data["data"][0]["images"]["jpg"]["large_image_url"]

        except Exception:
            print(f"Retry {attempt+1} for {title}")
            time.sleep(2)  # small wait before retry

    print("FAILED:", title)
    return "https://via.placeholder.com/300x400?text=No+Image"


# -----------------------------
# RESUME POINT
# -----------------------------
start_index = len(images)

print(f"▶️ Starting from index: {start_index}")


# -----------------------------
# MAIN LOOP
# -----------------------------
for i in range(start_index, len(df)):
    title = df.loc[i, "title"]

    print(f"{i+1}: {title}")

    img = get_image(title)
    images.append(img)

    # 🔥 SAVE PROGRESS EVERY 100
    if (i+1) % 100 == 0:
        df["image_url"] = images + [None] * (len(df) - len(images))
        df.to_csv(PARTIAL_FILE, index=False)
        print(f"💾 Saved progress at {i+1}")

    time.sleep(1)  # avoid rate limit


# -----------------------------
# FINAL SAVE
# -----------------------------
df["image_url"] = images
df.to_csv(FINAL_FILE, index=False)

print("✅ DATASET WITH FIXED IMAGES CREATED")