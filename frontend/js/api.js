const API = (
  window.location.protocol === 'file:' ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000')
) ? 'http://localhost:5000/api' : '/api';
let userToken = localStorage.getItem('userToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

function apiFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (userToken) headers['Authorization'] = 'Bearer ' + userToken;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return fetch(API + url, { ...options, headers });
}

function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function getProductImage(p) {
  if (p.image) return p.image;
  if (p.images?.length) return p.images[0].image_path;
  return 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80';
}

function renderStars(rating = 5) {
  return Array(5).fill(0).map((_, i) =>
    `<span class="star${i >= rating ? ' empty' : ''}">★</span>`
  ).join('');
}

function buildProductCard(p) {
  const img = getProductImage(p);
  const meta = [p.material, p.purity].filter(Boolean).join(' · ');
  const badge = p.badge ? `<span class="product-badge${p.badge === 'New' || p.badge === 'Sale' || p.badge === 'Best Seller' ? ' gold' : ''}">${p.badge}</span>` : '';
  const oldPrice = p.old_price ? `<span class="price-old">${formatPrice(p.old_price)}</span>` : '';
  const savePct = p.old_price ? `<span class="price-save">Save ${Math.round((1 - p.price / p.old_price) * 100)}%</span>` : '';

  return `<div class="product-card fade-up" onclick="showProductDetail(${p.id})">
    <div class="product-img">
      <img src="${img}" alt="${p.name}">
      ${badge}
      <div class="product-actions">
        <button class="action-btn" onclick="addToWishlist(event, ${p.id})" title="Wishlist">♡</button>
        <button class="action-btn" onclick="addToCart(event, ${p.id})" title="Add to Cart">⊕</button>
      </div>
    </div>
    <div class="product-info">
      <p class="product-meta">${meta || p.category_name || ''}</p>
      <p class="product-name">${p.name}</p>
      <div class="product-price">
        <span class="price-current">${formatPrice(p.price)}</span>
        ${oldPrice}${savePct}
      </div>
      <div class="product-stars">${renderStars(5)}</div>
      <button class="add-cart-btn" onclick="addToCart(event, ${p.id})">Add to Bag</button>
    </div>
  </div>`;
}

// Helper to redirect to details page if modularized
function showProductDetail(id) {
  if (!id) return;
  window.location.href = `/product-details?id=${id}`;
}
