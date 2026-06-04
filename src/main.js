import { createClient } from '@supabase/supabase-js';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const state = {
  movies: [],
  watchlist: [],
  currentMovie: null,
};

const CATEGORIES = ['Trending', 'Popular on Netflix', 'Award-Winning Shows', 'Action Movies', 'Comedies', 'Dramas'];

function init() {
  fetchMovies();
  setupNavScroll();
  setupSearch();
  setupModal();
}

async function fetchMovies() {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('rank', { ascending: true });

  if (error) {
    console.error('Error fetching movies:', error);
    renderFallbackContent();
    return;
  }

  state.movies = data;
  renderHero(data);
  renderMovieRows(data);
}

function renderFallbackContent() {
  const container = document.getElementById('movie-rows');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
}

function renderHero(movies) {
  const trending = movies.filter(m => m.is_trending);
  const heroMovie = trending[Math.floor(Math.random() * trending.length)] || movies[0];
  if (!heroMovie) return;

  const hero = document.getElementById('hero');
  const existingBg = hero.querySelector('.hero-bg');
  if (existingBg) existingBg.remove();

  const img = document.createElement('img');
  img.className = 'hero-bg';
  img.src = heroMovie.backdrop_url;
  img.alt = heroMovie.title;
  hero.insertBefore(img, hero.firstChild);

  document.getElementById('hero-title').textContent = heroMovie.title;
  document.getElementById('hero-description').textContent = heroMovie.description;

  const metaEl = document.getElementById('hero-meta');
  metaEl.innerHTML = `
    <span class="meta-match">${90 + Math.floor(Math.random() * 10)}% Match</span>
    <span class="meta-year">${heroMovie.year}</span>
    <span class="meta-rating">${heroMovie.maturity_rating}</span>
    <span class="meta-seasons">${heroMovie.duration}</span>
  `;

  document.querySelector('.hero-maturity').textContent = heroMovie.maturity_rating;

  document.getElementById('btn-info-hero').addEventListener('click', () => openModal(heroMovie));
  document.getElementById('btn-play-hero').addEventListener('click', () => openModal(heroMovie));
}

function renderMovieRows(movies) {
  const container = document.getElementById('movie-rows');
  container.innerHTML = '';

  CATEGORIES.forEach(category => {
    const categoryMovies = movies.filter(m => m.category === category);
    if (categoryMovies.length === 0) return;

    const row = createMovieRow(category, categoryMovies);
    container.appendChild(row);
  });
}

function createMovieRow(category, movies) {
  const row = document.createElement('div');
  row.className = `movie-row${category === 'Trending' ? ' trending-row' : ''}`;

  const title = document.createElement('h2');
  title.className = 'row-title';
  title.textContent = category;
  row.appendChild(title);

  const slider = document.createElement('div');
  slider.className = 'row-slider';

  const track = document.createElement('div');
  track.className = 'row-track';

  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, category === 'Trending' ? index + 1 : null);
    track.appendChild(card);
  });

  const leftArrow = document.createElement('button');
  leftArrow.className = 'slider-arrow slider-arrow-left';
  leftArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
  leftArrow.addEventListener('click', () => scrollTrack(track, -1));

  const rightArrow = document.createElement('button');
  rightArrow.className = 'slider-arrow slider-arrow-right';
  rightArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';
  rightArrow.addEventListener('click', () => scrollTrack(track, 1));

  slider.appendChild(track);
  slider.appendChild(leftArrow);
  slider.appendChild(rightArrow);
  row.appendChild(slider);

  return row;
}

