let allProducts = [];
let currentProduct = null;

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
          <a href="/products?category=${encodeURIComponent(c.slug || c.name)}" class="cat-link">
            <span class="cat-shop-btn">Shop Now →</span>
          </a>
        </div>`).join('');
    }

    const filterEl = document.getElementById('shopCategoryFilters');
    if (filterEl) {
      filterEl.innerHTML = `<label class="filter-opt"><input type="checkbox" checked data-category="all" onchange="filterShop()"> All Jewellery</label>` +
        cats.map(c => `<label class="filter-opt"><input type="checkbox" data-category="${c.slug || c.name}" onchange="filterShop()"> ${c.name}</label>`).join('');
    }
    if (typeof observeFadeUps === 'function') observeFadeUps();
  } catch (e) { console.error('Categories load failed:', e); }
}

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
        newGrid.innerHTML = all.map(buildProductCard).join('') || '<p class="loading-msg">No products yet. Add products from the admin panel.</p>';
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
  } catch (e) { console.error('Products load failed:', e); }
}

async function loadShopProducts() {
  const sort = document.getElementById('shopSort')?.value || '';
  let sortParam = '';
  if (sort.includes('Low to High')) sortParam = 'price_asc';
  else if (sort.includes('High to Low')) sortParam = 'price_desc';
  else if (sort.includes('Newest')) sortParam = 'newest';

  const checked = [...document.querySelectorAll('#shopCategoryFilters input:checked')];
  const categories = checked.map(c => c.dataset.category).filter(c => c !== 'all');

  try {
    let url = API + '/products' + (sortParam ? '?sort=' + sortParam : '');
    const res = await fetch(url);
    allProducts = await res.json();

    let filtered = allProducts;
    if (categories.length && !checked.find(c => c.dataset.category === 'all')?.checked) {
      filtered = allProducts.filter(p =>
        categories.some(cat =>
          (p.category_name || '').toLowerCase() === cat.toLowerCase()
        )
      );
    }

    const countEl = document.getElementById('shopResultsCount');
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of ${allProducts.length} products`;
    }

    const gridEl = document.getElementById('shopGrid');
    if (gridEl) {
      gridEl.innerHTML = filtered.length
        ? filtered.map(buildProductCard).join('')
        : '<p class="loading-msg">No products found.</p>';
    }
    if (typeof observeFadeUps === 'function') observeFadeUps();
  } catch (e) { console.error('Shop load failed:', e); }
}

function filterShop() { loadShopProducts(); }

function filterByCategory(cat) {
  document.querySelectorAll('#shopCategoryFilters input').forEach(c => {
    c.checked = c.dataset.category === cat;
  });
  loadShopProducts();
}

async function loadProductDetail(id) {
  if (!id) return;
  try {
    const res = await fetch(API + '/products/' + id);
    if (!res.ok) {
      document.querySelector('.product-detail').innerHTML = '<p style="text-align:center;padding:100px;">Product not found.</p>';
      return;
    }
    const p = await res.json();
    currentProduct = p;

    const crumb = document.getElementById('detailBreadcrumb');
    if (crumb) crumb.textContent = p.name;
    
    const nameEl = document.getElementById('detailName');
    if (nameEl) nameEl.textContent = p.name;
    
    const metaEl = document.getElementById('detailMeta');
    if (metaEl) {
      metaEl.innerHTML = [p.material, p.purity, p.sku ? 'SKU: ' + p.sku : ''].filter(Boolean).map(s => `<span>${s}</span>`).join(' · ');
    }
    
    const descEl = document.getElementById('detailDesc');
    if (descEl) descEl.textContent = p.description || '';
    
    const starsEl = document.getElementById('detailStars');
    if (starsEl) starsEl.innerHTML = renderStars(5);
    
    const countEl = document.getElementById('detailRatingCount');
    if (countEl) countEl.textContent = '5.0';

    let priceHtml = `<span class="detail-price">${formatPrice(p.price)}</span>`;
    if (p.old_price) {
      priceHtml += `<span class="detail-price-old">${formatPrice(p.old_price)}</span>`;
      priceHtml += `<span class="detail-save">Save ${formatPrice(p.old_price - p.price)}</span>`;
    }
    const priceEl = document.getElementById('detailPrice');
    if (priceEl) priceEl.innerHTML = priceHtml;

    const images = p.images?.length ? p.images : [{ image_path: getProductImage(p) }];
    const mainImg = document.getElementById('mainGalleryImg');
    if (mainImg) mainImg.src = images[0].image_path;
    
    const thumbsEl = document.getElementById('galleryThumbs');
    if (thumbsEl) {
      thumbsEl.innerHTML = images.map((img, i) =>
        `<div class="thumb${i === 0 ? ' active' : ''}" onclick="changeImg(this,'${img.image_path}')">
          <img src="${img.image_path}" alt="">
        </div>`
      ).join('');
    }

    const addCartBtn = document.getElementById('detailAddCart');
    if (addCartBtn) addCartBtn.onclick = (e) => addToCart(e, p.id);

    const reviewsRes = await fetch(API + '/analytics/reviews/' + id);
    const reviews = await reviewsRes.json();
    const reviewsEl = document.getElementById('productReviewsGrid');
    if (reviewsEl) {
      reviewsEl.innerHTML = reviews.length
        ? reviews.map(r => `
          <div class="review-card">
            <div class="review-header">
              <div><p class="reviewer-name">${r.reviewer_name || 'Customer'}</p>
              <div class="product-stars" style="margin-top:4px">${renderStars(r.rating)}</div></div>
              <span class="review-date">${new Date(r.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            </div>
            <p class="review-text">${r.review_text}</p>
          </div>`).join('')
        : '<p style="text-align:center;color:var(--gray);padding:20px">No reviews yet.</p>';
    }
    if (typeof bindCursorHover === 'function') bindCursorHover();
  } catch (e) { console.error('Product detail failed:', e); }
}

function changeImg(thumb, src) {
  const mainImg = document.getElementById('mainGalleryImg');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  if (thumb) thumb.classList.add('active');
}

// Bind size options and material options
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.size-options').querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.mat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.material-options').querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Load appropriate elements depending on which page is active
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  
  if (productId && document.getElementById('mainGalleryImg')) {
    loadProductDetail(productId);
  }

  if (document.getElementById('shopGrid')) {
    loadCategories().then(() => {
      const categoryParam = params.get('category');
      if (categoryParam) {
        filterByCategory(categoryParam);
      } else {
        loadShopProducts();
      }
    });
  }

  if (document.getElementById('categoryGrid')) {
    loadCategories();
    loadHomeProducts();
  }
});
