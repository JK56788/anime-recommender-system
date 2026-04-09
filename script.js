let currentPage = 1;
let perPage = getItemsPerPage();
let showAllGenres = false;
let availableGenres = [];
let selectedGenres = [];
let animeStore = {};
const API_BASE = "localhost"
  ? "http://127.0.0.1:5000"
  : "https://anime-recommender-system-p1m6.onrender.com";



function getItemsPerPage() {
  const width = window.innerWidth;

  if (width < 480) return 6;     // mobile
  if (width < 768) return 9;     // small tablets
  if (width < 1024) return 12;   // tablets
  if (width < 1400) return 15;   // laptops
  return 18;                     // large screens
}


function loadGenres() {
  fetch(`${API_BASE}/genres`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load genres");
      return res.json();
    })
    .then((genres) => {
      availableGenres = genres;
      renderGenreOptions();
      renderSelectedGenres();
    })
    .catch((err) => {
      console.error("Genre load error:", err);
    });
}

function renderSelectedGenres() {
  const container = document.getElementById("selected-genres");
  if (!container) return;

  if (!selectedGenres.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = selectedGenres.map((genre) => `
    <button
      type="button"
      class="selected-genre-tag"
      data-remove="${genre}"
    >
      ${genre} ×
    </button>
  `).join("");
}

function renderGenreOptions(searchTerm = "") {
  const container = document.getElementById("genre-options");
  if (!container) return;

  const normalized = searchTerm.trim().toLowerCase();

  const filtered = availableGenres.filter((genre) => {
    const matches = genre.toLowerCase().includes(normalized);
    return matches;
  });

  const MAX_VISIBLE = 20;

  let visibleGenres = filtered;

  if (!searchTerm && !showAllGenres) {
    visibleGenres = filtered.slice(0, MAX_VISIBLE);
  }

  if (!filtered.length) {
    container.innerHTML = `<p class="genre-empty">No matching genres.</p>`;
    return;
  }

  let html = visibleGenres.map((genre) => `
    <button
      type="button"
      class="genre-option ${selectedGenres.includes(genre) ? "active" : ""}"
      data-genre="${genre}"
    >
      ${genre}
    </button>
  `).join("");

  if (!searchTerm && filtered.length > MAX_VISIBLE) {
    html += `
      <button class="show-more-btn" data-toggle="genres">
        ${showAllGenres ? "Show Less" : "+ More Genres"}
      </button>
    `;
  }

  container.innerHTML = html;
}


function toggleGenres() {
  showAllGenres = !showAllGenres;
  renderGenreOptions(document.getElementById("genre-search")?.value || "");
}

function addGenre(genre) {
  if (selectedGenres.includes(genre)) return;

  // 🔥 LIMIT TO 5
  if (selectedGenres.length >= 5) {
  const msg = document.getElementById("genre-limit-msg");
  if (msg) msg.style.display = "block";
  return;
}

  selectedGenres.push(genre);
  renderSelectedGenres();
  renderGenreOptions(document.getElementById("genre-search")?.value || "");
}

function removeGenre(genre) {
  selectedGenres = selectedGenres.filter((g) => g !== genre);
  renderSelectedGenres();
  renderGenreOptions(document.getElementById("genre-search")?.value || "");
  
  // 🔥 HIDE LIMIT MESSAGE ON CHANGE
  const msg = document.getElementById("genre-limit-msg");
  if (msg) msg.style.display = "none";
}

function setupGenreSearch() {
  const input = document.getElementById("genre-search");
  if (!input) return;

  input.addEventListener("input", (e) => {
    renderGenreOptions(e.target.value);
  });
}


// -----------------------------
// CREATE CARD
// -----------------------------
function createCard(anime) {
  const img = anime.image_url || "https://via.placeholder.com/300x400?text=No+Image";

  const liked = isFavorited(anime.anime_id);
  

  return `
  <a class="anime-card" href="anime.html?id=${anime.anime_id}">
    
    <div class="card-image">
      <img src="${img}" alt="${anime.title}" />
    </div>

    <div class="anime-card-content">
      
      <div class="card-header">
        <h4>${anime.title}</h4>
        <div class="like-btn ${liked ? "liked" : ""}" data-id="${anime.anime_id}">
      ${liked ? "♥" : "♡"}
       </div>
       </div>

      <p class="rating">⭐ ${anime.score}</p>
    </div>

  </a>
`;
}


//Search function that checks multiple fields for a match against the query
function searchAnime(query) {
  query = query.toLowerCase();

  const allAnime = Object.values(animeStore);

  const results = allAnime.map(anime => {
    let score = 0;

    // 🥇 Title match (strong)
    if (anime.title?.toLowerCase().includes(query)) score += 5;
    if (anime.title_english?.toLowerCase().includes(query)) score += 5;
    if (anime.title_japanese?.toLowerCase().includes(query)) score += 5;

    // 🥈 Synonyms
    if (anime.title_synonyms?.toLowerCase().includes(query)) score += 3;

    // 🥉 Genre
    if (anime.genre?.toLowerCase().includes(query)) score += 2;

    // 🏅 Studio
    if (anime.studio?.toLowerCase().includes(query)) score += 1;

    return { anime, score };
  });

  // remove weak matches
  const filtered = results.filter(item => item.score > 0);

  // sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map(item => item.anime);
}


function setupSearch() {
  const input = document.getElementById("search");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = input.value.trim();
      if (!query) return;

      window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
    }
  });
}


function getSearchQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("search") || "";
}

// -----------------------------
// OPEN ANIME DETAILS
// -----------------------------
function openAnime(anime) {
  window.location.href = "anime.html";
}




// -----------------------------
// GENERIC CAROUSEL ENGINE
// -----------------------------
function createCarousel({ url, containerId, intervalTime = 4500 }) {
  const CONFIG = {
  TRANSITION_TIME: 600,
  DRAG_THRESHOLD: 50,
  TOUCH_THRESHOLD: 40,
  TOUCH_DELAY: intervalTime,
};
  
  let data = [];
  let index = 0;
  let interval = null;
  let restartTimer = null;
  let track = null;
  let visibleCount = 0;
  let resizeAttached = false;
  let pointerPaused = false;
  
  
  let hoverAttached = false;
  let arrowsAttached = false;
  let dragAttached = false;

  function getVisibleCount() {
    const width = window.innerWidth;
    if (width < 480) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    if (width < 1400) return 5;
    return 6;
  }

  function getContainer() {
    return document.getElementById(containerId);
  }

  function getDotsContainer() {
    return document.getElementById(`${containerId}-dots`);
  }

  function getLeftArrow() {
    return document.getElementById(`${containerId}-left`);
  }

  function getRightArrow() {
    return document.getElementById(`${containerId}-right`);
  }

  function getGap() {
    const container = getContainer();
    if (!container) return 16;
    const styles = window.getComputedStyle(document.documentElement);
    const rootGap = styles.getPropertyValue("--gap").trim();
    if (rootGap) return parseInt(rootGap, 10) || 16;
    return 16;
  }

  function getStepSize() {
    if (!track || !track.children.length) return 0;
    const cardWidth = track.children[0].offsetWidth;
    return cardWidth + getGap();
  }

  function pageCount() {
    return Math.max(1, Math.ceil(data.length / visibleCount));
  }

  function currentPage() {
    return Math.floor(index / visibleCount) % pageCount();
  }

  function renderDots() {
    const dotsContainer = getDotsContainer();
    if (!dotsContainer) return;

    dotsContainer.innerHTML = "";

    for (let i = 0; i < pageCount(); i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);

      if (i === currentPage()) {
        dot.classList.add("active");
      }

      dot.addEventListener("click", () => {
        pauseAutoTemporarily();
        index = i * visibleCount;
        updatePosition();
        renderDots();
      });

      dotsContainer.appendChild(dot);
    }
  }

  function buildTrack() {
    const container = getContainer();
    if (!container) return;

    track = document.createElement("div");
    track.className = "carousel-track";

    const extended = [...data, ...data];
    track.innerHTML = extended.map(createCard).join("");

    container.innerHTML = "";
    container.appendChild(track);
  }

  function updatePosition(animate = true) {
    if (!track || !track.children.length) return;

    const step = getStepSize();
    if (!step) return;

    track.style.transition = animate ? `transform ${CONFIG.TRANSITION_TIME}ms ease` : "none";
    track.style.transform = `translateX(-${index * step}px)`;
  }

  function normalizeLoopPosition() {
    if (!track) return;

    if (index >= data.length) {
      index = index % data.length;
      updatePosition(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (track) {
            track.style.transition = `transform ${CONFIG.TRANSITION_TIME}ms ease`;
          }
        });
      });
    }

    if (index < 0) {
      index = data.length + index;
      updatePosition(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (track) {
            track.style.transition = `transform ${CONFIG.TRANSITION_TIME}ms ease`;
          }
        });
      });
    }
  }

  function next(step = 1) {
  if (!data.length) return;
  index += step;
  updatePosition(true);

  setTimeout(() => {
    normalizeLoopPosition();
    renderDots();
  }, CONFIG.TRANSITION_TIME + 20);
}

  function prev(step = 1) {
    if (!data.length) return;
    index -= step;
    updatePosition(true);

    setTimeout(() => {
      normalizeLoopPosition();
      renderDots();
   }, CONFIG.TRANSITION_TIME + 20);
  }

  function stopInterval() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function startInterval() {
    stopInterval();

    if (pointerPaused) return;
    if (data.length <= visibleCount) return;

    interval = setInterval(() => {
      next(1);
    }, intervalTime);
  }

  function pauseAutoTemporarily(delay = intervalTime) {
  stopInterval();

  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    startInterval();
  }, delay);
}


  function setupHoverAndTouch() {
  if (hoverAttached) return;
  hoverAttached = true;

  const container = getContainer();
  if (!container) return;

    container.addEventListener("mouseenter", () => {
      pointerPaused = true;
      stopInterval();
    });

    container.addEventListener("mouseleave", () => {
      pointerPaused = false;
      startInterval();
    });

    container.addEventListener("touchstart", () => {
      pointerPaused = true;
      stopInterval();
    }, { passive: true });

    container.addEventListener("touchend", () => {
      pointerPaused = false;
      pauseAutoTemporarily(CONFIG.TOUCH_DELAY);
    }, { passive: true });
  }

  function setupArrows() {
  if (arrowsAttached) return;
  arrowsAttached = true;

  const leftBtn = getLeftArrow();
  const rightBtn = getRightArrow();

    if (leftBtn) {
      leftBtn.addEventListener("click", () => {
        pauseAutoTemporarily();
        prev(visibleCount);
      });
    }

    if (rightBtn) {
      rightBtn.addEventListener("click", () => {
        pauseAutoTemporarily();
        next(visibleCount);
      });
    }
  }

  function setupDrag() {
  if (dragAttached) return;
  dragAttached = true;

  const container = getContainer();
  if (!container) return;

    let startX = 0;
    let endX = 0;
    let dragging = false;

    container.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      endX = e.clientX;
      pointerPaused = true;
      stopInterval();
    });

    container.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      endX = e.clientX;
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;

      const delta = endX - startX;
      dragging = false;
      pointerPaused = false;

      if (Math.abs(delta) > CONFIG.DRAG_THRESHOLD) {
        pauseAutoTemporarily();
        if (delta < 0) {
          next(visibleCount);
        } else {
          prev(visibleCount);
        }
      } else {
        startInterval();
      }
    });

    container.addEventListener("touchstart", (e) => {
      if (!e.touches.length) return;
      startX = e.touches[0].clientX;
      endX = startX;
      pointerPaused = true;
      stopInterval();
    }, { passive: true });

    container.addEventListener("touchmove", (e) => {
      if (!e.touches.length) return;
      endX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener("touchend", () => {
      const delta = endX - startX;
      pointerPaused = false;

      if (Math.abs(delta) > CONFIG.TOUCH_THRESHOLD){
        pauseAutoTemporarily();
        if (delta < 0) {
          next(visibleCount);
        } else {
          prev(visibleCount);
        }
      } else {
        startInterval();
      }
    }, { passive: true });
  }

  function handleResize() {
    const oldVisibleCount = visibleCount;
    visibleCount = getVisibleCount();

    if (oldVisibleCount !== visibleCount) {
      index = Math.floor(index / oldVisibleCount) * visibleCount || 0;
      renderDots();
    }

    updatePosition(false);
    startInterval();
  }

  function load() {
    const container = getContainer();
    if (!container) return;

    visibleCount = getVisibleCount();

    let request;
    
    if (containerId === "personalized") {
      request = fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          liked: getFavorites()
        })
      });
    } else {
      request = fetch(url);
    }
    request
    .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        data = result
          .filter((anime) => anime && anime.image_url)
          .slice(0, 15);


          // ✅ ADD THIS HERE
        data.forEach(anime => {
          animeStore[anime.anime_id] = anime;
        });

        if (!data.length) {
          container.innerHTML = `<p>No anime found.</p>`;
          return;
        }

        index = 0;
        buildTrack();
        updatePosition(false);
        renderDots();
        
        setTimeout(() => next(1), CONFIG.TRANSITION_TIME);
        startInterval();

        if (!resizeAttached) {
          window.addEventListener("resize", handleResize);
          resizeAttached = true;
        }
      })
      .catch((err) => {
        console.error(`${containerId} error:`, err);
        container.innerHTML = `<p>Failed to load anime.</p>`;
      });
  }

  return {
    load,
    setupHover: setupHoverAndTouch,
    setupArrows,
    setupDrag
  };
}