function createMovieCard(movie, trendingNumber) {
  const card = document.createElement('div');
  card.className = 'movie-card';

  const matchPercent = 85 + Math.floor(Math.random() * 15);

  card.innerHTML = `
    ${trendingNumber ? `<span class="trending-number">${trendingNumber}</span>` : ''}
    <img class="movie-card-img" src="${movie.poster_url}" alt="${movie.title}" loading="lazy" />
    <div class="movie-card-info">
      <div class="movie-card-title">${movie.title}</div>
      <div class="movie-card-meta">
        <span class="card-match">${matchPercent}% Match</span>
        <span class="card-rating">${movie.maturity_rating}</span>
        <span class="card-year">${movie.year}</span>
      </div>
      <div class="movie-card-actions">
        <button class="btn-play-small" aria-label="Play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="btn-circle btn-add-card" data-movie-id="${movie.id}" aria-label="Add to My List">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <button class="btn-circle btn-like-card" aria-label="Like">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-play-small')) {
      openModal(movie);
      return;
    }
    if (e.target.closest('.btn-add-card')) {
      toggleWatchlist(movie, e.target.closest('.btn-add-card'));
      return;
    }
    if (e.target.closest('.btn-like-card')) {
      const btn = e.target.closest('.btn-like-card');
      btn.classList.toggle('added');
      return;
    }
    openModal(movie);
  });

  return card;
}

function scrollTrack(track, direction) {
  const scrollAmount = track.clientWidth * 0.75;
  track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

function toggleWatchlist(movie, btn) {
  const idx = state.watchlist.indexOf(movie.id);
  if (idx > -1) {
    state.watchlist.splice(idx, 1);
    btn.classList.remove('added');
  } else {
    state.watchlist.push(movie.id);
    btn.classList.add('added');
  }
}

function setupNavScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function setupSearch() {
  const searchBtn = document.querySelector('.search-btn');
  const overlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const closeBtn = overlay.querySelector('.close-search');
  const resultsContainer = document.getElementById('search-results');

  searchBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    searchInput.focus();
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    searchInput.value = '';
    resultsContainer.innerHTML = '';
  });

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = searchInput.value.trim().toLowerCase();
      if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
      }
      const results = state.movies.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
      renderSearchResults(results, resultsContainer);
    }, 300);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      searchInput.value = '';
      resultsContainer.innerHTML = '';
    }
  });
}

function renderSearchResults(results, container) {
  if (results.length === 0) {
    container.innerHTML = '<p style="color: #808080; padding: 24px;">No results found.</p>';
    return;
  }

  container.innerHTML = '';
  results.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'search-result-card';
    card.innerHTML = `
      <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy" />
      <div class="search-result-info">
        <h3>${movie.title}</h3>
        <span>${movie.year} &middot; ${movie.maturity_rating} &middot; ${movie.category}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      document.getElementById('search-overlay').classList.add('hidden');
      document.getElementById('search-input').value = '';
      container.innerHTML = '';
      openModal(movie);
    });
    container.appendChild(card);
  });
}

function setupModal() {
  const modal = document.getElementById('movie-modal');
  const backdrop = modal.querySelector('.modal-backdrop');
  const closeBtn = modal.querySelector('.modal-close');
  const addListBtn = document.getElementById('btn-add-list');
  const likeBtn = document.getElementById('btn-like');

  backdrop.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);

  addListBtn.addEventListener('click', () => {
    if (state.currentMovie) {
      toggleWatchlist(state.currentMovie, addListBtn);
    }
  });

  likeBtn.addEventListener('click', () => {
    likeBtn.classList.toggle('added');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

function openModal(movie) {
  state.currentMovie = movie;
  const modal = document.getElementById('movie-modal');

  document.getElementById('modal-backdrop').src = movie.backdrop_url;
  document.getElementById('modal-backdrop').alt = movie.title;
  document.getElementById('modal-title').textContent = movie.title;
  document.getElementById('modal-match').textContent = `${90 + Math.floor(Math.random() * 10)}% Match`;
  document.getElementById('modal-year').textContent = movie.year;
  document.getElementById('modal-maturity').textContent = movie.maturity_rating;
  document.getElementById('modal-duration').textContent = movie.duration;
  document.getElementById('modal-description').textContent = movie.description;

  const addListBtn = document.getElementById('btn-add-list');
  if (state.watchlist.includes(movie.id)) {
    addListBtn.classList.add('added');
  } else {
    addListBtn.classList.remove('added');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-content').scrollTop = 0;
}

function closeModal() {
  const modal = document.getElementById('movie-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  state.currentMovie = null;
}

init();
