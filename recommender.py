# %%
import pandas as pd
import os

USE_KAGGLE = False

if USE_KAGGLE:
    import kagglehub
    path = kagglehub.dataset_download("azathoth42/myanimelist")
    print("Dataset path:", path)
    print(os.listdir(path))

# Always load final processed dataset
df = pd.read_csv("anime_fixed_images.csv")

# Inspect the columns and the first few rows of the dataframe
print(df.columns)
df.head()

# %%
print(df.info())
print(df.describe())
print(df.isnull().sum())

# %%
# --- GENRE CLEANING ---
df["genre"] = df["genre"].fillna("").str.lower()

# convert to list
df["genre_list"] = df["genre"].apply(
    lambda x: [g.strip() for g in x.split(",")] if x else []
)

# --- SCORE CLEANING ---
df["score"] = pd.to_numeric(df["score"], errors="coerce")

# remove garbage scores
df = df[(df["score"] >= 0) & (df["score"] <= 10)]

# --- EPISODES CLEANING ---
df["episodes"] = pd.to_numeric(df["episodes"], errors="coerce")

# fill missing episodes (important!)
df["episodes"] = df["episodes"].fillna(df["episodes"].median())

# optional: cap extreme values
df["episodes"] = df["episodes"].clip(upper=500)

# --- TITLE CLEANING ---
df["title"] = df["title"].fillna("").str.strip()

# remove empty titles
df = df[df["title"] != ""]

# --- REMOVE DUPLICATES ---
df = df.drop_duplicates(subset=["title"])

# --- NORMALIZATION (VERY IMPORTANT) ---
from sklearn.preprocessing import MinMaxScaler

scaler = MinMaxScaler()
df[["score_norm", "episodes_norm"]] = scaler.fit_transform(
    df[["score", "episodes"]]
)


# %%
def recommend_anime(
    df,
    genres=None,
    min_score=None,
    max_episodes=None,
    page=1,
    per_page=20,
    match_all=False,
    search=""
):
    filtered = df.copy()

    # -----------------------------
    # 1. EXCLUDE UNWANTED GENRES
    # -----------------------------
    excluded = ["hentai"]
    filtered = filtered[
        ~filtered["genre_list"].apply(lambda x: any(g in x for g in excluded))
    ]

    # -----------------------------
    # 2. GENRE FILTERING
    # -----------------------------
    if genres:
        genres = [g.lower() for g in genres]

        if match_all:
            filtered = filtered[
                filtered["genre_list"].apply(lambda x: all(g in x for g in genres))
            ]
        else:
            filtered = filtered[
                filtered["genre_list"].apply(lambda x: any(g in x for g in genres))
            ]

    # -----------------------------
    # 3. SCORE FILTER
    # -----------------------------
    if min_score is not None:
        filtered = filtered[filtered["score"] >= min_score]

    # -----------------------------
    # 4. EPISODES FILTER
    # -----------------------------
    if max_episodes is not None:
        filtered = filtered[filtered["episodes"] <= max_episodes]

    # -----------------------------
    # 5. SEARCH SCORING
    # -----------------------------
    search = (search or "").strip().lower()

    if search:
        def search_score(row):
            score = 0

            title = str(row.get("title", "")).lower()
            title_english = str(row.get("title_english", "")).lower()
            title_japanese = str(row.get("title_japanese", "")).lower()
            title_synonyms = str(row.get("title_synonyms", "")).lower()
            genre = str(row.get("genre", "")).lower()
            studio = str(row.get("studio", "")).lower()

            if search in title:
                score += 5
            if search in title_english:
                score += 5
            if search in title_japanese:
                score += 5

            if search in title_synonyms:
                score += 3

            if search in genre:
                score += 2

            if search in studio:
                score += 1

            return score

        filtered["search_score"] = filtered.apply(search_score, axis=1)
        filtered = filtered[filtered["search_score"] > 0]
    else:
        filtered["search_score"] = 0

    # -----------------------------
    # 6. GENRE MATCH STRENGTH
    # -----------------------------
    def genre_match_score(selected, anime_genres):
        if not selected:
            return 1
        return len(set(selected) & set(anime_genres)) / len(selected)

    filtered["genre_score"] = filtered["genre_list"].apply(
        lambda x: genre_match_score(genres, x)
    )

    # -----------------------------
    # 7. FINAL RANKING SCORE
    # -----------------------------
    filtered["final_score"] = (
        0.4 * filtered["score_norm"] +
        0.2 * (1 - filtered["episodes_norm"]) +
        0.2 * filtered["genre_score"] +
        0.2 * filtered["search_score"]
    )

    filtered = filtered.sort_values(by="final_score", ascending=False)

    # -----------------------------
    # 8. PAGINATION
    # -----------------------------
    start = (page - 1) * per_page
    end = start + per_page

    paginated = filtered.iloc[start:end]

    # -----------------------------
    # 9. RETURN
    # -----------------------------
    return {
        "results": paginated[[
            "anime_id",
            "title",
            "title_english",
            "title_japanese",
            "title_synonyms",
            "image_url",
            "genre",
            "score",
            "rank",
            "popularity",
            "members",
            "favorites",
            "studio",
            "episodes",
            "status",
            "duration_min",
            "aired_from_year",
            "source",
            "rating",
            "background"
        ]].to_dict(orient="records"),

        "total": len(filtered)
    }