// -----------------------------
// FILTER FUNCTION
// -----------------------------
function getSelectedGenres() {
  return [...selectedGenres];
}

function applyFilters() {

  const genres = getSelectedGenres();
  const score = document.getElementById("score").value;
  const minEpisodes = document.getElementById("min-episodes").value;
  const maxEpisodes = document.getElementById("max-episodes").value;

   // VALIDATION
 let errors = [];

if (!genres.length && !score && !minEpisodes && !maxEpisodes) {
  errors.push("Please select at least one filter");
}

if (score && (score < 5 || score > 10)) {
  errors.push("Score must be between 5 and 10");
}

if (minEpisodes && minEpisodes < 1) {
  errors.push("Min episodes must be at least 1");
}

if (maxEpisodes && maxEpisodes < 1) {
  errors.push("Max episodes must be at least 1");
}

if (minEpisodes && maxEpisodes && Number(minEpisodes) > Number(maxEpisodes)) {
  errors.push("Min episodes cannot be greater than max episodes");
}

// 🔥 show ALL errors at once
if (errors.length) {
  openModal(errors.join("\n"));
  return;
}

  // build query params
  let params = new URLSearchParams();

  genres.forEach(g => params.append("genre", g));

  if (score) params.append("score", score);
  if (minEpisodes) params.append("min_episodes", minEpisodes);
  if (maxEpisodes) params.append("max_episodes", maxEpisodes);
  // adaptive mode
  let mode = genres.length >= 3 ? "OR" : "AND";
  params.append("mode", mode);

  // redirect to results page
  window.location.href = `browse.html?${params.toString()}`;
}



