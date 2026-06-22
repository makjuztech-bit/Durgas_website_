function openAuthModal() {
  if (currentUser) {
    if (confirm('Sign out of ' + currentUser.full_name + '?')) logoutUser();
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
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.message; return; }
    userToken = data.token;
    currentUser = data.user;
    localStorage.setItem('userToken', userToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuthModal();
    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }
    // Redirect if on dedicated login page
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
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.message; return; }
    userToken = data.token;
    currentUser = data.user;
    localStorage.setItem('userToken', userToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuthModal();
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

function logoutUser() {
  userToken = null;
  currentUser = null;
  localStorage.removeItem('userToken');
  localStorage.removeItem('currentUser');
  updateAccountBtn();
  updateCartBadge(0);
  window.location.href = '/';
}

function updateAccountBtn() {
  const btn = document.getElementById('accountBtn');
  if (!btn) return;
  btn.title = currentUser ? currentUser.full_name : 'Account';
  btn.textContent = currentUser ? '●' : '◎';
}

// Initialize button on load
document.addEventListener('DOMContentLoaded', () => {
  updateAccountBtn();
});
