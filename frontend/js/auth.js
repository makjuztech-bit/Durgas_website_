function openAuthModal() {
  if (currentUser) {
    if (window.location.pathname !== '/profile') window.location.href = '/profile';
    else if (confirm('Sign out of ' + currentUser.full_name + '?')) logoutUser();
    return;
  }
  const overlay = document.getElementById('authOverlay');
  const modal = document.getElementById('authModal');
  if (overlay && modal) {
    overlay.classList.add('open');
    modal.classList.add('open');
    showLoginForm();
  } else {
    // If modal elements don't exist on page, redirect to login page
    window.location.href = '/login';
  }
}

function updateAccountBtn() {
  const button = document.getElementById('accountBtn');
  if (!button) return;
  button.title = currentUser ? 'Profile' : 'Sign in';
  button.setAttribute('aria-label', button.title);
  button.textContent = currentUser ? '◉' : '◎';
}

function closeAuthModal() {
  const overlay = document.getElementById('authOverlay');
  const modal = document.getElementById('authModal');
  if (overlay && modal) {
    overlay.classList.remove('open');
    modal.classList.remove('open');
  }
}

function showLoginForm() {
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  if (loginForm && registerForm) {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  }
}

function showRegisterForm() {
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  if (loginForm && registerForm) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

async function loginUser() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.message; return; }
    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuthModal();
    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }
    if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  } catch (err) {
    if (errEl) errEl.textContent = 'Connection error.';
    console.error(err);
  }
}

async function registerUser() {
  const body = {
    full_name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    password: document.getElementById('regPassword').value,
  };
  const errEl = document.getElementById('regError');
  try {
    const res = await fetch(API + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.message; return; }
    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuthModal();
    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }
    if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  } catch (err) {
    if (errEl) errEl.textContent = 'Connection error.';
    console.error(err);
  }
}

async function logoutUser() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  userToken = null;
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateAccountBtn();
  updateCartBadge(0);
  window.location.href = '/';
}

async function refreshUserProfile() {
  try {
    await fetch(API + '/auth/csrf', { credentials: 'include' });
    const res = await apiFetch('/auth/profile');
    if (!res.ok) throw new Error('Profile refresh failed');
    currentUser = await res.json();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAccountBtn();
  } catch (err) {
    console.warn('Unable to refresh profile:', err.message);
    userToken = null;
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAccountBtn();
  }
}

// Initialize button and profile state on load
document.addEventListener('DOMContentLoaded', async () => {
  await refreshUserProfile();
  updateAccountBtn();
  if (typeof syncCartFromServer === 'function' && currentUser) await syncCartFromServer();
});