function loadBrowseResults() {
  perPage = getItemsPerPage();
  const params = new URLSearchParams(window.location.search);

  const genres = params.getAll("genre");
  const score = params.get("score");
  const minEpisodes = params.get("min_episodes");
  const maxEpisodes = params.get("max_episodes");
  const mode = params.get("mode") || "AND";
  const searchQuery = getSearchQuery();

  // reset page if not present
  currentPage = parseInt(params.get("page")) || 1;

  let url = `${API_BASE}/recommend?page=${currentPage}&per_page=${perPage}&mode=${mode}&`;

  genres.forEach(g => {
    url += `genre=${encodeURIComponent(g)}&`;
  });

  if (score) url += `score=${encodeURIComponent(score)}&`;
  if (minEpisodes) url += `min_episodes=${encodeURIComponent(minEpisodes)}&`;
  if (maxEpisodes) url += `max_episodes=${encodeURIComponent(maxEpisodes)}&`;
  if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Failed request");
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("filtered");
      const title = document.getElementById("results-title");
      const input = document.getElementById("search");

      if (input && searchQuery) {
        input.value = searchQuery;
      }

      if (title) {
        title.textContent = searchQuery
          ? `Search results for: "${searchQuery}"`
          : "🎬 Browse Results";
      }

      if (!data.results.length) {
        container.innerHTML = searchQuery
          ? `<p>No results found for "${searchQuery}".</p>`
          : `<p>No anime matched your filters.</p>`;

        const paginationTop = document.getElementById("pagination");
        const paginationBottom = document.getElementById("pagination-bottom");
        if (paginationTop) paginationTop.innerHTML = "";
        if (paginationBottom) paginationBottom.innerHTML = "";
        return;
      }

      animeStore = {};
      data.results.forEach(anime => {
        animeStore[anime.anime_id] = anime;
      });


    container.innerHTML = data.results.map(createCard).join("");
     // 🔥 control pagination visibility
    const paginationTop = document.getElementById("pagination");
    const paginationBottom = document.getElementById("pagination-bottom");

  if (data.total <= perPage) {
   if (paginationTop) paginationTop.style.display = "none";
   if (paginationBottom) paginationBottom.style.display = "none";
  } else {
    if (paginationTop) paginationTop.style.display = "block";
    if (paginationBottom) paginationBottom.style.display = "block";
 }

  renderPagination(data.total);
    })
    .catch(err => {
      console.error("Browse fetch error:", err);
      document.getElementById("filtered").innerHTML =
        `<p>Failed to load anime.</p>`;
    });
}


