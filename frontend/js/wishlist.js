// frontend/js/wishlist.js
// DURGAS FIVE METAL JEWELLERY — Wishlist System

async function addToWishlist(e, productId) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!currentUser) {
    if (typeof openAuthModal === 'function') openAuthModal();
    else window.location.href = '/login';
    return;
  }
  try {
    const res = await apiFetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    if (res.ok) {
      const btn = e ? (e.currentTarget || e.target) : null;
      if (btn) {
        btn.style.color = '#e5446d';
        btn.textContent = '♥';
      }
      showWishlistToast('✓ Piece added to your wishlist');
    }
  } catch (err) {
    console.error('Wishlist add failed:', err);
  }
}

async function addToWishlistDetail() {
  if (typeof currentProduct !== 'undefined' && currentProduct) {
    const detailWishlistBtn = document.getElementById('detailWishlist');
    await addToWishlist({ stopPropagation: () => {}, currentTarget: detailWishlistBtn }, currentProduct.id);
  }
}

async function removeFromWishlist(productId) {
  try {
    const res = await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      openWishlist(); // Refresh drawer
    }
  } catch (err) {
    console.error('Remove wishlist failed:', err);
  }
}

function showWishlistToast(msg) {
  let toast = document.getElementById('wishlistToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wishlistToast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:4px;font-size:0.85rem;letter-spacing:0.05em;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s;border:1px solid #C9A84C;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 2500);
}

function closeWishlistModal() {
  const overlay = document.getElementById('wishlistOverlay');
  const drawer = document.getElementById('wishlistDrawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer) drawer.style.transform = 'translateX(100%)';
}

async function openWishlist() {
  if (!currentUser) {
    if (typeof openAuthModal === 'function') openAuthModal();
    else window.location.href = '/login';
    return;
  }

  // Ensure DOM elements exist
  let overlay = document.getElementById('wishlistOverlay');
  let drawer = document.getElementById('wishlistDrawer');

  if (!drawer) {
    overlay = document.createElement('div');
    overlay.id = 'wishlistOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99990;display:none;backdrop-filter:blur(2px);transition:opacity 0.3s;';
    overlay.onclick = closeWishlistModal;
    document.body.appendChild(overlay);

    drawer = document.createElement('div');
    drawer.id = 'wishlistDrawer';
    drawer.style.cssText = 'position:fixed;top:0;right:0;width:380px;max-width:90vw;height:100vh;background:#FAF8F5;z-index:99991;box-shadow:-4px 0 24px rgba(0,0,0,0.15);transition:transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);transform:translateX(100%);display:flex;flex-direction:column;font-family:var(--font-sans, -apple-system, sans-serif);';
    document.body.appendChild(drawer);
  }

  overlay.style.display = 'block';
  drawer.style.transform = 'translateX(0)';

  drawer.innerHTML = `
    <div style="padding:20px 24px;border-bottom:1px solid #E8E0D0;display:flex;justify-content:space-between;align-items:center;background:#fff;">
      <h3 style="margin:0;font-family:var(--font-serif, 'Cormorant Garamond', serif);font-size:1.4rem;color:#6B1D2F;font-weight:600;">My Wishlist</h3>
      <button onclick="closeWishlistModal()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#888;padding:4px 8px;">✕</button>
    </div>
    <div id="wishlistItemsBody" style="flex:1;overflow-y:auto;padding:20px;">
      <p style="text-align:center;color:#888;margin-top:40px;">Loading your saved pieces...</p>
    </div>
  `;

  try {
    const res = await apiFetch('/wishlist');
    const items = res.ok ? await res.json() : [];
    const body = document.getElementById('wishlistItemsBody');
    if (!body) return;

    if (!items.length) {
      body.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:2.4rem;color:#D4AF37;margin-bottom:12px;">♡</div>
          <p style="font-size:0.95rem;color:#555;margin:0 0 16px;">Your wishlist is currently empty.</p>
          <a href="/products" onclick="closeWishlistModal()" style="display:inline-block;padding:10px 22px;background:#6B1D2F;color:#fff;text-decoration:none;font-size:0.8rem;letter-spacing:0.1em;border-radius:2px;font-weight:600;">EXPLORE CATALOGUE</a>
        </div>
      `;
      return;
    }

    body.innerHTML = items.map(item => `
      <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #EFEAE1;align-items:center;">
        <img src="${(typeof getProductImage === 'function' ? getProductImage(item) : item.image) || '/main logo.jpeg'}" alt="${item.name}" style="width:65px;height:65px;object-fit:cover;border-radius:4px;border:1px solid #E6DEC8;background:#fff;">
        <div style="flex:1;min-width:0;">
          <h4 style="margin:0 0 4px;font-size:0.88rem;color:#222;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</h4>
          <p style="margin:0 0 8px;font-size:0.85rem;color:#8B6914;font-weight:700;">₹${Number(item.price).toLocaleString('en-IN')}</p>
          <div style="display:flex;gap:8px;">
            <button onclick="addToCart(event, ${item.id || item.product_id}); closeWishlistModal();" style="background:#6B1D2F;color:#fff;border:none;padding:5px 10px;font-size:0.72rem;letter-spacing:0.05em;border-radius:2px;cursor:pointer;font-weight:600;">ADD TO BAG</button>
            <button onclick="removeFromWishlist(${item.id || item.product_id})" style="background:none;border:none;color:#999;font-size:0.72rem;cursor:pointer;padding:4px 6px;">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Wishlist sync failed:', err);
    const body = document.getElementById('wishlistItemsBody');
    if (body) {
      body.innerHTML = '<p style="text-align:center;color:#c0392b;padding:40px 0;">Could not load wishlist. Please try again.</p>';
    }
  }
}
