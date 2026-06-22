async function addToWishlist(e, productId) {
  if (e) e.stopPropagation();
  if (!userToken) { openAuthModal(); return; }
  try {
    const res = await apiFetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    if (res.ok) {
      const btn = e ? e.currentTarget : null;
      if (btn) {
        btn.style.color = '#e5446d';
        btn.textContent = '♥';
      } else {
        alert('Product added to wishlist!');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function addToWishlistDetail() {
  if (typeof currentProduct !== 'undefined' && currentProduct) {
    const detailWishlistBtn = document.getElementById('detailWishlist');
    await addToWishlist({ stopPropagation: () => {}, currentTarget: detailWishlistBtn }, currentProduct.id);
  }
}

async function openWishlist() {
  if (!userToken) { openAuthModal(); return; }
  try {
    const res = await apiFetch('/wishlist');
    const items = await res.json();
    if (!items.length) { alert('Your wishlist is empty.'); return; }
    alert('Wishlist: ' + items.map(i => i.name).join(', '));
  } catch (err) {
    console.error('Wishlist sync failed:', err);
  }
}