// -----------------------------
// PAGINATION RENDER
// -----------------------------

function renderPagination(total) {
  const totalPages = Math.ceil(total / perPage);

  const containers = ["pagination", "pagination-bottom"]
  .map(id => document.getElementById(id))
  .filter(Boolean);

  let buttons = "";

  const maxVisible = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    start = 1;
    end = Math.min(5, totalPages);
  }

  if (currentPage >= totalPages - 2) {
    start = Math.max(1, totalPages - 4);
    end = totalPages;
  }

  if (currentPage > 1) {
    buttons += `<button onclick="goToPage(${currentPage - 1})">←</button>`;
  }

  if (start > 1) {
    buttons += `<button onclick="goToPage(1)">1</button>`;
    if (start > 2) buttons += `<span class="pagination-dots">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    buttons += `
      <button onclick="goToPage(${i})"
        class="${i === currentPage ? "active" : ""}">
        ${i}
      </button>
    `;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      buttons += `<span class="pagination-dots">...</span>`;
    }
    buttons += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  if (currentPage < totalPages) {
    buttons += `<button onclick="goToPage(${currentPage + 1})">→</button>`;
  }

  // 🔥 apply to BOTH paginations
  containers.forEach(c => {
    if (c) c.innerHTML = buttons;
  });
}

function renderFavoritesPagination(total, perPage) {
  const containers = [
    document.getElementById("favorites-pagination"),
    document.getElementById("favorites-pagination-top")
  ].filter(Boolean);

  if (!containers.length) return;

  const totalPages = Math.ceil(total / perPage);

  if (totalPages <= 1) {
    containers.forEach(c => c.innerHTML = "");
    return;
  }

  let html = "";

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="${i === favPage ? "active" : ""}" onclick="goToFavPage(${i})">
        ${i}
      </button>
    `;
  }

  // 🔥 APPLY TO BOTH
  containers.forEach(c => c.innerHTML = html);
}

function goToFavPage(page) {
  favPage = page;
  loadFavoritesPage();
}

// -----------------------------
// PAGE SWITCH
// -----------------------------
function goToPage(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", page);

  window.location.href = `browse.html?${params.toString()}`;
}

// -----------------------------
// INIT CAROUSELS
// -----------------------------
const featuredCarousel = createCarousel({
  url: `${API_BASE}/featured`,
  containerId: "featured",
  intervalTime: 4500
});

const topRatedCarousel = createCarousel({
  url: `${API_BASE}/top-rated`,
  containerId: "top-rated",
  intervalTime: 5000
});

///good now.

const personalizedCarousel = createCarousel({
  url: `${API_BASE}/personalized`,
  containerId: "personalized",
  intervalTime: 4000
});


// -----------------------------
// GLOBAL CLICK HANDLER (CARD NAVIGATION)
// -----------------------------
document.addEventListener("click", function(e) {
  
// ✅ LIKE BUTTON CLICK (FIXED)
const likeBtn = e.target.closest(".like-btn");
if (likeBtn) {
  e.preventDefault();
  e.stopPropagation();

  const id = Number(likeBtn.dataset.id);

  toggleFavorite({
    anime_id: id,
    title: animeStore[id]?.title || "Unknown"
  });

  refreshAllLikeButtons();

  if (document.getElementById("favorites-grid")) {
    loadFavoritesPage();
  }

  return;
}

  // ✅ GENRE ADD
  const addBtn = e.target.closest(".genre-option");
  if (addBtn) {
    const genre = addBtn.dataset.genre;
    addGenre(genre);
    return;
  }

  // ✅ GENRE REMOVE
  const removeBtn = e.target.closest(".selected-genre-tag");
  if (removeBtn) {
    const genre = removeBtn.dataset.remove;
    removeGenre(genre);
    return;
  }

  // ✅ TOGGLE MORE GENRES
  const toggleBtn = e.target.closest(".show-more-btn");
  if (toggleBtn) {
    toggleGenres();
    return;
  }

  // -----------------------------
  // CARD NAVIGATION (keep this last)
  // -----------------------------
  const card = e.target.closest(".anime-card");
  if (!card) return;

  const url = new URL(card.href);
  const id = url.searchParams.get("id");
  const anime = animeStore[id];

  
  window.location.href = `anime.html?id=${id}`;
});



function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}


function isFavorited(id) {
  const numericId = Number(id);
  const favs = getFavorites();
  return favs.some(a => Number(a.anime_id) === numericId);
}

