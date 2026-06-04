import { createClient } from '@supabase/supabase-js';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const state = {
  movies: [],
  watchlist: [],
  currentMovie: null,
  user: null,
  profile: null,
};

const CATEGORIES = ['Trending', 'Popular on Netflix', 'Award-Winning Shows', 'Action Movies', 'Comedies', 'Dramas'];

function init() {
  setupAuth();
  setupNavScroll();
  setupSearch();
  setupModal();
  fetchMovies();
}

// ===== AUTH =====

function setupAuth() {
  const signInBtn = document.getElementById('btn-sign-in');
  const authOverlay = document.getElementById('auth-overlay');
  const authClose = document.getElementById('auth-close');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const signOutBtn = document.getElementById('btn-sign-out');
  const switchBtns = authOverlay.querySelectorAll('.auth-switch-btn');
  const togglePasswords = authOverlay.querySelectorAll('.toggle-password');

  signInBtn.addEventListener('click', () => showAuthOverlay('login'));

  authClose.addEventListener('click', closeAuthOverlay);

  authOverlay.querySelector('.auth-backdrop').addEventListener('click', closeAuthOverlay);

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.show;
      if (target === 'signup') {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
      } else {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    });
  });

  togglePasswords.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling?.previousElementSibling || btn.parentElement.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  signOutBtn.addEventListener('click', handleSignOut);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authOverlay.classList.contains('hidden')) {
      closeAuthOverlay();
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      if (session?.user) {
        state.user = session.user;
        await fetchProfile(session.user.id);
        updateNavbar(true);
        await fetchWatchlist();
      } else {
        state.user = null;
        state.profile = null;
        state.watchlist = [];
        updateNavbar(false);
      }
    })();
  });

  checkSession();
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    state.user = session.user;
    await fetchProfile(session.user.id);
    updateNavbar(true);
    await fetchWatchlist();
  }
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    state.profile = data;
  }
}

async function ensureProfile(userId, username) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from('profiles')
      .insert({ id: userId, username });
  }

  await fetchProfile(userId);
}

function showAuthOverlay(form) {
  const authOverlay = document.getElementById('auth-overlay');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  document.getElementById('login-error').textContent = '';
  document.getElementById('signup-error').textContent = '';
  loginForm.reset();
  signupForm.reset();

  if (form === 'signup') {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  } else {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  }

  authOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const firstInput = authOverlay.querySelector('.auth-form:not(.hidden) input');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function closeAuthOverlay() {
  const authOverlay = document.getElementById('auth-overlay');
  authOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing In...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = getAuthErrorMessage(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign In';
  closeAuthOverlay();
}

async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errorEl = document.getElementById('signup-error');
  const submitBtn = document.getElementById('signup-submit');

  errorEl.textContent = '';

  if (!username || !email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    errorEl.textContent = getAuthErrorMessage(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign Up';
    return;
  }

  if (data.user) {
    await ensureProfile(data.user.id, username);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign Up';
  closeAuthOverlay();
}

async function handleSignOut() {
  await supabase.auth.signOut();
  state.watchlist = [];
  const dropdown = document.getElementById('profile-dropdown');
  dropdown.classList.remove('open');
}

function getAuthErrorMessage(msg) {
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email address.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  return msg || 'An error occurred. Please try again.';
}

function updateNavbar(isSignedIn) {
  const signInBtn = document.getElementById('btn-sign-in');
  const profileMenu = document.getElementById('profile-menu');
  const dropdownUser = document.getElementById('profile-dropdown-user');

  if (isSignedIn) {
    signInBtn.classList.add('hidden');
    profileMenu.classList.remove('hidden');
    const displayName = state.profile?.username || state.user?.email?.split('@')[0] || 'User';
    dropdownUser.textContent = displayName;
  } else {
    signInBtn.classList.remove('hidden');
    profileMenu.classList.add('hidden');
  }
}

// ===== WATCHLIST (persisted for authenticated users) =====

async function fetchWatchlist() {
  if (!state.user) return;

  const { data } = await supabase
    .from('watchlist')
    .select('movie_id')
    .eq('user_id', state.user.id);

  if (data) {
    state.watchlist = data.map(w => w.movie_id);
    refreshWatchlistButtons();
  }
}

async function toggleWatchlist(movie, btn) {
  if (!state.user) {
    showAuthOverlay('login');
    return;
  }

  const idx = state.watchlist.indexOf(movie.id);

  if (idx > -1) {
    state.watchlist.splice(idx, 1);
    btn.classList.remove('added');
    await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', state.user.id)
      .eq('movie_id', movie.id);
  } else {
    state.watchlist.push(movie.id);
    btn.classList.add('added');
    await supabase
      .from('watchlist')
      .insert({ user_id: state.user.id, movie_id: movie.id });
  }
}

function refreshWatchlistButtons() {
  document.querySelectorAll('.btn-add-card').forEach(btn => {
    const movieId = btn.dataset.movieId;
    if (state.watchlist.includes(movieId)) {
      btn.classList.add('added');
    } else {
      btn.classList.remove('added');
    }
  });

  const addListBtn = document.getElementById('btn-add-list');
  if (addListBtn && state.currentMovie) {
    if (state.watchlist.includes(state.currentMovie.id)) {
      addListBtn.classList.add('added');
    } else {
      addListBtn.classList.remove('added');
    }
  }
}

// ===== MOVIES =====

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
  const isInWatchlist = state.watchlist.includes(movie.id);

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
        <button class="btn-circle btn-add-card${isInWatchlist ? ' added' : ''}" data-movie-id="${movie.id}" aria-label="Add to My List">
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

// ===== NAV SCROLL =====

function setupNavScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== SEARCH =====

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

// ===== MODAL =====

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
