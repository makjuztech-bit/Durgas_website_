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

function switchLoginTab(mode) {
  const pwdMode = document.getElementById('modePasswordLogin');
  const otpMode = document.getElementById('modeOtpLogin');
  const tabBtnPwd = document.getElementById('tabBtnPassword');
  const tabBtnOtp = document.getElementById('tabBtnOtp');
  const alertEl = document.getElementById('loginStatusAlert');
  const errEl = document.getElementById('authError');

  if (alertEl) alertEl.style.display = 'none';
  if (errEl) errEl.textContent = '';

  if (mode === 'otp') {
    if (pwdMode) pwdMode.style.display = 'none';
    if (otpMode) otpMode.style.display = 'block';
    if (tabBtnPwd) {
      tabBtnPwd.style.background = 'transparent';
      tabBtnPwd.style.color = '#666';
      tabBtnPwd.style.boxShadow = 'none';
    }
    if (tabBtnOtp) {
      tabBtnOtp.style.background = '#fff';
      tabBtnOtp.style.color = 'var(--maroon, #6B1D2F)';
      tabBtnOtp.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      tabBtnOtp.style.fontWeight = '600';
    }
    // Sync email if entered in password tab
    const pwdEmail = document.getElementById('authEmail')?.value;
    const otpEmail = document.getElementById('otpEmail');
    if (pwdEmail && otpEmail && !otpEmail.value) {
      otpEmail.value = pwdEmail;
    }
  } else {
    if (pwdMode) pwdMode.style.display = 'block';
    if (otpMode) otpMode.style.display = 'none';
    if (tabBtnOtp) {
      tabBtnOtp.style.background = 'transparent';
      tabBtnOtp.style.color = '#666';
      tabBtnOtp.style.boxShadow = 'none';
    }
    if (tabBtnPwd) {
      tabBtnPwd.style.background = '#fff';
      tabBtnPwd.style.color = 'var(--maroon, #6B1D2F)';
      tabBtnPwd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      tabBtnPwd.style.fontWeight = '600';
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) {
      btn.textContent = 'HIDE';
      btn.setAttribute('aria-label', 'Hide Password');
    }
  } else {
    input.type = 'password';
    if (btn) {
      btn.textContent = 'SHOW';
      btn.setAttribute('aria-label', 'Show Password');
    }
  }
}

function showLoginAlert(msg, isSuccess = false) {
  const alertEl = document.getElementById('loginStatusAlert');
  if (!alertEl) return;
  alertEl.style.display = 'block';
  alertEl.textContent = msg;
  if (isSuccess) {
    alertEl.style.background = '#eafaf1';
    alertEl.style.color = '#1e824c';
    alertEl.style.border = '1px solid #a3e4d7';
  } else {
    alertEl.style.background = '#fdedec';
    alertEl.style.color = '#c0392b';
    alertEl.style.border = '1px solid #f5b7b1';
  }
}

function handlePasswordLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  loginUser();
}

let otpResendTimer = null;