# %%
# -----------------------------
# 1. GENRE → NUMERIC (one-hot encoding)
# -----------------------------
from sklearn.preprocessing import MultiLabelBinarizer

mlb = MultiLabelBinarizer()
genre_matrix = mlb.fit_transform(df["genre_list"])

genre_df = pd.DataFrame(genre_matrix, columns=mlb.classes_)

# -----------------------------
# 2. COMBINE FEATURES
# -----------------------------
# Combine genre + normalized score + normalized episodes
features = pd.concat([
    genre_df,
    df[["score_norm", "episodes_norm"]]
], axis=1)

# %%
# -----------------------------
# 3. SIMILARITY MATRIX
# -----------------------------
from sklearn.metrics.pairwise import cosine_similarity

similarity_matrix = cosine_similarity(features)

# %%
def recommend_for_user(df, similarity_matrix, liked_titles, top_n=20):

    # =====================================================
    # 0. HANDLE USER INPUT (LIKED ANIME)
    # =====================================================
    # Supports:
    # - ["Naruto", "AOT"]
    # - [{"anime_title": "...", "liked_at": "..."}]
    # We normalize both into a clean list of recent titles

    if liked_titles and isinstance(liked_titles[0], dict):

        liked_df = pd.DataFrame(liked_titles)

        # Convert timestamps safely
        liked_df["liked_at"] = pd.to_datetime(liked_df["liked_at"], errors="coerce")

        # Remove broken timestamps
        liked_df = liked_df.dropna(subset=["liked_at"])

        # Sort by time → keep most recent preferences
        liked_df = liked_df.sort_values(by="liked_at")

        # Keep last 5 liked anime (recency matters)
        liked_titles = liked_df["anime_title"].tolist()[-5:]

    else:
        # Simple list → still limit to last 5
        liked_titles = liked_titles[-5:] if liked_titles else []

    # =====================================================
    # 1. MATCH LIKED ANIME TO DATASET
    # =====================================================
    # We try to find rows that match user input titles

    def match_liked(df, liked_titles):
        liked_titles_lower = [l.lower() for l in liked_titles]

        def match_row(row):
            title = str(row["title"]).lower()
            synonyms = str(row.get("title_synonyms", "")).lower()

            # Match either title or synonyms
            return any(l in title or l in synonyms for l in liked_titles_lower)

        return df[df.apply(match_row, axis=1)].index.tolist()

    liked_indices = match_liked(df, liked_titles)

    # =====================================================
    # 2. FALLBACK (NO USER DATA)
    # =====================================================
    # If user hasn't liked anything → show curated genre mix

    if not liked_indices:

        fallback = df.copy()

        target_genres = [
            "romance", "adventure", "comedy",
            "school", "slice of life", "isekai", "action"
        ]

        # Clean bad entries
        fallback = fallback[
            (~fallback["genre"].str.contains("hentai", case=False, na=False)) &
            fallback["image_url"].notna() &
            (fallback["image_url"] != "") &
            fallback["score"].notna()
        ]

        # Keep anime matching ANY target genre
        fallback = fallback[
            fallback["genre_list"].apply(
                lambda x: any(g in x for g in target_genres)
            )
        ]

        # Ensure decent quality
        fallback = fallback[fallback["score"] >= 6.5]

        # Shuffle → avoid static results
        fallback = fallback.sample(frac=1)

        return fallback[[
    "anime_id",
    "title",
    "title_english",
    "title_japanese",
    "title_synonyms",
    "image_url",
    "genre",
    "score",
    "rank",
    "popularity",
    "members",
    "favorites",
    "studio",
    "episodes",
    "status",
    "duration_min",
    "aired_from_year",
    "source",
    "rating",
    "background"
        ]].head(top_n)

    # =====================================================
    # 3. COMPUTE SIMILARITY
    # =====================================================
    # Use cosine similarity to find anime similar to liked ones

    sim_scores = similarity_matrix[liked_indices].mean(axis=0)

    filtered = df.copy()
    filtered["user_score"] = sim_scores

    # =====================================================
    # 4. CLEAN RESULTS
    # =====================================================
    # Remove junk data to avoid bad recommendations

    filtered = filtered[
        (~filtered["genre"].str.contains("hentai", case=False, na=False)) &
        filtered["image_url"].notna() &
        (filtered["image_url"] != "") &
        filtered["score"].notna()
    ]

    # =====================================================
    # 5. REMOVE ALREADY LIKED ANIME
    # =====================================================
    # Don't recommend what user already watched

    filtered = filtered[
        ~filtered["title"].str.lower().apply(
            lambda x: any(l.lower() in x for l in liked_titles)
        )
    ]

    # =====================================================
    # 6. HYBRID RANKING (VERY IMPORTANT)
    # =====================================================
    # Combine:
    # - similarity (personal relevance)
    # - score_norm (overall quality)
    #
    # This prevents:
    # - weird niche results ❌
    # - low-quality anime ❌

    filtered["final_score"] = (
        0.7 * filtered["user_score"] +
        0.3 * filtered["score_norm"]
    )

    # Sort by best combined result
    filtered = filtered.sort_values(by="final_score", ascending=False)

    # =====================================================
    # 7. FINAL OUTPUT
    # =====================================================
    return filtered[[
    "anime_id",
    "title",
    "title_english",
    "title_japanese",
    "title_synonyms",
    "image_url",
    "genre",
    "score",
    "rank",
    "popularity",
    "members",
    "favorites",
    "studio",
    "episodes",
    "status",
    "duration_min",
    "aired_from_year",
    "source",
    "rating",
    "background"
    ]].head(top_n)

