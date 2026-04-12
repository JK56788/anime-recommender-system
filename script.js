let currentPage = 1;
let perPage = getItemsPerPage();
let showAllGenres = false;
let availableGenres = [];
let selectedGenres = [];
let animeStore = {};
let favPage = 1;

// =====================================================
// API BASE
// =====================================================
// Local frontend on Live Server / localhost should use local Flask.
// Everything else uses your Render backend.
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "https://anime-recommender-system-p1m6.onrender.com";

// =====================================================
// GENERIC FETCH HELPERS
// =====================================================
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return res.json();
}

function getItemsPerPage() {
  const width = window.innerWidth;

  if (width < 480) return 6;
  if (width < 768) return 9;
  if (width < 1024) return 12;
  if (width < 1400) return 15;
  return 18;
}

// =====================================================
// GENRES
// =====================================================
async function loadGenres() {
  try {
    const genres = await fetchJSON(`${API_BASE}/genres`);
    availableGenres = Array.isArray(genres) ? genres : [];
    renderGenreOptions();
    renderSelectedGenres();
  } catch (err) {
    console.error("Genre load error:", err);

    const container = document.getElementById("genre-options");
    if (container) {
      container.innerHTML = `<p class="genre-empty">Failed to load genres.</p>`;
    }
  }
}