async function sendLoginOtp() {
  const emailInput = document.getElementById('otpEmail');
  const btn = document.getElementById('btnSendOtp');
  const otpGroup = document.getElementById('otpInputGroup');
  const verifyBtn = document.getElementById('btnVerifyOtp');
  const badgeEl = document.getElementById('simulatedOtpBadge');
  const errEl = document.getElementById('authError');

  if (errEl) errEl.textContent = '';
  const email = (emailInput?.value || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginAlert('Please enter a valid email address.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Sending...</span>';
  }

  try {
    const res = await fetch(API + '/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'login' })
    });
    const data = await res.json();
    if (!res.ok) {
      showLoginAlert(data.message || 'Failed to send OTP.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
      return;
    }

    const activeOtp = data.otp || data.simulatedOtp;
    if (activeOtp) {
      showLoginAlert(`✓ OTP Generated: ${activeOtp} (Auto-filled below). Click "Verify OTP & Sign In" to continue.`, true);
    } else {
      showLoginAlert(`✓ Verification OTP dispatched to ${email}. Valid for 10 minutes.`, true);
    }

    if (otpGroup) otpGroup.style.display = 'block';
    if (verifyBtn) verifyBtn.style.display = 'block';

    const otpInput = document.getElementById('otpCode');
    if (otpInput) {
      if (activeOtp) {
        otpInput.value = activeOtp;
      }
      otpInput.focus();
      if (badgeEl && activeOtp) {
        badgeEl.style.display = 'block';
        badgeEl.innerHTML = `<strong>✨ Instant Verification Code:</strong> <span style="font-size:1.2rem;font-weight:700;letter-spacing:4px;color:#6B1D2F;">${activeOtp}</span> (Auto-filled!)`;
      }
    }

    // Start 30s resend countdown
    let remaining = 30;
    const countdownEl = document.getElementById('otpCountdownText');
    if (btn) btn.disabled = true;
    clearInterval(otpResendTimer);
    otpResendTimer = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = `Resend in ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(otpResendTimer);
        if (countdownEl) countdownEl.textContent = '';
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Resend OTP</span>';
        }
      }
    }, 1000);

  } catch (err) {
    console.error(err);
    showLoginAlert('Network or server connection error. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
  }
}

async function handleOtpSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email = (document.getElementById('otpEmail')?.value || '').trim();
  const otp = (document.getElementById('otpCode')?.value || '').trim();
  const verifyBtn = document.getElementById('btnVerifyOtp');

  if (!email || !otp || otp.length !== 6) {
    showLoginAlert('Please enter the full 6-digit OTP code.');
    return;
  }

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span>Verifying OTP...</span>';
  }

  try {
    const res = await fetch(API + '/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    if (!res.ok) {
      showLoginAlert(data.message || 'OTP verification failed.');
      if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>Verify OTP &amp; Sign In</span>'; }
      return;
    }

    showLoginAlert('✓ Verification successful! Redirecting...', true);
    currentUser = data.user;
    userToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (data.token) {
      localStorage.setItem('userToken', data.token);
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superadmin')) {
        localStorage.setItem('adminToken', data.token);
      }
    }
    updateAccountBtn();
    closeAuthModal();

    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }

    setTimeout(() => {
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superadmin')) {
        window.location.href = '/administrator';
      } else if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, 500);

  } catch (err) {
    console.error(err);
    showLoginAlert('Connection error while verifying OTP.');
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>Verify OTP &amp; Sign In</span>'; }
  }
}

function copyChatbotLoginFormat() {
  const textToCopy = `DURGAS FIVE METAL JEWELLERY - LOGIN CREDENTIALS & ACCESS
=========================================================
Website Login Page: http://localhost:5000/login

1. PASSWORD LOGIN:
   • Email Address: admin@durgasjewellery.com
   • Password: admin123456

2. EMAIL OTP LOGIN:
   • Email Address: [Any customer or registered email]
   • Action: Click "Send OTP" -> Enter the 6-digit verification code.
   • Features: Instant access, automatic registration for new patrons, zero password hassle.
=========================================================`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    const toast = document.getElementById('copyToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
  }).catch(() => {
    alert('Copied to clipboard:\n\n' + textToCopy);
  });
}

async function loginUser() {
  const emailEl = document.getElementById('authEmail');
  const passwordEl = document.getElementById('authPassword');
  const email = emailEl ? emailEl.value.trim() : '';
  const password = passwordEl ? passwordEl.value : '';
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('btnSubmitPassword');

  if (!email || !password) {
    showLoginAlert('Please enter both email address and password.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Signing In...</span>';
  }

  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showLoginAlert(data.message || 'Invalid email or password.');
      if (errEl) errEl.textContent = data.message;
      return;
    }
    showLoginAlert('✓ Login successful! Redirecting...', true);
    currentUser = data.user;
    userToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (data.token) {
      localStorage.setItem('userToken', data.token);
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superadmin')) {
        localStorage.setItem('adminToken', data.token);
      }
    }
    updateAccountBtn();
    closeAuthModal();
    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }
    setTimeout(() => {
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superadmin')) {
        window.location.href = '/administrator';
      } else if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, 500);
  } catch (err) {
    showLoginAlert('Connection error. Please try again.');
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In with Password</span>';
    }
  }
}

async function registerUser() {
  const nameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const phoneEl = document.getElementById('regPhone');
  const passEl = document.getElementById('regPassword');
  const errEl = document.getElementById('regError');
  const regBtn = document.querySelector('#page-register button.btn-primary');

  const full_name = (nameEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const password = passEl?.value || '';

  if (errEl) {
    errEl.style.color = '#e74c3c';
    errEl.textContent = '';
  }

  if (!full_name) {
    if (errEl) errEl.textContent = 'Please enter your full name.';
    nameEl?.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) errEl.textContent = 'Please enter a valid email address.';
    emailEl?.focus();
    return;
  }
  if (!password || password.length < 8) {
    if (errEl) errEl.textContent = 'Password must be at least 8 characters long.';
    passEl?.focus();
    return;
  }

  if (regBtn) {
    regBtn.disabled = true;
    regBtn.innerHTML = '<span>Creating Account...</span>';
  }

  try {
    const res = await fetch(API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ full_name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (errEl) errEl.textContent = data.message || 'Registration failed.';
      return;
    }

    currentUser = data.user;
    userToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (data.token) {
      localStorage.setItem('userToken', data.token);
    }
    updateAccountBtn();
    closeAuthModal();

    if (typeof syncCartFromServer === 'function') {
      await syncCartFromServer();
    }

    if (errEl) {
      errEl.style.color = '#27ae60';
      errEl.textContent = '✓ Account created successfully! Redirecting...';
    }

    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } catch (err) {
    if (errEl) errEl.textContent = 'Connection error. Please try again.';
    console.error(err);
  } finally {
    if (regBtn) {
      regBtn.disabled = false;
      regBtn.innerHTML = '<span>Register</span>';
    }
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
