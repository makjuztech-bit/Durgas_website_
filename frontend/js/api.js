const API = (
  window.location.protocol === 'file:' ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000')
) ? 'http://localhost:5000/api' : '/api';
let userToken = null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

function getCookie(name) {
  return document.cookie.split('; ').find((part) => part.startsWith(name + '='))?.split('=').slice(1).join('=') || '';
}

function apiFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (userToken) headers['Authorization'] = 'Bearer ' + userToken;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) headers['X-CSRF-Token'] = decodeURIComponent(getCookie('csrf_token'));
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return fetch(API + url, { ...options, headers, credentials: 'include' });
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
  const sku = p.sku || ('DJ-' + p.id);
  const badge = p.badge ? `<span class="product-badge gold">${p.badge}</span>` : '';
  const oldPrice = p.old_price ? `<span class="price-old">${formatPrice(p.old_price)}</span>` : '';
  const savePct = p.old_price ? `<span class="price-save">${Math.round((1 - p.price / p.old_price) * 100)}% off</span>` : '';
  const metalText = p.metal_composition || p.material || 'Panchaloha Five-Metal Alloy';
  const ratingNum = (4.6 + ((p.id * 3) % 4) / 10).toFixed(1);
  const reviewsCount = 18 + ((p.id * 7) % 85);

  return `<div class="product-card fade-up" onclick="showProductDetail('${p.sku || p.id}')">
    <div class="product-img">
      <img src="${img}" alt="${p.name}" loading="lazy" decoding="async">
      ${badge}
      <div class="product-actions">
        <button class="action-btn" onclick="addToWishlist(event, ${p.id})" title="Add to Wishlist">♡</button>
        <button class="action-btn" onclick="addToCart(event, ${p.id})" title="Add to Bag">⊕</button>
      </div>
    </div>
    <div class="product-info">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span class="product-sku-tag">${sku}</span>
        <span style="font-size:0.7rem; color:#27ae60; font-weight:600">● In Stock</span>
      </div>
      <p class="product-name" title="${p.name}">${p.name}</p>
      <div style="display:flex; align-items:center; gap:8px; margin:4px 0 6px;">
        <span class="rating-pill">${ratingNum} ★</span>
        <span style="font-size:0.75rem; color:#888;">(${reviewsCount})</span>
      </div>
      <p class="product-metal-badge" title="${metalText}">⚜ ${metalText.length > 36 ? metalText.slice(0, 36) + '...' : metalText}</p>
      <div class="product-price">
        <span class="price-current">${formatPrice(p.price)}</span>
        ${oldPrice}
        ${savePct}
      </div>
      <div class="product-card-btns">
        <button class="add-cart-btn" onclick="addToCart(event, ${p.id})">Add to Bag</button>
        <button class="btn-buy-now" onclick="buyNowDirect(event, ${p.id})">⚡ Buy Now</button>
        <button class="btn-whatsapp-order" onclick="openWhatsAppForProduct(event, ${p.id})" title="Order directly on WhatsApp">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp Order
        </button>
      </div>
    </div>
  </div>`;
}

function buyNowDirect(event, id) {
  if (event) event.stopPropagation();
  const prod = (window.allProducts || []).find(p => p.id == id) || (window.currentProduct?.id == id ? window.currentProduct : null);
  if (prod) {
    sessionStorage.setItem('durgas_buy_now', JSON.stringify({ product: prod, quantity: 1, size: prod.available_sizes?.split(',')?.[0]?.trim() || 'Standard' }));
    window.location.href = '/cart?buynow=1';
  } else {
    fetch(API + '/products/' + id).then(r => r.json()).then(p => {
      sessionStorage.setItem('durgas_buy_now', JSON.stringify({ product: p, quantity: 1, size: p.available_sizes?.split(',')?.[0]?.trim() || 'Standard' }));
      window.location.href = '/cart?buynow=1';
    });
  }
}

function openWhatsAppForProduct(event, id) {
  if (event) event.stopPropagation();
  const prod = (window.allProducts || []).find(p => p.id == id) || (window.currentProduct?.id == id ? window.currentProduct : null);
  if (prod && window.DURGAS_WHATSAPP) {
    window.DURGAS_WHATSAPP.openProductOrder(prod);
  } else {
    fetch(API + '/products/' + id).then(r => r.json()).then(p => {
      if (window.DURGAS_WHATSAPP) window.DURGAS_WHATSAPP.openProductOrder(p);
    });
  }
}

// Redirect to product details page via unique URL
function showProductDetail(identifier) {
  if (!identifier) return;
  window.location.href = `/product/${identifier}`;
}