function renderSelectedGenres() {
  const container = document.getElementById("selected-genres");
  if (!container) return;

  if (!selectedGenres.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = selectedGenres
    .map(
      (genre) => `
    <button
      type="button"
      class="selected-genre-tag"
      data-remove="${genre}"
    >
      ${genre} ×
    </button>
  `
    )
    .join("");
}

function renderGenreOptions(searchTerm = "") {
  const container = document.getElementById("genre-options");
  if (!container) return;

  const normalized = searchTerm.trim().toLowerCase();

  const filtered = availableGenres.filter((genre) =>
    genre.toLowerCase().includes(normalized)
  );

  const MAX_VISIBLE = 20;
  let visibleGenres = filtered;

  if (!searchTerm && !showAllGenres) {
    visibleGenres = filtered.slice(0, MAX_VISIBLE);
  }

  if (!filtered.length) {
    container.innerHTML = `<p class="genre-empty">No matching genres.</p>`;
    return;
  }

  let html = visibleGenres
    .map(
      (genre) => `
    <button
      type="button"
      class="genre-option ${selectedGenres.includes(genre) ? "active" : ""}"
      data-genre="${genre}"
    >
      ${genre}
    </button>
  `
    )
    .join("");

  if (!searchTerm && filtered.length > MAX_VISIBLE) {
    html += `
      <button class="show-more-btn" data-toggle="genres" type="button">
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

// =====================================================
// FAVORITES
// =====================================================
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}

function isFavorited(id) {
  const numericId = Number(id);
  const favs = getFavorites();
  return favs.some((a) => Number(a.anime_id) === numericId);
}

function toggleFavorite(anime) {
  let favs = getFavorites();
  const animeId = Number(anime.anime_id);

  const exists = favs.find((a) => Number(a.anime_id) === animeId);

  if (exists) {
    favs = favs.filter((a) => Number(a.anime_id) !== animeId);
  } else {
    favs.push({
      anime_id: animeId,
      anime_title: anime.title,
      liked_at: new Date().toISOString(),
    });
  }

  saveFavorites(favs);
}

function refreshAllLikeButtons() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
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

// =====================================================
// MODAL
// =====================================================
function openModal(message, showCancel = false, onConfirm = null) {
  const modal = document.getElementById("confirm-modal");
  const messageEl = document.getElementById("modal-message");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const confirmBtn = document.getElementById("modal-confirm-btn");

  if (!modal || !messageEl || !cancelBtn || !confirmBtn) {
    alert(message);
    if (onConfirm) onConfirm();
    return;
  }

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
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.add("hidden");
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

// =====================================================
// CARD / SEARCH
// =====================================================
function createCard(anime) {
  const img =
    anime.image_url || "https://via.placeholder.com/300x400?text=No+Image";

  const liked = isFavorited(anime.anime_id);

  return `
  <a class="anime-card" href="anime.html?id=${anime.anime_id}">
    <div class="card-image">
      <img src="${img}" alt="${anime.title || "Anime"}" />
    </div>

    <div class="anime-card-content">
      <div class="card-header">
        <h4>${anime.title || "Unknown Title"}</h4>
        <div class="like-btn ${liked ? "liked" : ""}" data-id="${anime.anime_id}">
          ${liked ? "♥" : "♡"}
        </div>
      </div>

      <p class="rating">⭐ ${anime.score ?? "N/A"}</p>
    </div>
  </a>
`;
}

function searchAnime(query) {
  query = query.toLowerCase();
  const allAnime = Object.values(animeStore);

  const results = allAnime.map((anime) => {
    let score = 0;

    if (anime.title?.toLowerCase().includes(query)) score += 5;
    if (anime.title_english?.toLowerCase().includes(query)) score += 5;
    if (anime.title_japanese?.toLowerCase().includes(query)) score += 5;
    if (anime.title_synonyms?.toLowerCase().includes(query)) score += 3;
    if (anime.genre?.toLowerCase().includes(query)) score += 2;
    if (anime.studio?.toLowerCase().includes(query)) score += 1;

    return { anime, score };
  });

  return results
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.anime);
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

function openAnime(anime) {
  if (!anime?.anime_id) return;
  window.location.href = `anime.html?id=${anime.anime_id}`;
}

// =====================================================
// CAROUSEL ENGINE
// =====================================================
function createCarousel({ url, containerId, intervalTime = 4500 }) {
  const CONFIG = {
    TRANSITION_TIME: 280,
    DRAG_THRESHOLD: 50,
    TOUCH_THRESHOLD: 40,
  };

  let data = [];
  let index = 0;
  let interval = null;
  let track = null;
  let visibleCount = 0;
  let resizeAttached = false;
  let isAnimating = false;
  let autoResumeTimer = null;
  let dragBound = false;
  let hoverBound = false;
  let arrowsBound = false;

  const getContainer = () => document.getElementById(containerId);
  const getDots = () => document.getElementById(`${containerId}-dots`);
  const getLeft = () => document.getElementById(`${containerId}-left`);
  const getRight = () => document.getElementById(`${containerId}-right`);

  function getVisibleCount() {
    const width = window.innerWidth;
    if (width < 480) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    if (width < 1400) return 5;
    return 6;
  }

  function getStepSize() {
    if (!track || !track.children.length) return 0;

    const gap =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--gap")
      ) || 16;

    return track.children[0].offsetWidth + gap;
  }

  function pageCount() {
    return Math.max(1, Math.ceil(data.length / visibleCount));
  }

  function getNormalizedIndex() {
    if (!data.length) return 0;
    return ((index % data.length) + data.length) % data.length;
  }

  function currentPage() {
    if (!data.length) return 0;
    return Math.floor(getNormalizedIndex() / visibleCount) % pageCount();
  }

  function buildTrack() {
    const container = getContainer();
    if (!container) return;

    track = document.createElement("div");
    track.className = "carousel-track";

    // duplicate data for smooth wrap
    const extended = [...data, ...data];
    track.innerHTML = extended.map(createCard).join("");

    container.innerHTML = "";
    container.appendChild(track);
  }

  function applyTransform(targetIndex, animate = true) {
  if (!track) return;

  const step = getStepSize();
  if (!step) return;

  if (animate) {
    track.style.transition = `transform ${CONFIG.TRANSITION_TIME}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  } else {
    track.style.transition = "none";
  }

  track.style.transform = `translate3d(-${targetIndex * step}px, 0, 0)`;
}

  
  function normalizeLoopPosition() {
  if (!track || !data.length) return;

  if (index >= data.length) {
    index -= data.length;

    track.style.transition = "none";
    track.style.transform = `translate3d(-${index * getStepSize()}px, 0, 0)`;
  }

  if (index < 0) {
    index += data.length;

    track.style.transition = "none";
    track.style.transform = `translate3d(-${index * getStepSize()}px, 0, 0)`;
  }
}


  function preNormalize(targetIndex) {
  if (!data.length) return targetIndex;

  if (targetIndex >= data.length) {
    index = targetIndex - data.length;

    track.style.transition = "none";
    track.style.transform = `translate3d(-${index * getStepSize()}px,0,0)`;

    return index + 1; // continue forward smoothly
  }

  if (targetIndex < 0) {
    index = targetIndex + data.length;

    track.style.transition = "none";
    track.style.transform = `translate3d(-${index * getStepSize()}px,0,0)`;

    return index - 1;
  }

  return targetIndex;
}


  function renderDots() {
    const dots = getDots();
    if (!dots) return;

    dots.innerHTML = "";

    for (let i = 0; i < pageCount(); i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `Go to slide ${i + 1}`);

      if (i === currentPage()) btn.classList.add("active");

      btn.onclick = () => {
        if (!track) return;
        stopInterval();
        
        const targetIndex = i * visibleCount;
        // 🔥 reset cleanly before jump
        index = targetIndex;
        applyTransform(index, true);
        
        renderDots();
        resumeAutoAfterDelay();
      };

      dots.appendChild(btn);
    }
  }

  function clearAutoResumeTimer() {
    if (autoResumeTimer) {
      clearTimeout(autoResumeTimer);
      autoResumeTimer = null;
    }
  }

  function stopInterval() {
    clearInterval(interval);
    interval = null;
    clearAutoResumeTimer();
  }

  function startInterval() {
    stopInterval();

    if (!data.length) return;
    if (data.length <= visibleCount) return;

    interval = setInterval(() => {
      next(true);
    }, intervalTime);
  }

  function resumeAutoAfterDelay(delay = intervalTime) {
    clearAutoResumeTimer();

    autoResumeTimer = setTimeout(() => {
      startInterval();
    }, delay);
  }

  function moveToIndex(targetIndex, animate = true, restartAuto = false) {
  if (!track) return;

  // 🔥 allow interruption
  if (isAnimating) {
    track.style.transition = "none";
    isAnimating = false;
  }

  index = targetIndex;

  applyTransform(index, animate);
  isAnimating = animate;

  if (!animate) {
    renderDots();
    if (restartAuto) startInterval();
    return;
  }

  track.addEventListener(
    "transitionend",
    () => {
      normalizeLoopPosition();
      renderDots();
      isAnimating = false;

      if (restartAuto) {
        resumeAutoAfterDelay();
      }
    },
    { once: true }
  );
}

  function next(restartAuto = false) {
  const target = preNormalize(index + 1);
  moveToIndex(target, true, restartAuto);
}