// ========================
// 🔹 MODAL FUNCTIONS (PUT HERE)
// ========================
function openModal(message, showCancel = false, onConfirm = null) {
  const modal = document.getElementById("confirm-modal");
  const messageEl = document.getElementById("modal-message");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const confirmBtn = document.getElementById("modal-confirm-btn");

  messageEl.textContent = message;

  if (showCancel) {
    cancelBtn.classList.remove("hidden");
  } else {
    cancelBtn.classList.add("hidden");
  }

  confirmBtn.onclick = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  cancelBtn.onclick = closeModal;

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("confirm-modal").classList.add("hidden");
}


function toggleFavorite(anime) {
  let favs = getFavorites();

  const animeId = Number(anime.anime_id);

  const exists = favs.find(a => Number(a.anime_id) === animeId);

  if (exists) {
    favs = favs.filter(a => Number(a.anime_id) !== animeId);
  } else {
    favs.push({
      anime_id: animeId,
      anime_title: anime.title,
      liked_at: new Date().toISOString()
    });
  }

  saveFavorites(favs);
}


function clearAllFavorites() {
  openModal(
    "Are you sure you want to remove ALL favorites?",
    true,
    () => {
      localStorage.removeItem("favorites");

      refreshAllLikeButtons();

      if (document.getElementById("favorites-grid")) {
        loadFavoritesPage();
      }
    }
  );
}


function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "index.html";
  }
}

function refreshAllLikeButtons() {
  document.querySelectorAll(".like-btn").forEach(btn => {
    const id = btn.dataset.id;

    if (isFavorited(id)) {
      btn.classList.add("liked");
      btn.textContent = "♥";
    } else {
      btn.classList.remove("liked");
      btn.textContent = "♡";
    }
  });
}

window.addEventListener("storage", () => {
  refreshAllLikeButtons();

  if (document.getElementById("favorites-grid")) {
    loadFavoritesPage();
  }
});


let favPage = 1;

async function loadFavoritesPage() {
  const container = document.getElementById("favorites-grid");

  const paginations = [
    document.getElementById("favorites-pagination"),
    document.getElementById("favorites-pagination-top")
  ].filter(Boolean);

  if (!container) return;

  const favs = getFavorites();

  // 🔥 EMPTY STATE
  if (!favs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Like some anime to build your favorites and get recommendations</p>
      </div>
    `;

    // ✅ CLEAR BOTH (use the array properly)
    paginations.forEach(p => p.innerHTML = "");

    return;
  }

  const perPage = getItemsPerPage();

  // 🔥 FIX: validate page BEFORE slicing
  const totalPages = Math.ceil(favs.length / perPage);
  if (favPage > totalPages) {
    favPage = totalPages || 1;
  }

  const start = (favPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = favs.slice(start, end);

  const animeList = await Promise.all(
    pageItems.map(async (fav) => {
      if (animeStore[fav.anime_id]) {
        return animeStore[fav.anime_id];
      }

      const res = await fetch(`${API_BASE}/anime/${fav.anime_id}`);
      const data = await res.json();

      animeStore[data.anime_id] = data;
      return data;
    })
  );

  container.innerHTML = animeList.map(createCard).join("");

  // 🔥 SYNC UI
  refreshAllLikeButtons();

  container.style.opacity = "1";

  // 🔥 pagination updates BOTH already
  renderFavoritesPagination(favs.length, perPage);
}



// -----------------------------
// START APP
// -----------------------------
window.onload = function () {

  setupSearch();
  
  // 👉 HOMEPAGE ONLY
  if (document.getElementById("featured")) {
    loadGenres();
    setupGenreSearch();

    featuredCarousel.load();
    topRatedCarousel.load();
    personalizedCarousel.load();

    featuredCarousel.setupHover();
    topRatedCarousel.setupHover();
    personalizedCarousel.setupHover();

    featuredCarousel.setupArrows();
    topRatedCarousel.setupArrows();
    personalizedCarousel.setupArrows();

    featuredCarousel.setupDrag();
    topRatedCarousel.setupDrag();
    personalizedCarousel.setupDrag();
  }

  // 👉 BROWSE PAGE ONLY (we’ll complete this next)
  if (document.getElementById("filtered")) {
    loadBrowseResults();
  }

  if (document.getElementById("favorites-grid")) {
    loadFavoritesPage();
  }

  const clearBtn = document.getElementById("clear-favorites-btn");

  if (clearBtn) {
  clearBtn.addEventListener("click", clearAllFavorites);
}
};
