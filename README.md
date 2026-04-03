# 🎌 Anime Recommender (WIP)

A full-stack anime recommendation website built with a Flask backend and a vanilla JavaScript frontend.

The application provides filter-based, search-based, and personalized anime recommendations using a preprocessed dataset (up to ~2015).

⚠️ This project is still a work in progress.

---

## 🚀 Features

### 🔍 Filtering System

* Multi-genre selection (max 5)
* Minimum score filtering
* Maximum episode filtering
* Adaptive matching (AND / OR logic)

### 🧠 Recommendation Engine

* Content-based filtering using:

  * Genre similarity (one-hot encoding)
  * Score normalization
  * Episode normalization
* Weighted ranking system combining:

  * Score
  * Genre match strength
  * Episode count
  * Search relevance

### 👤 Personalized Recommendations

* Based on recently liked anime (last 5)
* Uses cosine similarity on feature vectors
* Fallback system for new users

### 🔎 Search System

* Matches across:

  * Title
  * English / Japanese titles
  * Synonyms
  * Genre
  * Studio

### 🎞️ UI / UX

* Featured anime carousel
* Top-rated anime carousel
* Personalized carousel
* Responsive layout
* Pagination system
* Dynamic genre selection UI

---

## 🏗️ Project Structure

```
project/
│
├── app.py                # Flask API server
├── recommender.py       # Recommendation engine + dataset loading
├── fix_images.py        # Dataset preprocessing (image fixing using Jikan API)
│
├── index.html           # Homepage
├── browse.html          # Browse results page
├── anime.html           # Anime detail page
├── script.js            # Frontend logic
├── style.css            # Styling
│
└── anime_fixed_images.csv  # Final processed dataset
```

---

## ⚙️ How It Works

### Backend (Flask)

Key endpoints:

* `/recommend` → Filter-based recommendations
* `/personalized` → Personalized recommendations
* `/featured` → Curated anime (cached)
* `/top-rated` → High-rated anime (cached)
* `/genres` → Available genres

Caching is used for featured and top-rated endpoints to improve performance.

---

### Recommendation System

The ranking system combines:

* Normalized score (quality)
* Episode count (shorter preferred)
* Genre match strength
* Search relevance

Personalization:

* Uses cosine similarity on:

  * Genre encoding
  * Score
  * Episode count

---

## ▶️ How to Run

### 1. Install dependencies

pip install flask pandas scikit-learn flask-cors

---

### 2. Dataset

This project uses a **preprocessed dataset**:

anime_fixed_images.csv

* Cleaned and normalized
* Duplicate entries removed
* Missing values handled
* Broken images fixed using Jikan API

Important:

* The dataset is already included
* No external API or Kaggle access is required

---

### 3. Run backend

python app.py

Server runs at:
http://127.0.0.1:5000

---

### 4. Run frontend

Open:

index.html

---

## 🧪 Usage

### 🔎 Search

* Enter a query in the search bar
* Press Enter
* Redirects to browse results

### 🎯 Filters

* Select genres (max 5)
* Add score / episode constraints
* Click "Apply" → results page

### 🎴 Anime Cards

* Click → opens detail page
* Data is temporarily stored using localStorage

---

## ⚠️ Current Limitations (WIP)

### Missing Features

* Like/favorite system not implemented
* No "My List" section
* Cards are not right-clickable
* No persistent user data

### UX Issues

* Navigation depends on browser history
* No URL-based routing (anime IDs not in URL)
* Opening pages in new tabs can break navigation flow

### Performance

* No lazy loading for images
* No caching for filter queries
* Repeated API calls on navigation

---

## 🛠️ Planned Improvements

* Implement like/favorite system (localStorage → backend DB)
* Add "My List" page
* Introduce URL-based routing (anime.html?id=...)
* Add right-click / open in new tab support
* Improve navigation fallback system
* Add lazy loading for images
* Optimize backend performance and caching

---

## 📊 Dataset Pipeline

The dataset was created manually using:

* MyAnimeList dataset (original source)
* Custom preprocessing
* Image fixing using Jikan API (see fix_images.py)

Note:

* `fix_images.py` is a one-time preprocessing script
* It is NOT required to run the application

---

## 🧠 Notes

* The application runs entirely on a local dataset
* No external APIs are used at runtime
* Recommendation system is content-based (not collaborative filtering)
* Backend and data pipeline are cleanly separated

---

## 📌 Status

🚧 Work in Progress — not production-ready