function prev(restartAuto = false) {
  const target = preNormalize(index - 1);
  moveToIndex(target, true, restartAuto);
}

  function setupHover() {
    if (hoverBound) return;
    hoverBound = true;

    const container = getContainer();
    if (!container) return;

    container.addEventListener("mouseenter", () => {
      stopInterval();
    });

    container.addEventListener("mouseleave", () => {
      resumeAutoAfterDelay(800);
    });

    container.addEventListener(
      "touchstart",
      () => {
        stopInterval();
      },
      { passive: true }
    );

    container.addEventListener(
      "touchend",
      () => {
        resumeAutoAfterDelay(1000);
      },
      { passive: true }
    );
  }

  function setupArrows() {
    if (arrowsBound) return;
    arrowsBound = true;

    const left = getLeft();
    const right = getRight();

    if (left) {
      left.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isAnimating) return;

        stopInterval();
        prev(true);
      };
    }

    if (right) {
      right.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isAnimating) return;

        stopInterval();
        next(true);
      };
    }
  }

  function setupDrag() {
    if (dragBound) return;
    dragBound = true;

    const container = getContainer();
    if (!container) return;

    let startX = 0;
    let endX = 0;
    let isDragging = false;
    let movedEnough = false;

    container.addEventListener("mousedown", (e) => {
      if (e.target.closest(".carousel-arrow")) return;
      if (isAnimating) return;

      isDragging = true;
      movedEnough = false;
      startX = e.clientX;
      endX = e.clientX;
      stopInterval();
    });

    container.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      endX = e.clientX;

      if (Math.abs(endX - startX) > 5) {
        movedEnough = true;
      }
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;

      isDragging = false;
      const delta = endX - startX;

      if (Math.abs(delta) > CONFIG.DRAG_THRESHOLD) {
        delta < 0 ? next(true) : prev(true);
      } else {
        resumeAutoAfterDelay(800);
      }
    });

    container.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.closest(".carousel-arrow")) return;
        if (!e.touches.length || isAnimating) return;

        isDragging = true;
        movedEnough = false;
        startX = e.touches[0].clientX;
        endX = startX;
        stopInterval();
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging || !e.touches.length) return;

        endX = e.touches[0].clientX;

        if (Math.abs(endX - startX) > 5) {
          movedEnough = true;
        }
      },
      { passive: true }
    );

    container.addEventListener(
      "touchend",
      () => {
        if (!isDragging) return;

        isDragging = false;
        const delta = endX - startX;

        if (Math.abs(delta) > CONFIG.TOUCH_THRESHOLD) {
          delta < 0 ? next(true) : prev(true);
        } else {
          resumeAutoAfterDelay(1000);
        }
      },
      { passive: true }
    );

    // Prevent accidental card click after a swipe
    container.addEventListener("click", (e) => {
      if (movedEnough) {
        const card = e.target.closest(".anime-card");
        if (card) {
          e.preventDefault();
          e.stopPropagation();
          movedEnough = false;
        }
      }
    });
  }

  async function load() {
    const container = getContainer();
    if (!container) return;

    visibleCount = getVisibleCount();

    try {
      let result;

      if (containerId === "personalized") {
        result = await fetchJSON(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liked: getFavorites() }),
        });
      } else {
        result = await fetchJSON(url);
      }

      data = (Array.isArray(result) ? result : [])
        .filter((anime) => anime && anime.image_url)
        .slice(0, 15);

      data.forEach((anime) => {
        animeStore[anime.anime_id] = anime;
      });

      if (!data.length) {
        container.innerHTML = "<p>No anime found.</p>";
        return;
      }

      index = 0;
      buildTrack();
      applyTransform(index, false);
      renderDots();
      startInterval();

      if (!resizeAttached) {
        window.addEventListener("resize", () => {
          visibleCount = getVisibleCount();
          renderDots();
          applyTransform(index, false);
          startInterval();
        });
        resizeAttached = true;
      }
    } catch (err) {
      console.error(`${containerId} error:`, err);
      container.innerHTML = `<p>Failed to load anime.</p>`;
    }
  }

  return {
    load,
    setupHover,
    setupArrows,
    setupDrag,
  };
}

