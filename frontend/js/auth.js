// ============================================================================
// DURGAS FIVE METAL JEWELLERY — PATRON AUTHENTICATION & ACCOUNT CONTROLLER
// ============================================================================

let otpResendTimer = null;
let resetOtpTimer = null;

// Utility: Normalize mobile or email
function parseIdentifier(input) {
  const val = String(input || '').trim();
  const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const digits = val.replace(/\D/g, '');
  const isMobile = !isMail && digits.length >= 10;
  return { val, isMail, isMobile, mobile10: digits.slice(-10) };
}

// Safe Auth Fetch Helper with dynamic API base, automatic retry, and non-crashing JSON parse
async function safeAuthFetch(endpoint, options = {}, retries = 1) {
  const base = (typeof API !== 'undefined' && API)
    ? API
    : ((typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL.replace(/\/+$/, '') : 'https://durgas-backend.onrender.com') + '/api';

  try {
    const res = await fetch(base + endpoint, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let data = {};
    try {
      data = await res.json();
    } catch (parseErr) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        data = { message: 'Server is starting up. Please wait 10 seconds and try again.' };
      } else {
        data = { message: res.ok ? 'Success' : `Server returned status ${res.status}.` };
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (netErr) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1800));
      return safeAuthFetch(endpoint, options, retries - 1);
    }
    return {
      ok: false,
      status: 0,
      data: { message: 'Unable to reach the server. Please check your internet connection or try again in a moment.' }
    };
  }
}

// ----------------------------------------------------------------------------
// MODAL & NAVIGATION CONTROLS
// ----------------------------------------------------------------------------
function openAuthModal() {
  if (currentUser) {
    const dropdown = document.getElementById('patronDropdown');
    if (dropdown) {
      const isOpen = dropdown.classList.contains('open') || dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      dropdown.classList.toggle('open', !isOpen);
      return;
    }
    window.location.href = '/profile';
    return;
  }

  const overlay = document.getElementById('authOverlay');
  const modal = document.getElementById('authModal');
  const hasFullModal = Boolean(document.getElementById('mainTabLogin') && document.getElementById('authSectionLogin'));
  if (overlay && modal && hasFullModal) {
    overlay.classList.add('open');
    modal.classList.add('open');
    overlay.style.display = 'block';
    modal.style.display = 'block';
    switchAuthMainTab('login');
  } else {
    // If full modal elements don't exist on this page, navigate to dedicated login portal
    window.location.href = '/login';
  }
}

function closeAuthModal() {
  const overlay = document.getElementById('authOverlay');
  const modal = document.getElementById('authModal');
  if (overlay && modal) {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    overlay.style.display = 'none';
    modal.style.display = 'none';
  }
}

