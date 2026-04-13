# 🎬 Anime Recommendation System

A full-stack anime recommendation platform that delivers personalized and filter-based suggestions using a hybrid recommendation engine.

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

## 🚀 Deployment

The application was deployed using:

- **Netlify** → frontend hosting  
- **Render** → backend API hosting  

⚠️ Due to free-tier limitations (memory constraints and cold starts), the live deployment may be unstable.

👉 For the most reliable experience, run the project locally.

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
Final score:

0.4 * score_norm +
0.2 * (1 - episodes_norm) +
0.2 * genre_match +
0.2 * search_score

---

#### Personalized Recommendation
Final score:

0.7 * similarity +
0.3 * quality_score

---

## 🧪 Running the Project

### 💻 Local Development (Recommended)

#### 1. Start backend
pip install -r requirements.txt
python app.py


#### 2. Open frontend

index.html

---

## 📊 Dataset

- Based on the MyAnimeList dataset from Kaggle  
- The original dataset contained **broken and outdated image URLs**, which negatively impacted the UI  

### 🛠 Data Fixing Process

To resolve this:

- A custom script (`fix_images.py`) was developed  
- The script queries the **Jikan API** (MyAnimeList unofficial API)  
- Broken or missing image URLs were replaced with **valid, up-to-date images**  
- Invalid or incomplete entries were filtered out  

### 📦 Final Dataset

- Generated a cleaned dataset: `anime_fixed_images.csv`  
- Contains **6000+ validated anime entries**  
- Ensures consistent image rendering and reliable metadata across the application  

---

This preprocessing step was critical for:
- Maintaining visual integrity of the UI  
- Preventing broken image rendering  
- Improving overall user experience

---

## ⚠️ Limitations

- Dataset is outdated (last major update ~2015)  
- Backend is resource-intensive for free hosting environments  
- Free-tier deployment (Render) may cause instability or crashes  
- No authentication system  
- No collaborative filtering  

---

## 🎯 For Recruiters

This project demonstrates:
- Full-stack development  
- Recommendation system design  
- Data preprocessing & feature engineering  
- Responsive UI/UX  
- API deployment using Netlify and Render  

👉 For full functionality and best performance, please run the project locally.

---

## 🧑‍💻 Author

Built by Joseph Egbejule.