// =====================================================
// FILTERS / BROWSE
// =====================================================
function getSelectedGenres() {
  return [...selectedGenres];
}

function applyFilters() {
  const genres = getSelectedGenres();
  const score = document.getElementById("score")?.value;
  const minEpisodes = document.getElementById("min-episodes")?.value;
  const maxEpisodes = document.getElementById("max-episodes")?.value;

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

  if (errors.length) {
    openModal(errors.join("\n"));
    return;
  }

  const params = new URLSearchParams();

  genres.forEach((g) => params.append("genre", g));
  if (score) params.append("score", score);
  if (minEpisodes) params.append("min_episodes", minEpisodes);
  if (maxEpisodes) params.append("max_episodes", maxEpisodes);

  const mode = genres.length >= 3 ? "OR" : "AND";
  params.append("mode", mode);

  window.location.href = `browse.html?${params.toString()}`;
}

async function loadBrowseResults() {
  perPage = getItemsPerPage();
  const params = new URLSearchParams(window.location.search);

  const genres = params.getAll("genre");
  const score = params.get("score");
  const minEpisodes = params.get("min_episodes");
  const maxEpisodes = params.get("max_episodes");
  const mode = params.get("mode") || "AND";
  const searchQuery = getSearchQuery();

  currentPage = parseInt(params.get("page")) || 1;

  let url = `${API_BASE}/recommend?page=${currentPage}&per_page=${perPage}&mode=${mode}&`;

  genres.forEach((g) => {
    url += `genre=${encodeURIComponent(g)}&`;
  });

  if (score) url += `score=${encodeURIComponent(score)}&`;
  if (minEpisodes) url += `min_episodes=${encodeURIComponent(minEpisodes)}&`;
  if (maxEpisodes) url += `max_episodes=${encodeURIComponent(maxEpisodes)}&`;
  if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

  try {
    const data = await fetchJSON(url);

    const container = document.getElementById("filtered");
    const title = document.getElementById("results-title");
    const input = document.getElementById("search");

    if (!container) return;

    if (input && searchQuery) {
      input.value = searchQuery;
    }

    if (title) {
      title.textContent = searchQuery
        ? `Search results for: "${searchQuery}"`
        : "🎬 Browse Results";
    }

    if (!data.results?.length) {
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
    data.results.forEach((anime) => {
      animeStore[anime.anime_id] = anime;
    });

    container.innerHTML = data.results.map(createCard).join("");

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
    refreshAllLikeButtons();
  } catch (err) {
    console.error("Browse fetch error:", err);
    const filtered = document.getElementById("filtered");
    if (filtered) {
      filtered.innerHTML = `<p>Failed to load anime.</p>`;
    }
  }
}

// =====================================================
// PAGINATION
// =====================================================
function renderPagination(total) {
  const totalPages = Math.ceil(total / perPage);

  const containers = ["pagination", "pagination-bottom"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let buttons = "";

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
      <button onclick="goToPage(${i})" class="${i === currentPage ? "active" : ""}">
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

  containers.forEach((c) => {
    c.innerHTML = buttons;
  });
}

function renderFavoritesPagination(total, perPageCount) {
  const containers = [
    document.getElementById("favorites-pagination"),
    document.getElementById("favorites-pagination-top"),
  ].filter(Boolean);

  if (!containers.length) return;

  const totalPages = Math.ceil(total / perPageCount);

  if (totalPages <= 1) {
    containers.forEach((c) => (c.innerHTML = ""));
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

  containers.forEach((c) => (c.innerHTML = html));
}

function goToFavPage(page) {
  favPage = page;
  loadFavoritesPage();
}

function goToPage(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", page);
  window.location.href = `browse.html?${params.toString()}`;
}

// =====================================================
// FAVORITES PAGE
// =====================================================
async function loadFavoritesPage() {
  const container = document.getElementById("favorites-grid");
  const paginations = [
    document.getElementById("favorites-pagination"),
    document.getElementById("favorites-pagination-top"),
  ].filter(Boolean);

  if (!container) return;

  const favs = getFavorites();

  if (!favs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Like some anime to build your favorites and get recommendations</p>
      </div>
    `;
    paginations.forEach((p) => (p.innerHTML = ""));
    return;
  }

  const perPageCount = getItemsPerPage();
  const totalPages = Math.ceil(favs.length / perPageCount);

  if (favPage > totalPages) {
    favPage = totalPages || 1;
  }

  const start = (favPage - 1) * perPageCount;
  const end = start + perPageCount;
  const pageItems = favs.slice(start, end);

  try {
    const animeList = await Promise.all(
      pageItems.map(async (fav) => {
        if (animeStore[fav.anime_id]) {
          return animeStore[fav.anime_id];
        }

        const data = await fetchJSON(`${API_BASE}/anime/${fav.anime_id}`);
        animeStore[data.anime_id] = data;
        return data;
      })
    );

    container.innerHTML = animeList.map(createCard).join("");
    refreshAllLikeButtons();
    container.style.opacity = "1";
    renderFavoritesPagination(favs.length, perPageCount);
  } catch (err) {
    console.error("Favorites load error:", err);
    container.innerHTML = `<p>Failed to load favorites.</p>`;
  }
}

// =====================================================
// CAROUSEL INSTANCES
// =====================================================
const featuredCarousel = createCarousel({
  url: `${API_BASE}/featured`,
  containerId: "featured",
  intervalTime: 4500,
});

const topRatedCarousel = createCarousel({
  url: `${API_BASE}/top-rated`,
  containerId: "top-rated",
  intervalTime: 5000,
});

const personalizedCarousel = createCarousel({
  url: `${API_BASE}/personalized`,
  containerId: "personalized",
  intervalTime: 4000,
});

// =====================================================
// GLOBAL CLICK HANDLER
// =====================================================
document.addEventListener("click", function (e) {
  const likeBtn = e.target.closest(".like-btn");
  if (likeBtn) {
    e.preventDefault();
    e.stopPropagation();

    const id = Number(likeBtn.dataset.id);

    toggleFavorite({
      anime_id: id,
      title: animeStore[id]?.title || "Unknown",
    });

    refreshAllLikeButtons();

    if (document.getElementById("favorites-grid")) {
      loadFavoritesPage();
    }

    return;
  }

  const addBtn = e.target.closest(".genre-option");
  if (addBtn) {
    addGenre(addBtn.dataset.genre);
    return;
  }

  const removeBtn = e.target.closest(".selected-genre-tag");
  if (removeBtn) {
    removeGenre(removeBtn.dataset.remove);
    return;
  }

  const toggleBtn = e.target.closest(".show-more-btn");
  if (toggleBtn) {
    toggleGenres();
    return;
  }

  const card = e.target.closest(".anime-card");
  if (!card) return;

  const url = new URL(card.href);
  const id = url.searchParams.get("id");
  if (!id) return;

  window.location.href = `anime.html?id=${id}`;
});

// =====================================================
// START APP
// =====================================================
window.onload = function () {
  setupSearch();

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
