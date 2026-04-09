# 🎬 Anime Recommendation System

A full-stack anime recommendation platform that delivers personalized and filter-based suggestions using a hybrid recommendation engine.

## 🚀 Live Demo
- Frontend (Netlify): [your-link-here]  
- Backend (Render): [your-link-here]

---

## 🧠 Overview

This project is a data-driven anime recommendation system that simulates a real-world product experience.

It combines:
- Content-based filtering (genres, score, episodes)
- Similarity-based recommendations (cosine similarity)
- User interaction signals (favorites)

Users can:
- Discover anime through curated carousels  
- Apply advanced filters  
- Search intelligently across multiple fields  
- Build a personalized recommendation feed  

---

## 🧩 Key Features

### 🔹 Personalized Recommendations
- Uses cosine similarity on genre + normalized features  
- Prioritizes **recent user preferences**  
- Falls back to curated recommendations if no user data exists  

### 🔹 Smart Search
- Multi-field scoring system:
  - Title (highest weight)
  - Synonyms
  - Genre
  - Studio

### 🔹 Advanced Filtering
- Genre selection (max 5)
- Score filtering (5–10)
- Episode constraints
- Adaptive AND / OR logic

### 🔹 Responsive UI
- Mobile-first design  
- Carousel system with:
  - Auto-play  
  - Drag/swipe  
  - Arrow navigation  
- Favorites stored using localStorage  

### 🔹 Optimized Backend
- Flask API  
- Cached endpoints for performance  
- Pagination system  
- Clean data pipeline  

---

## 🏗️ Architecture

### Frontend
- HTML / CSS / Vanilla JavaScript  
- Dynamic rendering system  
- Local state (favorites, filters)  

### Backend
- Flask API  
- Pandas for data processing  
- Scikit-learn for recommendation logic  

---

## ⚙️ How It Works

### 1. Data Processing
- Dataset cleaned and normalized  
- Scores scaled using MinMaxScaler  
- Genres converted to structured format  
- Missing values handled  

---

### 2. Recommendation Engine

#### Filter-Based Recommendation
Users apply filters (genre, score, episodes)

Final score: 0.4 * score_norm +
0.2 * (1 - episodes_norm) +
0.2 * genre_match +
0.2 * search_score


#### Personalized Recommendation
Uses cosine similarity on:
- Genre encoding  
- Score  
- Episode count  

Final score:0.7 * similarity +
0.3 * quality_score

## 🧪 Running the Project

### 🌐 Demo Mode (Recommended)

This project is configured to run using deployed services:

- Frontend → Netlify  
- Backend → Render  

Simply open the live frontend URL:

[your-netlify-link]

---

### 💻 Local Development (Optional)

To run locally, you must update API endpoints in the frontend.

#### 1. Start backend
pip install -r requirements.txt
python app.py


#### 2. Update API URLs

In your JavaScript files, replace:


https://your-render-backend-url


with:


http://127.0.0.1:5000


#### 3. Open frontend

index.html

---

⚠️ Note:
The current project is optimized for deployed usage, not local development by default.


---

## 📊 Dataset

- Based on MyAnimeList dataset (Kaggle)  
- Image issues fixed using Jikan API  
- Cleaned and preprocessed before use  

---

## ⚠️ Limitations

- Dataset is outdated (last major update ~2015)  
- Newer anime are not included  
- No user authentication (favorites stored locally)  
- No collaborative filtering  
- Backend hosted on free tier (possible cold starts)  

---

## 💡 Future Improvements

- Live anime API integration  
- User accounts & database  
- Collaborative filtering system  
- Improved ranking model  
- Watch history tracking  

---

## 🎯 For Recruiters

This project demonstrates:
- Full-stack development  
- Recommendation system design  
- Data preprocessing & feature engineering  
- Responsive UI/UX  
- Performance optimization (caching, pagination)  

---

## 🧑‍💻 Author

Built by [Joseph Egbejule]