def get_featured_anime(df, top_n=20):
    featured = df.copy()

    # make sure numeric columns are numeric
    featured["score"] = pd.to_numeric(featured["score"], errors="coerce")
    featured["popularity"] = pd.to_numeric(featured["popularity"], errors="coerce")

    # clean and filter
    featured = featured[
        (~featured["genre"].str.contains("hentai", case=False, na=False)) &
        featured["image_url"].notna() &
        (featured["image_url"] != "") &
        featured["score"].notna() &
        featured["popularity"].notna()
    ]

    # keep decent quality but exclude elite (handled elsewhere)
    featured = featured[
        (featured["score"] >= 7.0) &
        (featured["score"] < 9.0)
    ]

    # sort by popularity (lower = more popular)
    featured = featured.sort_values(by="popularity", ascending=True)

    # dynamic pool (scales with dataset)
    pool_size = min(int(len(featured) * 0.05), 300)

    # split into tiers (heavy bias toward top)
    top_tier = featured.head(int(pool_size * 0.6))          # most popular
    mid_tier = featured.iloc[int(pool_size * 0.6):pool_size]  # slightly less popular

    # sample more from top tier
    sampled = pd.concat([
        top_tier.sample(n=min(len(top_tier), int(top_n * 0.7))),
        mid_tier.sample(n=min(len(mid_tier), int(top_n * 0.3)))
    ])

    # shuffle final results
    featured_pool = sampled.sample(frac=1)

    return featured_pool[[
    "anime_id",
    "title",
    "title_english",
    "title_japanese",
    "title_synonyms",
    "image_url",
    "genre",
    "score",
    "rank",
    "popularity",
    "members",
    "favorites",
    "studio",
    "episodes",
    "status",
    "duration_min",
    "aired_from_year",
    "source",
    "rating",
    "background"
    ]].head(top_n)


# -----------------------------
# TOP RATED (9.0+)
# -----------------------------
def get_top_rated(df, top_n=20):
    top = df.copy()

    # ensure numeric
    top["score"] = pd.to_numeric(top["score"], errors="coerce")

    # keep only high rated + clean data
    top = top[
        (top["score"] >= 8.50) &
        (~top["genre"].str.contains("Hentai", case=False, na=False)) &
        top["image_url"].notna() &
        (top["image_url"] != "")
    ]

    # sort by score (highest first)
    top = top.sort_values(by="score", ascending=False)

    # dynamic pool (smaller than featured because this is elite)
    pool_size = min(int(len(top) * 0.5), 100)

    top_pool = top.head(pool_size)

    # slight shuffle (controlled randomness)
    top_pool = top_pool.sample(frac=1)

    return top_pool[[
    "anime_id",
    "title",
    "title_english",
    "title_japanese",
    "title_synonyms",
    "image_url",
    "genre",
    "score",
    "rank",
    "popularity",
    "members",
    "favorites",
    "studio",
    "episodes",
    "status",
    "duration_min",
    "aired_from_year",
    "source",
    "rating",
    "background"
    ]].head(top_n)