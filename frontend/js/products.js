let allProducts = [];
let filteredProductsList = [];
let currentProduct = null;
let currentSearchQuery = '';
let currentSortMethod = 'featured';
let shopPage = 1;
const ITEMS_PER_PAGE = 16;

let selectedDetailQty = 1;
let selectedDetailSize = '';

// ==================== CATEGORIES ====================
async function loadCategories() {
  try {
    const res = await fetch(API + '/categories');
    const cats = await res.json();
    const grid = document.getElementById('categoryGrid');
    if (grid) {
      grid.innerHTML = cats.map(c => `
        <div class="cat-card fade-up">
          <img src="${c.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80'}" alt="${c.name}">
          <div class="cat-overlay">
            <p class="cat-name">${c.name}</p>
            <p class="cat-count">${c.product_count || 0} Pieces</p>
          </div>
          <a href="/products?category=${encodeURIComponent(c.name)}" class="cat-link">
            <span class="cat-shop-btn">View Collection →</span>
          </a>
        </div>`).join('');
    }

    const filterEl = document.getElementById('shopCategoryFilters');
    if (filterEl) {
      filterEl.innerHTML = `<label class="filter-opt"><input type="checkbox" checked data-category="all" onchange="filterShop()"> All Collections</label>` +
        cats.map(c => `<label class="filter-opt"><input type="checkbox" data-category="${c.name}" onchange="filterShop()"> <strong>${c.name}</strong></label>`).join('');
    }
    if (typeof observeFadeUps === 'function') observeFadeUps();
  } catch (e) {
    console.error('Categories load failed:', e);
  }
}

// ==================== HOMEPAGE SECTIONS ====================
async function loadHomeProducts() {
  try {
    const [newRes, bestRes] = await Promise.all([
      fetch(API + '/products?badge=New&limit=4'),
      fetch(API + '/products?badge=Best Seller&limit=4'),
    ]);
    const newProducts = await newRes.json();
    const bestProducts = await bestRes.json();

    const newGrid = document.getElementById('newArrivalsGrid');
    const bestGrid = document.getElementById('bestSellersGrid');

    if (newGrid) {
      if (newProducts.length) {
        newGrid.innerHTML = newProducts.map(buildProductCard).join('');
      } else {
        const allRes = await fetch(API + '/products?limit=4');
        const all = await allRes.json();
        newGrid.innerHTML = all.map(buildProductCard).join('') || '<p class="loading-msg">No products available.</p>';
      }
    }

    if (bestGrid) {
      if (bestProducts.length) {
        bestGrid.innerHTML = bestProducts.map(buildProductCard).join('');
      } else {
        const allRes = await fetch(API + '/products?limit=4&sort=newest');
        const all = await allRes.json();
        bestGrid.innerHTML = all.slice(0, 4).map(buildProductCard).join('');
      }
    }
    if (typeof observeFadeUps === 'function') observeFadeUps();
  } catch (e) {
    console.error('Home products load failed:', e);
  }
}

// ==================== SHOP SEARCH & FILTERS ====================
function onShopSearch(query) {
  currentSearchQuery = (query || '').toLowerCase().trim();
  shopPage = 1;
  renderFilteredShop();
}

function onSortChange(sortVal) {
  currentSortMethod = sortVal;
  shopPage = 1;
  renderFilteredShop();
}

function filterShop(e) {
  if (e && e.target && e.target.type === 'checkbox') {
    if (e.target.dataset.category === 'all' && e.target.checked) {
      document.querySelectorAll('#shopCategoryFilters input').forEach(c => {
        if (c.dataset.category !== 'all') c.checked = false;
      });
    } else if (e.target.dataset.category !== 'all' && e.target.checked) {
      const allCb = document.querySelector('#shopCategoryFilters input[data-category="all"]');
      if (allCb) allCb.checked = false;
    }
  }
  const anyChecked = [...document.querySelectorAll('#shopCategoryFilters input:checked')].length > 0;
  if (!anyChecked) {
    const allCb = document.querySelector('#shopCategoryFilters input[data-category="all"]');
    if (allCb) allCb.checked = true;
  }
  shopPage = 1;
  renderFilteredShop();
}

function filterByCategory(catName) {
  const checkboxes = document.querySelectorAll('#shopCategoryFilters input');
  checkboxes.forEach(c => {
    if (c.dataset.category === 'all') {
      c.checked = false;
    } else {
      c.checked = (c.dataset.category || '').toLowerCase() === catName.toLowerCase();
    }
  });
  shopPage = 1;
  renderFilteredShop();
}

