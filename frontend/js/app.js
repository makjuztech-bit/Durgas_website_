// Custom Cursor tracking
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursorRing');

if (cursor && cursorRing) {
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursorRing.style.left = e.clientX + 'px';
    cursorRing.style.top = e.clientY + 'px';
  });
}

function bindCursorHover() {
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  if (!cursor || !cursorRing) return;
  document.querySelectorAll('a, button, .product-card, .cat-card, .insta-item, .thumb, input, textarea, select').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '14px'; cursor.style.height = '14px';
      cursorRing.style.width = '54px'; cursorRing.style.height = '54px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '8px'; cursor.style.height = '8px';
      cursorRing.style.width = '36px'; cursorRing.style.height = '36px';
    });
  });
}

// Navigation scroll effects
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile Nav controls
function openMobileNav() { 
  const mob = document.getElementById('mobileNav');
  if (mob) mob.classList.add('open'); 
}
function closeMobileNav() { 
  const mob = document.getElementById('mobileNav');
  if (mob) mob.classList.remove('open'); 
}

// Intersection Observer for fade-up animations
function observeFadeUps() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => obs.observe(el));
  bindCursorHover();
}

// Contact form submission
async function submitContact(e) {
  if (e) e.preventDefault();
  const firstName = document.getElementById('contactFirstName')?.value || '';
  const lastName = document.getElementById('contactLastName')?.value || '';
  const email = document.getElementById('contactEmail')?.value || '';
  const phone = document.getElementById('contactPhone')?.value || '';
  const subject = document.getElementById('contactSubject')?.value || '';
  const message = document.getElementById('contactMessage')?.value || '';
  
  if (!email || !message) {
    alert('Please fill in your email address and message.');
    return;
  }

  const body = { first_name: firstName, last_name: lastName, email, phone, subject, message };

  try {
    const res = await fetch(API + '/contact', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    alert(res.ok ? "Message sent! We'll get back to you soon." : data.message);
    if (res.ok) {
      document.getElementById('contactForm')?.querySelectorAll('input, textarea').forEach(el => el.value = '');
    }
  } catch (err) {
    alert('Could not send message.');
    console.error(err);
  }
}

// Newsletter subscription
async function subscribeNewsletter(btn) {
  const container = btn.closest('.newsletter-form');
  const input = container ? container.querySelector('.newsletter-email') : null;
  if (!input) return;
  const email = input.value.trim();
  if (!email) { alert('Please enter your email.'); return; }
  try {
    const res = await fetch(API + '/newsletter', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    alert(res.ok ? 'Subscribed! Welcome to the DURGAS Circle.' : data.message);
    if (res.ok) input.value = '';
  } catch (err) {
    alert('Subscription failed.');
    console.error(err);
  }
}

// Initialization scripts
document.addEventListener('DOMContentLoaded', () => {
  bindCursorHover();
  observeFadeUps();
});