function updateAccountBtn() {
  const button = document.getElementById('accountBtn');
  if (!button) return;

  // Ensure parent has position:relative for dropdown positioning
  let parent = button.parentElement;
  if (parent && !parent.classList.contains('patron-menu-wrap')) {
    parent.classList.add('patron-menu-wrap');
  }

  let ddWrap = document.getElementById('patronDropdown');

  if (currentUser) {
    const firstName = (currentUser.full_name || 'Account').split(' ')[0];
    button.title = `Signed in as ${currentUser.full_name || 'Customer'}`;
    button.setAttribute('aria-label', button.title);
    button.className = 'nav-user-chip';
    button.innerHTML = `👤 ${firstName} <span style="font-size:0.65em;margin-left:3px;opacity:0.8;">▼</span>`;

    // Ensure dropdown exists
    if (!ddWrap && parent) {
      ddWrap = document.createElement('div');
      ddWrap.className = 'patron-dropdown';
      ddWrap.id = 'patronDropdown';
      ddWrap.style.display = 'none';
      ddWrap.innerHTML = `
        <div class="patron-dropdown-header">
          <div class="patron-dropdown-name" id="patronDropdownName">${currentUser.full_name || 'My Account'}</div>
          <div class="patron-dropdown-email" id="patronDropdownEmail">${currentUser.email || currentUser.phone || ''}</div>
        </div>
        <a href="/profile" class="patron-dropdown-link">🛍️ My Orders &amp; Profile</a>
        <a href="javascript:void(0)" onclick="openWishlist()" class="patron-dropdown-link">♡ My Wishlist</a>
        <a href="/cart" class="patron-dropdown-link">🛒 Shopping Bag</a>
        <button type="button" onclick="logoutUser()" class="patron-dropdown-link" style="color:#c0392b; border-top:1px solid #F0EAE1;">🚪 Sign Out</button>
      `;
      parent.appendChild(ddWrap);
    }

    const ddName = document.getElementById('patronDropdownName');
    const ddEmail = document.getElementById('patronDropdownEmail');
    if (ddName) ddName.textContent = currentUser.full_name || 'My Account';
    if (ddEmail) ddEmail.textContent = currentUser.email || currentUser.phone || '';

    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (ddWrap) {
        const isOpen = ddWrap.classList.contains('open') || ddWrap.style.display === 'block';
        ddWrap.style.display = isOpen ? 'none' : 'block';
        ddWrap.classList.toggle('open', !isOpen);
      } else {
        window.location.href = '/profile';
      }
    };
  } else {
    button.title = 'Sign In to DURGAS';
    button.setAttribute('aria-label', button.title);
    button.className = 'nav-auth-btn';
    button.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Sign In</span>`;

    if (ddWrap) {
      ddWrap.classList.remove('open');
      ddWrap.style.display = 'none';
    }

    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAuthModal();
    };
  }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const ddWrap = document.getElementById('patronDropdown');
  const btn = document.getElementById('accountBtn');
  if (ddWrap && (ddWrap.classList.contains('open') || ddWrap.style.display === 'block')) {
    if (!ddWrap.contains(e.target) && (!btn || !btn.contains(e.target))) {
      ddWrap.classList.remove('open');
      ddWrap.style.display = 'none';
    }
  }
});


// ----------------------------------------------------------------------------
// TAB SWITCHING (Main tabs: Login, Register, Help)
// ----------------------------------------------------------------------------
function switchAuthMainTab(tab) {
  const tabLogin = document.getElementById('mainTabLogin');
  const tabReg = document.getElementById('mainTabRegister');
  const tabHelp = document.getElementById('mainTabHelp');

  const secLogin = document.getElementById('authSectionLogin');
  const secReg = document.getElementById('authSectionRegister');
  const secHelp = document.getElementById('authSectionHelp');

  // Reset alerts
  hideAlerts();

  if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
  if (tabReg) tabReg.classList.toggle('active', tab === 'register');
  if (tabHelp) tabHelp.classList.toggle('active', tab === 'help');

  if (secLogin) secLogin.style.display = tab === 'login' ? 'block' : 'none';
  if (secReg) secReg.style.display = tab === 'register' ? 'block' : 'none';
  if (secHelp) secHelp.style.display = tab === 'help' ? 'block' : 'none';
}

function showLoginForm() {
  if (document.getElementById('mainTabLogin')) {
    switchAuthMainTab('login');
  } else {
    window.location.href = '/login';
  }
}
function showRegisterForm() {
  if (document.getElementById('mainTabRegister')) {
    switchAuthMainTab('register');
  } else {
    window.location.href = '/register';
  }
}

// Subtab switcher for Login (Password vs OTP)
function switchLoginTab(mode) {
  const pwdMode = document.getElementById('modePasswordLogin');
  const otpMode = document.getElementById('modeOtpLogin');
  const tabBtnPwd = document.getElementById('tabBtnPassword');
  const tabBtnOtp = document.getElementById('tabBtnOtp');

  hideAlerts();

  if (mode === 'otp') {
    if (pwdMode) pwdMode.style.display = 'none';
    if (otpMode) otpMode.style.display = 'block';
    if (tabBtnPwd) tabBtnPwd.classList.remove('active');
    if (tabBtnOtp) tabBtnOtp.classList.add('active');

    // Auto-sync identifier across tabs
    const pwdIdent = document.getElementById('authEmail')?.value || '';
    const otpIdent = document.getElementById('otpEmail');
    if (pwdIdent && otpIdent && !otpIdent.value) {
      otpIdent.value = pwdIdent;
    }
  } else {
    if (pwdMode) pwdMode.style.display = 'block';
    if (otpMode) otpMode.style.display = 'none';
    if (tabBtnOtp) tabBtnOtp.classList.remove('active');
    if (tabBtnPwd) tabBtnPwd.classList.add('active');
  }
}

// Subtab switcher for Help (Forgot Password vs Forgot Email)
function switchHelpTab(mode) {
  const fpMode = document.getElementById('modeForgotPassword');
  const feMode = document.getElementById('modeForgotEmail');
  const tabFp = document.getElementById('tabBtnForgotPwd');
  const tabFe = document.getElementById('tabBtnForgotEmail');

  hideAlerts();

  if (mode === 'forgot-email') {
    if (fpMode) fpMode.style.display = 'none';
    if (feMode) feMode.style.display = 'block';
    if (tabFp) tabFp.classList.remove('active');
    if (tabFe) tabFe.classList.add('active');
  } else {
    if (fpMode) fpMode.style.display = 'block';
    if (feMode) feMode.style.display = 'none';
    if (tabFe) tabFe.classList.remove('active');
    if (tabFp) tabFp.classList.add('active');
  }
}

// ----------------------------------------------------------------------------
// PASSWORD VISIBILITY TOGGLE
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ALERT NOTIFICATIONS
// ----------------------------------------------------------------------------
function showLoginAlert(msg, isSuccess = false) {
  showAlert('loginStatusAlert', msg, isSuccess);
}

function showAlert(elementId, msg, isSuccess = false) {
  const alertEl = document.getElementById(elementId) ||
                  document.getElementById(elementId === 'regStatusAlert' ? 'regStatusAlert' : 'loginStatusAlert') ||
                  document.getElementById('loginStatusAlert') ||
                  document.getElementById('regStatusAlert');

  if (alertEl) {
    alertEl.style.display = 'block';
    alertEl.textContent = msg;
    if (isSuccess) {
      alertEl.className = 'auth-status-alert success';
      alertEl.style.background = '#eafaf1';
      alertEl.style.color = '#1e824c';
      alertEl.style.border = '1px solid #a3e4d7';
    } else {
      alertEl.className = 'auth-status-alert error';
      alertEl.style.background = '#fdedec';
      alertEl.style.color = '#c0392b';
      alertEl.style.border = '1px solid #f5b7b1';
    }
  }

  // Also populate legacy error elements if present
  const legacyId = elementId === 'regStatusAlert' ? 'regError' : (elementId === 'helpStatusAlert' ? 'helpError' : 'authError');
  const legacyEl = document.getElementById(legacyId);
  if (legacyEl) {
    legacyEl.textContent = msg;
    legacyEl.style.display = 'block';
    legacyEl.style.color = isSuccess ? '#1e824c' : '#c0392b';
  }
}

function hideAlerts() {
  document.querySelectorAll('.auth-status-alert').forEach(el => el.style.display = 'none');
  const legacyErr = document.getElementById('authError');
  if (legacyErr) { legacyErr.textContent = ''; legacyErr.style.display = 'none'; }
  const regErr = document.getElementById('regError');
  if (regErr) { regErr.textContent = ''; regErr.style.display = 'none'; }
  const helpErr = document.getElementById('helpError');
  if (helpErr) { helpErr.textContent = ''; helpErr.style.display = 'none'; }
}

// ----------------------------------------------------------------------------
// 1. PASSWORD SIGN-IN (Email or 10-Digit Mobile Number)
// ----------------------------------------------------------------------------
function handlePasswordLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  loginUser();
}

async function loginUser() {
  const identEl = document.getElementById('authEmail') || document.getElementById('authIdentifier');
  const passEl = document.getElementById('authPassword');
  const btn = document.getElementById('btnSubmitPassword');

  const rawIdent = (identEl?.value || '').trim();
  const password = passEl?.value || '';

  if (!rawIdent) {
    showLoginAlert('Please enter your email address or 10-digit mobile number.');
    identEl?.focus();
    return;
  }
  if (!password) {
    showLoginAlert('Please enter your password.');
    passEl?.focus();
    return;
  }

  const { isMail, isMobile, mobile10 } = parseIdentifier(rawIdent);
  if (!isMail && !isMobile) {
    showLoginAlert('Please enter a valid email address or 10-digit mobile number.');
    identEl?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Signing In...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: isMail ? rawIdent : undefined,
        phone: isMobile ? mobile10 : undefined,
        identifier: rawIdent,
        email_or_phone: rawIdent,
        password
      }),
    });

    if (!ok) {
      showLoginAlert(data.message || 'Invalid credentials. Please check your password or sign in with OTP.');
      return;
    }

    showLoginAlert('✓ Sign-in successful! Welcome, ' + (data.user?.full_name || 'Patron') + '.', true);
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
        window.location.href = '/staff-portal';
      } else if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, 600);
  } catch (err) {
    console.error(err);
    showLoginAlert(err.message || 'Connection error. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In with Password</span>';
    }
  }
}

// ----------------------------------------------------------------------------
// 2. INSTANT OTP SIGN-IN (Email or 10-Digit Mobile Number)
// ----------------------------------------------------------------------------
async function sendLoginOtp() {
  const inputEl = document.getElementById('otpEmail') || document.getElementById('otpIdentifier');
  const btn = document.getElementById('btnSendOtp');
  const otpGroup = document.getElementById('otpInputGroup');
  const verifyBtn = document.getElementById('btnVerifyOtp');
  const badgeEl = document.getElementById('simulatedOtpBadge');

  const rawIdent = (inputEl?.value || '').trim();
  const { isMail, isMobile, mobile10 } = parseIdentifier(rawIdent);

  if (!isMail && !isMobile) {
    showLoginAlert('Please enter a valid email address or 10-digit mobile number to receive OTP.');
    inputEl?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Sending...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: isMobile ? mobile10 : rawIdent,
        email: isMail ? rawIdent : undefined,
        phone: isMobile ? mobile10 : undefined,
        purpose: 'login'
      })
    });

    if (!ok) {
      showLoginAlert(data.message || 'Failed to send OTP.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
      return;
    }

    const destName = isMail ? rawIdent : `mobile +91-${mobile10}`;
    showLoginAlert(`✓ A 6-digit verification code has been dispatched to ${destName}. Please check your inbox and enter the code below.`, true);

    if (otpGroup) otpGroup.style.display = 'block';
    if (verifyBtn) verifyBtn.style.display = 'block';

    const otpInput = document.getElementById('otpCode');
    if (otpInput) {
      otpInput.value = '';
      otpInput.focus();
    }
    if (badgeEl) {
      badgeEl.style.display = 'none';
      badgeEl.innerHTML = '';
    }

    // Start 30s countdown
    let remaining = 30;
    const countdownEl = document.getElementById('otpCountdownText');
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
    showLoginAlert('Network error while requesting OTP. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
  }
}

async function handleOtpSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inputEl = document.getElementById('otpEmail') || document.getElementById('otpIdentifier');
  const otpInput = document.getElementById('otpCode');
  const verifyBtn = document.getElementById('btnVerifyOtp');

  const rawIdent = (inputEl?.value || '').trim();
  const otp = (otpInput?.value || '').trim();

  if (!rawIdent) {
    showLoginAlert('Please enter your email address or mobile number.');
    return;
  }
  if (!otp || otp.length !== 6) {
    showLoginAlert('Please enter the complete 6-digit OTP code.');
    otpInput?.focus();
    return;
  }

  const { isMobile, mobile10 } = parseIdentifier(rawIdent);

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span>Verifying OTP...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: isMobile ? mobile10 : rawIdent,
        otp,
        purpose: 'login'
      })
    });

    if (!ok) {
      showLoginAlert(data.message || 'OTP verification failed.');
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<span>Verify OTP &amp; Sign In</span>';
      }
      return;
    }

    showLoginAlert('✓ Verification successful! Signing in...', true);
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
        window.location.href = '/staff-portal';
      } else if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, 600);

  } catch (err) {
    console.error(err);
    showLoginAlert('Connection error while verifying OTP.');
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<span>Verify OTP &amp; Sign In</span>';
    }
  }
}

// ----------------------------------------------------------------------------
function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  registerUser(e);
}

async function registerUser(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const phoneEl = document.getElementById('regPhone');
  const passEl = document.getElementById('regPassword');
  const regBtn = document.getElementById('btnSubmitRegister');

  const full_name = (nameEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const password = passEl?.value || '';

  if (!full_name) {
    showAlert('regStatusAlert', 'Please enter your full name.');
    nameEl?.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert('regStatusAlert', 'Please enter a valid email address.');
    emailEl?.focus();
    return;
  }
  const digits = phone.replace(/\D/g, '');
  if (digits && digits.length < 10) {
    showAlert('regStatusAlert', 'Please enter a valid 10-digit mobile number.');
    phoneEl?.focus();
    return;
  }
  if (!password || password.length < 8) {
    showAlert('regStatusAlert', 'Password must be at least 8 characters long.');
    passEl?.focus();
    return;
  }

  if (regBtn) {
    regBtn.disabled = true;
    regBtn.innerHTML = '<span>Creating Account...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name,
        name: full_name,
        email,
        phone: digits ? digits.slice(-10) : undefined,
        password
      }),
    });

    if (!ok) {
      showAlert('regStatusAlert', data.message || 'Registration failed. Please check your details and try again.');
      return;
    }

    showAlert('regStatusAlert', '✓ Account created successfully! Signing in...', true);
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

    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  } catch (err) {
    showAlert('regStatusAlert', err.message || 'Connection error. Please try again.');
    console.error(err);
  } finally {
    if (regBtn) {
      regBtn.disabled = false;
      regBtn.innerHTML = '<span>Create Patron Account</span>';
    }
  }
}

// ----------------------------------------------------------------------------
// 4. FORGOT PASSWORD (OTP Verification & Password Reset)
// ----------------------------------------------------------------------------
async function sendResetOtp() {
  const inputEl = document.getElementById('resetTarget');
  const btn = document.getElementById('btnSendResetOtp');
  const resetGroup = document.getElementById('resetPasswordGroup');
  const submitBtn = document.getElementById('btnSubmitReset');
  const badgeEl = document.getElementById('resetOtpBadge');

  const rawIdent = (inputEl?.value || '').trim();
  const { isMail, isMobile, mobile10 } = parseIdentifier(rawIdent);

  if (!isMail && !isMobile) {
    showAlert('helpStatusAlert', 'Please enter a valid email address or 10-digit mobile number.');
    inputEl?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Sending...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: isMobile ? mobile10 : rawIdent,
        purpose: 'reset'
      })
    });

    if (!ok) {
      showAlert('helpStatusAlert', data.message || 'Failed to send reset code.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
      return;
    }

    const destName = isMail ? rawIdent : `mobile +91-${mobile10}`;
    showAlert('helpStatusAlert', `✓ A 6-digit password reset code has been sent to ${destName}. Please check your inbox and enter the code below.`, true);

    if (resetGroup) resetGroup.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'block';

    const codeInput = document.getElementById('resetOtpCode');
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
    if (badgeEl) {
      badgeEl.style.display = 'none';
      badgeEl.innerHTML = '';
    }

  } catch (err) {
    console.error(err);
    showAlert('helpStatusAlert', 'Network error. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Send OTP</span>';
    }
  }
}

async function handleResetPasswordSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inputEl = document.getElementById('resetTarget');
  const otpEl = document.getElementById('resetOtpCode');
  const newPassEl = document.getElementById('resetNewPassword');
  const submitBtn = document.getElementById('btnSubmitReset');

  const rawIdent = (inputEl?.value || '').trim();
  const otp = (otpEl?.value || '').trim();
  const new_password = newPassEl?.value || '';

  if (!rawIdent) {
    showAlert('helpStatusAlert', 'Please enter your registered email or mobile number.');
    return;
  }
  if (!otp || otp.length !== 6) {
    showAlert('helpStatusAlert', 'Please enter the 6-digit OTP code.');
    otpEl?.focus();
    return;
  }
  if (!new_password || new_password.length < 8) {
    showAlert('helpStatusAlert', 'New password must be at least 8 characters long.');
    newPassEl?.focus();
    return;
  }

  const { isMobile, mobile10 } = parseIdentifier(rawIdent);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Resetting Password...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: isMobile ? mobile10 : rawIdent,
        otp,
        purpose: 'reset',
        new_password
      })
    });

    if (!ok) {
      showAlert('helpStatusAlert', data.message || 'Password reset failed.');
      return;
    }

    showAlert('helpStatusAlert', '✓ Password reset successful! Redirecting to sign in...', true);
    setTimeout(() => {
      switchAuthMainTab('login');
      switchLoginTab('password');
      const pwdIdent = document.getElementById('authEmail');
      if (pwdIdent) pwdIdent.value = rawIdent;
      const pwdInput = document.getElementById('authPassword');
      if (pwdInput) {
        pwdInput.value = new_password;
        pwdInput.focus();
      }
      showLoginAlert('✓ Password updated! Click "Sign In with Password" to continue.', true);
    }, 1200);

  } catch (err) {
    console.error(err);
    showAlert('helpStatusAlert', err.message || 'Connection error. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Update Password &amp; Sign In</span>';
    }
  }
}

// ----------------------------------------------------------------------------
// 5. FORGOT EMAIL (Account Lookup via 10-Digit Mobile Number)
// ----------------------------------------------------------------------------
async function handleLookupEmail(e) {
  if (e && e.preventDefault) e.preventDefault();
  const phoneEl = document.getElementById('lookupPhone');
  const resultCard = document.getElementById('lookupResultCard');
  const btn = document.getElementById('btnLookupEmail');

  const rawPhone = (phoneEl?.value || '').trim();
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length < 10) {
    showAlert('helpStatusAlert', 'Please enter a valid 10-digit mobile number.');
    phoneEl?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Searching...</span>';
  }

  try {
    const { ok, data } = await safeAuthFetch('/auth/lookup', {
      method: 'POST',
      body: JSON.stringify({ phone: digits.slice(-10) })
    });

    if (!ok) {
      showAlert('helpStatusAlert', data.message || 'No registered account found for this mobile number.');
      if (resultCard) resultCard.style.display = 'none';
      return;
    }

    showAlert('helpStatusAlert', '✓ Registered account located successfully!', true);
    if (resultCard) {
      resultCard.style.display = 'block';
      const nameEl = document.getElementById('lookupResultName');
      const emailEl = document.getElementById('lookupResultEmail');
      if (nameEl) nameEl.textContent = data.full_name || 'Customer';
      if (emailEl) emailEl.textContent = data.masked_email || data.email || '';
    }

  } catch (err) {
    console.error(err);
    showAlert('helpStatusAlert', 'Error contacting server. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Find Registered Email</span>';
    }
  }
}

function useFoundEmailToLogin() {
  const emailEl = document.getElementById('lookupResultEmail');
  const email = emailEl?.textContent || '';
  switchAuthMainTab('login');
  switchLoginTab('otp');
  const otpInput = document.getElementById('otpEmail');
  if (otpInput && email && !email.includes('***')) {
    otpInput.value = email;
  }
}

// ----------------------------------------------------------------------------
// 6. LOGOUT & PROFILE REFRESH
// ----------------------------------------------------------------------------
async function logoutUser() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  userToken = null;
  currentUser = null;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userToken');
  localStorage.removeItem('adminToken');
  updateAccountBtn();
  updateCartBadge(0);
  window.location.href = '/';
}

async function refreshUserProfile() {
  if (!userToken && !currentUser) {
    updateAccountBtn();
    return;
  }
  try {
    await fetch(API + '/auth/csrf', { credentials: 'include' }).catch(() => {});
    const res = await apiFetch('/auth/profile');
    if (res.status === 401 || res.status === 403) {
      userToken = null;
      currentUser = null;
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userToken');
      updateAccountBtn();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      if (data && (data.id || data.user_id || data.email)) {
        currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      updateAccountBtn();
    }
  } catch (err) {
    console.warn('Network notice during profile check:', err.message);
    updateAccountBtn();
  }
}

function copyChatbotLoginFormat() {
  const textToCopy = `DURGAS FIVE METAL JEWELLERY - LOGIN CREDENTIALS & ACCESS
=========================================================
Website: http://localhost:5000/
1. PASSWORD LOGIN:
   • Email: admin@durgas.com (or registered mobile)
   • Password: admin123456

2. INSTANT OTP LOGIN:
   • Any customer email or 10-digit mobile number!
   • Click "Send OTP" -> Instant 6-digit code auto-fills immediately.

3. ACCOUNT RECOVERY:
   • Forgot Password: Reset with OTP in seconds.
   • Forgot Email: Enter 10-digit mobile number to recover registered email.
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

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  await refreshUserProfile();
  updateAccountBtn();
  if (typeof syncCartFromServer === 'function' && currentUser) await syncCartFromServer();
});