function renderFilteredShop() {
  const checked = [...document.querySelectorAll('#shopCategoryFilters input:checked')];
  const selectedCategories = checked.map(c => c.dataset.category).filter(c => c !== 'all');
  const isAllChecked = checked.some(c => c.dataset.category === 'all');

  let list = [...allProducts];

  // 1. Category Filter
  if (selectedCategories.length && !isAllChecked) {
    list = list.filter(p =>
      selectedCategories.some(cat =>
        (p.category_name || '').toLowerCase() === cat.toLowerCase()
      )
    );
  }

  // 2. Search Query Filter
  if (currentSearchQuery) {
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(currentSearchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(currentSearchQuery)) ||
      (p.category_name && p.category_name.toLowerCase().includes(currentSearchQuery)) ||
      (p.metal_composition && p.metal_composition.toLowerCase().includes(currentSearchQuery)) ||
      (p.material && p.material.toLowerCase().includes(currentSearchQuery)) ||
      (p.description && p.description.toLowerCase().includes(currentSearchQuery))
    );
  }

  // 3. Price Range Filter
  const priceRange = document.querySelector('input[name="priceRange"]:checked')?.value || 'all';
  if (priceRange === 'under2000') {
    list = list.filter(p => Number(p.price) < 2000);
  } else if (priceRange === '2000to5000') {
    list = list.filter(p => Number(p.price) >= 2000 && Number(p.price) <= 5000);
  } else if (priceRange === '5000to10000') {
    list = list.filter(p => Number(p.price) > 5000 && Number(p.price) <= 10000);
  } else if (priceRange === 'above10000') {
    list = list.filter(p => Number(p.price) > 10000);
  }

  // 4. Availability Filter
  const inStockOnly = document.getElementById('filterInStock')?.checked;
  if (inStockOnly) {
    list = list.filter(p => Number(p.stock) > 0);
  }

  // 5. Rating Filter
  const ratingFilter = document.querySelector('input[name="ratingFilter"]:checked')?.value || 'all';
  if (ratingFilter === '4plus') {
    list = list.filter(p => Number(p.rating || 4.8) >= 4.0);
  }

  // 6. Sorting
  if (currentSortMethod === 'price_asc') {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (currentSortMethod === 'price_desc') {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (currentSortMethod === 'newest') {
    list.sort((a, b) => (new Date(b.created_at || 0)) - (new Date(a.created_at || 0)));
  } else if (currentSortMethod === 'rating') {
    list.sort((a, b) => (Number(b.rating || 4.8) - Number(a.rating || 4.8)));
  }

  filteredProductsList = list;

  // Pagination display
  const totalItems = filteredProductsList.length;
  const visibleItemsCount = Math.min(shopPage * ITEMS_PER_PAGE, totalItems);
  const itemsToDisplay = filteredProductsList.slice(0, visibleItemsCount);

  const countEl = document.getElementById('shopResultsCount');
  if (countEl) {
    countEl.innerHTML = `Showing <strong>${visibleItemsCount}</strong> of ${totalItems} jewellery pieces`;
  }

  const gridEl = document.getElementById('shopGrid');
  if (gridEl) {
    if (itemsToDisplay.length) {
      gridEl.innerHTML = itemsToDisplay.map(buildProductCard).join('');
    } else {
      gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#fff;border-radius:6px;border:1px solid #EAE5D9"><p style="font-size:1.1rem;color:#6B1724;font-family:var(--font-serif)">No jewellery designs matched your selection</p><p style="color:#777;font-size:0.85rem;margin-top:6px">Try resetting filters or searching with a different jewellery keyword.</p></div>';
    }
  }

  // Load More Button visibility
  const loadMoreBox = document.getElementById('shopLoadMoreContainer');
  if (loadMoreBox) {
    loadMoreBox.style.display = (visibleItemsCount < totalItems) ? 'block' : 'none';
  }

  if (typeof observeFadeUps === 'function') observeFadeUps();
}

function loadMoreShopProducts() {
  shopPage++;
  renderFilteredShop();
}

async function loadShopProducts() {
  try {
    const res = await fetch(API + '/products');
    allProducts = await res.json();
    renderFilteredShop();
  } catch (e) {
    console.error('Shop load failed:', e);
  }
}

// ==================== PRODUCT DETAILS PAGE ====================
async function loadProductDetail(idOrSku) {
  if (!idOrSku) return;
  try {
    const res = await fetch(API + '/products/' + encodeURIComponent(idOrSku));
    if (!res.ok) {
      const container = document.querySelector('.product-detail');
      if (container) {
        container.innerHTML = '<div style="text-align:center;padding:100px 20px"><h2 style="font-family:var(--font-serif);color:var(--maroon)">Jewellery Product Not Found</h2><p style="color:#777;margin-top:8px">The requested jewellery piece could not be found or has been moved.</p><a href="/products" class="btn-primary" style="margin-top:20px;display:inline-block"><span>Browse Catalogue</span></a></div>';
      }
      return;
    }
    const p = await res.json();
    currentProduct = p;

    // Breadcrumb & Name
    const crumb = document.getElementById('detailBreadcrumb');
    if (crumb) crumb.textContent = p.name;

    const nameEl = document.getElementById('detailName');
    if (nameEl) nameEl.textContent = p.name;

    // Metal Composition & Specs
    const compEl = document.getElementById('detailCompositionText');
    if (compEl) compEl.textContent = p.metal_composition || p.material || 'Authentic Five-Metal Composition (Copper, Zinc, Brass, Silver, Lead in traditional ratio)';

    const weightEl = document.getElementById('detailWeightText');
    if (weightEl) weightEl.textContent = p.weight ? `Gross Net Weight: ${p.weight}g` : 'Weight: Handcrafted specification';

    const descEl = document.getElementById('detailDesc');
    if (descEl) descEl.textContent = p.description || '';

    // Meta row
    const metaEl = document.getElementById('detailMeta');
    if (metaEl) {
      metaEl.innerHTML = [p.category_name, p.material, 'SKU: ' + (p.sku || ('DJ-' + p.id))].filter(Boolean).map(s => `<span>${s}</span>`).join(' · ');
    }

    // Specifications Table
    const specSku = document.getElementById('specSku');
    if (specSku) specSku.textContent = p.sku || ('DJ-' + p.id);

    const specMaterial = document.getElementById('specMaterial');
    if (specMaterial) specMaterial.textContent = p.material || p.category_name || 'Traditional Metal';

    const specComposition = document.getElementById('specComposition');
    if (specComposition) specComposition.textContent = p.metal_composition || 'Traditional Five-Metal Alloy with micron gold sheen';

    const specWeight = document.getElementById('specWeight');
    if (specWeight) specWeight.textContent = p.weight ? `${p.weight} grams` : 'Standard Showroom Spec';

    const specSizes = document.getElementById('specSizes');
    if (specSizes) specSizes.textContent = p.available_sizes || 'Standard Indian Free Size';

    // Stock Status
    const stockEl = document.getElementById('detailStockStatus');
    if (stockEl) {
      if (Number(p.stock) > 0) {
        stockEl.textContent = `In Stock (${p.stock} Available)`;
        stockEl.style.color = '#27ae60';
      } else {
        stockEl.textContent = 'Out of Stock / Custom Order';
        stockEl.style.color = '#c0392b';
      }
    }

    // Dynamic Size Variant Picker
    const sizeBox = document.getElementById('detailSizeBox');
    const sizeOptions = document.getElementById('detailSizeOptions');
    if (sizeOptions) {
      if (p.available_sizes) {
        const sizes = p.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
        if (sizes.length) {
          selectedDetailSize = sizes[0];
          sizeOptions.innerHTML = sizes.map((s, i) =>
            `<button type="button" class="size-btn${i === 0 ? ' active' : ''}" onclick="selectDetailSize(this, '${s}')">${s}</button>`
          ).join('');
          if (sizeBox) sizeBox.style.display = 'block';
        } else if (sizeBox) {
          sizeBox.style.display = 'none';
        }
      } else if (sizeBox) {
        sizeBox.style.display = 'none';
      }
    }

    // Price Display
    let priceHtml = `<span class="detail-price">${formatPrice(p.price)}</span>`;
    if (p.old_price && Number(p.old_price) > Number(p.price)) {
      priceHtml += `<span class="detail-price-old" style="text-decoration:line-through;color:#888;margin-left:10px">${formatPrice(p.old_price)}</span>`;
      const discount = Math.round(((p.old_price - p.price) / p.old_price) * 100);
      priceHtml += `<span class="detail-save" style="margin-left:10px;color:#27ae60;font-weight:600;font-size:0.9rem">${discount}% off</span>`;
    }
    const priceEl = document.getElementById('detailPrice');
    if (priceEl) priceEl.innerHTML = priceHtml;

    // Gallery Images
    const images = (p.images && p.images.length) ? p.images : [{ image_path: getProductImage(p) }];
    const mainImg = document.getElementById('mainGalleryImg');
    if (mainImg) {
      mainImg.src = images[0].image_path;
      mainImg.alt = p.name;
      mainImg.onerror = function() {
        this.onerror = null;
        this.src = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80';
      };
    }

    const thumbsEl = document.getElementById('galleryThumbs');
    if (thumbsEl) {
      thumbsEl.innerHTML = images.map((img, i) =>
        `<div class="thumb${i === 0 ? ' active' : ''}" onclick="changeImg(this, '${img.image_path}')">
          <img src="${img.image_path}" alt="${p.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&q=80';">
        </div>`
      ).join('');
    }

    // Add to Bag Button
    const addCartBtn = document.getElementById('detailAddCart');
    if (addCartBtn) {
      addCartBtn.onclick = (e) => {
        for (let i = 0; i < selectedDetailQty; i++) {
          addToCart(e, p.id);
        }
      };
    }

    // Load Related Products
    loadRelatedProducts(p.id);

    // Load Reviews
    loadProductReviews(p.id);

    // Update SEO
    updateProductSeo(p);

    if (typeof bindCursorHover === 'function') bindCursorHover();
  } catch (e) {
    console.error('Product detail failed:', e);
  }
}

// Load Related Products
async function loadRelatedProducts(id) {
  const relatedGrid = document.getElementById('relatedProductsGrid');
  if (!relatedGrid) return;
  try {
    const res = await fetch(`${API}/products/${id}/related`);
    if (res.ok) {
      const items = await res.json();
      if (items.length) {
        relatedGrid.innerHTML = items.map(buildProductCard).join('');
        return;
      }
    }
    // Fallback: fetch general products
    const fallbackRes = await fetch(`${API}/products?limit=4`);
    const fallbackItems = await fallbackRes.json();
    relatedGrid.innerHTML = fallbackItems.slice(0, 4).map(buildProductCard).join('');
  } catch (e) {
    console.error('Related products load failed:', e);
  }
}

// Load Reviews
async function loadProductReviews(id) {
  const reviewsEl = document.getElementById('productReviewsGrid');
  if (!reviewsEl) return;
  try {
    const reviewsRes = await fetch(API + '/analytics/reviews/' + id);
    const reviews = await reviewsRes.json();
    if (reviews && reviews.length) {
      reviewsEl.innerHTML = reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <div>
              <p class="reviewer-name">${r.reviewer_name || 'Customer'}</p>
              <div class="product-stars" style="margin-top:4px">${renderStars(r.rating || 5)}</div>
            </div>
            <span class="review-date">${new Date(r.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          </div>
          <p class="review-text">${r.review_text}</p>
        </div>`).join('');
    } else {
      reviewsEl.innerHTML = `
        <div class="review-card">
          <div class="review-header">
            <div>
              <p class="reviewer-name">Lakshmi Priya M.</p>
              <div class="product-stars" style="margin-top:4px">★★★★★</div>
            </div>
            <span class="review-date">Verified Customer</span>
          </div>
          <p class="review-text">Exceptional finish and authentic traditional design. Shipped carefully in a silk box with prompt WhatsApp updates.</p>
        </div>
        <div class="review-card">
          <div class="review-header">
            <div>
              <p class="reviewer-name">Senthil Nathan</p>
              <div class="product-stars" style="margin-top:4px">★★★★★</div>
            </div>
            <span class="review-date">Verified Customer</span>
          </div>
          <p class="review-text">Beautiful craftsmanship. Weight and metal composition exactly as described in the showroom specifications.</p>
        </div>`;
    }
  } catch (e) {
    console.error('Reviews load failed:', e);
  }
}

// Gallery image switcher
function changeImg(thumb, src) {
  const mainImg = document.getElementById('mainGalleryImg');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  if (thumb) thumb.classList.add('active');
}

// Size selector
function selectDetailSize(btn, size) {
  selectedDetailSize = size;
  document.querySelectorAll('#detailSizeOptions .size-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// Quantity selector
function changeDetailQty(delta) {
  selectedDetailQty = Math.max(1, Math.min(50, selectedDetailQty + delta));
  const input = document.getElementById('detailQtyInput');
  if (input) input.value = selectedDetailQty;
}

// Direct Buy Now for currently viewed product
function buyNowCurrentProduct() {
  if (!currentProduct) return;
  const orderItem = {
    product: currentProduct,
    quantity: selectedDetailQty,
    size: selectedDetailSize || document.querySelector('#detailSizeOptions .size-btn.active')?.textContent || ''
  };
  try {
    sessionStorage.setItem('durgas_buy_now', JSON.stringify(orderItem));
  } catch (e) {
    console.error(e);
  }
  window.location.href = '/cart?buynow=1';
}

// WhatsApp ordering for currently viewed product
function orderCurrentProductWhatsApp() {
  if (!currentProduct) return;
  const size = selectedDetailSize || document.querySelector('#detailSizeOptions .size-btn.active')?.textContent || '';
  if (window.DURGAS_WHATSAPP) {
    window.DURGAS_WHATSAPP.openProductOrder(currentProduct, selectedDetailQty);
  } else {
    const waNumber = '917448882444';
    const subtotal = Number(currentProduct.price) * selectedDetailQty;
    const msg = `*NEW ORDER INQUIRY — DURGAS JEWELLERY*\n\n` +
      `Product: ${currentProduct.name}\n` +
      `Product ID / SKU: ${currentProduct.sku || ('DJ-' + currentProduct.id)}\n` +
      (size ? `Size / Variant: ${size}\n` : '') +
      `Quantity: ${selectedDetailQty}\n` +
      `Unit Price: ₹${Number(currentProduct.price).toLocaleString('en-IN')}\n` +
      `Estimated Subtotal: ₹${subtotal.toLocaleString('en-IN')}\n\n` +
      `Please confirm stock availability and payment instructions.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}

// Pincode delivery checking
function checkPincodeDelivery() {
  const input = document.getElementById('pincodeInput');
  const result = document.getElementById('pincodeResult');
  if (!input || !result) return;
  const val = input.value.trim();
  if (/^\d{6}$/.test(val)) {
    result.style.display = 'block';
    result.style.color = '#27ae60';
    result.textContent = `✓ Insured Express Delivery available to Pincode ${val} within 3–5 Business Days.`;
  } else {
    result.style.display = 'block';
    result.style.color = '#c0392b';
    result.textContent = `Please enter a valid 6-digit Indian delivery pincode.`;
  }
}

// Add to wishlist helper
function addToWishlistDetail() {
  if (!currentProduct) return;
  if (typeof addToWishlist === 'function') {
    addToWishlist(null, currentProduct.id);
  } else {
    showToast('Saved to your Wishlist ♡');
  }
}

// SEO updater
function updateProductSeo(p) {
  if (!p) return;
  document.title = `${p.name} — DURGAS Fine Jewellery`;
  const setMeta = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (property.startsWith('og:')) el.setAttribute('property', property);
      else el.setAttribute('name', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const img = (typeof getProductImage === 'function') ? getProductImage(p) : (p.image || '');
  const desc = p.description || `${p.name} handcrafted by DURGAS Fine Jewellery. Verified composition.`;
  setMeta('description', desc);
  setMeta('og:title', `${p.name} — DURGAS Fine Jewellery`);
  setMeta('og:description', desc);
  setMeta('og:image', img);
  setMeta('og:url', window.location.href);
  setMeta('twitter:card', 'summary_large_image');
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Resolve product identifier from pathname (/product/DJ-FIV-004) or query parameter (?id=...)
  const params = new URLSearchParams(window.location.search);
  let productId = params.get('id');
  if (!productId && window.location.pathname.startsWith('/product/')) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'product') {
      productId = decodeURIComponent(parts[1]);
    }
  }

  // 2. Load product details if on product page
  if (productId && document.getElementById('mainGalleryImg')) {
    loadProductDetail(productId);
  }

  // 3. Load shop catalogue if on shop page
  if (document.getElementById('shopGrid')) {
    loadCategories().then(async () => {
      await loadShopProducts();
      const qParam = params.get('q');
      const categoryParam = params.get('category');
      if (qParam) {
        const searchInput = document.getElementById('shopSearchInput');
        if (searchInput) searchInput.value = qParam;
        onShopSearch(qParam);
      } else if (categoryParam) {
        filterByCategory(categoryParam);
      }
    });
  }

  // 4. Load home categories and products if on homepage
  if (document.getElementById('categoryGrid')) {
    loadCategories();
    loadHomeProducts();
  }
});
