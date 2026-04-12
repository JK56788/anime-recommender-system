from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import time

from recommender import (
    recommend_anime,
    recommend_for_user,
    get_top_rated,
    get_featured_anime,
    df,
    similarity_matrix
)

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "https://anime-recommender-system-p1m6.onrender.com"
            ]
        }
    }
)

# -----------------------------
# GLOBAL CACHE SETTINGS
# -----------------------------
CACHE_REFRESH_INTERVAL = 3600  # 1 hour

featured_cache = {
    "data": None,
    "timestamp": 0
}

top_rated_cache = {
    "data": None,
    "timestamp": 0
}


# -----------------------------
# HOME
# -----------------------------
@app.route("/")
def home():
    return {"message": "API is running"}


@app.route("/genres", methods=["GET"])
def get_genres():
    excluded = {"hentai"}

    all_genres = sorted({
        genre.strip()
        for genre_list in df["genre_list"]
        for genre in genre_list
        if genre and genre.strip() and genre.strip() not in excluded
    })

    return jsonify(all_genres)

# -----------------------------
# FILTER RECOMMENDATION
# -----------------------------
@app.route("/recommend", methods=["GET"])
def recommend():

    genres = request.args.getlist("genre")
    min_score = request.args.get("score", type=float)
    min_episodes = request.args.get("min_episodes", type=int)
    max_episodes = request.args.get("max_episodes", type=int)
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    mode = request.args.get("mode", default="AND")
    match_all = True if mode == "AND" else False
    search = request.args.get("search", default="", type=str).strip()

    results = recommend_anime(
        df,
        genres=genres,
        min_score=min_score,
        min_episodes=min_episodes,
        max_episodes=max_episodes,
        page=page,
        per_page=per_page,
        match_all=match_all,
        search=search
    )

    # clean NaN values inside paginated results
    clean_df = pd.DataFrame(results["results"]).astype(object)
    clean_df = clean_df.where(pd.notnull(clean_df), None)

    return jsonify({
        "results": clean_df.to_dict(orient="records"),
        "total": results["total"]
    })


# -----------------------------
# PERSONALIZED (NO CACHE)
# -----------------------------
@app.route("/personalized", methods=["GET", "POST"])
def personalized():

    if request.method == "POST":
        data = request.json
        liked_titles = data.get("liked", [])
    else:
        liked_titles = []

    results = recommend_for_user(
        df,
        similarity_matrix,
        liked_titles
    )

    clean_results = results.astype(object).where(pd.notnull(results), None)
    return jsonify(clean_results.to_dict(orient="records"))


# -----------------------------
# FEATURED (CACHED)
# -----------------------------
@app.route("/featured", methods=["GET"])
def featured_api():
    global featured_cache

    current_time = time.time()

    if (
        featured_cache["data"] is None or
        current_time - featured_cache["timestamp"] > CACHE_REFRESH_INTERVAL
    ):
        results = get_featured_anime(df)

        featured_cache["data"] = results
        featured_cache["timestamp"] = current_time
    else:
        results = featured_cache["data"]

    clean_results = results.astype(object).where(pd.notnull(results), None)
    return jsonify(clean_results.to_dict(orient="records"))


# -----------------------------
# TOP RATED (CACHED + SHUFFLE EVERY HOUR)
# -----------------------------
@app.route("/top-rated", methods=["GET"])
def top_rated_api():
    global top_rated_cache

    current_time = time.time()

    if (
        top_rated_cache["data"] is None or
        current_time - top_rated_cache["timestamp"] > CACHE_REFRESH_INTERVAL
    ):
        # Shuffle happens inside get_top_rated()
        results = get_top_rated(df)

        if results.empty:
            fallback = df.copy()
            fallback = fallback[fallback["score"].notna()]
            fallback = fallback.sort_values(by="score", ascending=False)
            results = fallback.head(20)

        top_rated_cache["data"] = results
        top_rated_cache["timestamp"] = current_time
    else:
        results = top_rated_cache["data"]

    clean_results = results.astype(object).where(pd.notnull(results), None)
    return jsonify(clean_results.to_dict(orient="records"))



@app.route("/anime/<int:anime_id>", methods=["GET"])
def get_anime(anime_id):
    anime = df[df["anime_id"] == anime_id]

    if anime.empty:
        return jsonify({"error": "Anime not found"}), 404

    anime = anime.iloc[0].to_dict()

    # ✅ FIXED CLEANING
    anime = {
        k: (None if pd.isna(v) else v) if not isinstance(v, (list, dict)) else v
        for k, v in anime.items()
    }

    return jsonify(anime)

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)

