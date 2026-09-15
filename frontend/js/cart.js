let cartItems = [];

function openCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  if (overlay && sidebar) {
    overlay.classList.add('open');
    sidebar.classList.add('open');
    renderCart();
  } else {
    // If no sidebar is present (or on mobile redirection), go to the cart page
    window.location.href = '/cart';
  }
}

function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  if (overlay && sidebar) {
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
  }
}

async function addToCart(e, productId) {
  if (e) e.stopPropagation();
  if (!userToken) { openAuthModal(); return; }
  try {
    const res = await apiFetch('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.message); return; }
    await syncCartFromServer();
    openCart();
  } catch (err) {
    alert('Could not add to cart.');
    console.error(err);
  }
}

async function syncCartFromServer() {
  if (!userToken) return;
  try {
    const res = await apiFetch('/cart');
    cartItems = await res.json();
    updateCartBadge(cartItems.reduce((s, i) => s + i.quantity, 0));
    renderCart();
  } catch (err) {
    console.error('Cart sync failed:', err);
  }
}

async function removeFromCart(id) {
  try {
    await apiFetch('/cart/' + id, { method: 'DELETE' });
    await syncCartFromServer();
  } catch (err) {
    console.error(err);
  }
}

async function updateCartQuantity(id, quantity) {
  const nextQuantity = Number(quantity);
  if (!Number.isInteger(nextQuantity) || nextQuantity < 1) return removeFromCart(id);
  try {
    const res = await apiFetch('/cart/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: nextQuantity }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Could not update quantity.');
    await syncCartFromServer();
  } catch (err) {
    console.error('Cart quantity update failed:', err);
  }
}

function updateCartBadge(total) {
  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.textContent = total;
}

function renderCart() {
  // 1. Sidebar rendering
  const sidebarEl = document.getElementById('cartItems');
  const sidebarFooter = document.getElementById('cartFooter');
  if (sidebarEl && sidebarFooter) {
    if (!cartItems.length) {
      sidebarEl.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">♡</div><p>Your bag is empty</p><button class="btn-primary" onclick="closeCart(); window.location.href='/products'"><span>Shop Now</span></button></div>`;
      sidebarFooter.style.display = 'none';
    } else {
      sidebarEl.innerHTML = cartItems.map(i => `
        <div class="cart-item">
          <div style="width:72px;height:90px;background:var(--beige);flex-shrink:0;overflow:hidden">
            <img src="${i.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=150&q=80'}" style="width:100%;height:100%;object-fit:cover">
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">${i.name}</p>
            <p class="cart-item-meta">Qty: <button onclick="updateCartQuantity(${i.id}, ${i.quantity - 1})" aria-label="Decrease quantity">−</button> ${i.quantity} <button onclick="updateCartQuantity(${i.id}, ${i.quantity + 1})" aria-label="Increase quantity">+</button></p>
            <p class="cart-item-price">${formatPrice(i.price * i.quantity)}</p>
            <button class="cart-item-remove" onclick="removeFromCart(${i.id})">Remove</button>
          </div>
        </div>`).join('');
      const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const totalEl = document.getElementById('cartTotal');
      if (totalEl) totalEl.textContent = formatPrice(total);
      sidebarFooter.style.display = 'block';
    }
  }

  // 2. Main page cart container rendering (for cart.html)
  const mainEl = document.getElementById('mainCartItems');
  const mainFooter = document.getElementById('mainCartFooter');
  if (mainEl && mainFooter) {
    if (!cartItems.length) {
      mainEl.innerHTML = `<div class="cart-empty" style="padding: 100px 20px;"><div class="cart-empty-icon" style="font-size: 3.5rem;">♡</div><p style="font-size: 1.1rem; margin-bottom: 24px;">Your bag is empty</p><button class="btn-primary" onclick="window.location.href='/products'"><span>Shop Now</span></button></div>`;
      mainFooter.style.display = 'none';
    } else {
      mainEl.innerHTML = cartItems.map(i => `
        <div class="cart-item" style="padding: 24px 0;">
          <div style="width:90px;height:112px;background:var(--beige);flex-shrink:0;overflow:hidden">
            <img src="${i.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&q=80'}" style="width:100%;height:100%;object-fit:cover">
          </div>
          <div class="cart-item-info" style="padding-left: 20px;">
            <p class="cart-item-name" style="font-size: 1.2rem; margin-bottom: 8px;">${i.name}</p>
            <p class="cart-item-meta" style="font-size: 0.85rem;">Quantity: <button onclick="updateCartQuantity(${i.id}, ${i.quantity - 1})" aria-label="Decrease quantity">−</button> ${i.quantity} <button onclick="updateCartQuantity(${i.id}, ${i.quantity + 1})" aria-label="Increase quantity">+</button></p>
            <p class="cart-item-price" style="font-size: 1.1rem; margin-top: 10px;">${formatPrice(i.price * i.quantity)}</p>
            <button class="cart-item-remove" style="margin-top: 12px; color: #c0392b;" onclick="removeFromCart(${i.id})">Remove</button>
          </div>
        </div>`).join('');
      const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const mainTotalEl = document.getElementById('mainCartTotal');
      if (mainTotalEl) mainTotalEl.textContent = formatPrice(total);
      mainFooter.style.display = 'block';
    }
  }
}

function proceedToCheckout() {
  if (!userToken) { closeCart(); openAuthModal(); return; }
  if (!cartItems.length) return;
  closeCart();
  const overlay = document.getElementById('checkoutOverlay');
  const modal = document.getElementById('checkoutModal');
  if (overlay && modal) {
    overlay.classList.add('open');
    modal.classList.add('open');
  }
}

function closeCheckout() {
  const overlay = document.getElementById('checkoutOverlay');
  const modal = document.getElementById('checkoutModal');
  if (overlay && modal) {
    overlay.classList.remove('open');
    modal.classList.remove('open');
  }
}

function getCheckoutData() {
  return {
    shipping_address: document.getElementById('shipAddress').value,
    shipping_city: document.getElementById('shipCity').value,
    shipping_state: document.getElementById('shipState').value,
    shipping_pincode: document.getElementById('shipPincode').value,
    shipping_phone: document.getElementById('shipPhone').value,
  };
}

function validateCheckoutData(data) {
  return data.shipping_address?.trim() && data.shipping_city?.trim() && data.shipping_state?.trim() && /^[0-9]{6}$/.test(data.shipping_pincode.trim()) && /^[0-9+ ()-]{10,16}$/.test(data.shipping_phone.trim());
}

async function placeOrder() {
  const shippingData = getCheckoutData();
  const errEl = document.getElementById('checkoutError');

  if (!validateCheckoutData(shippingData)) {
    if (errEl) errEl.textContent = 'Please fill all shipping fields before placing order.';
    return;
  }

  const body = {
    ...shippingData,
    payment_method: 'cod',
  };

  try {
    const res = await apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.message; return; }
    showOrderConfirmation(data.order_number, data.total_amount);
  } catch (err) {
    if (errEl) errEl.textContent = 'Order failed. Please try again.';
    console.error(err);
  }
}

async function placeRazorpayOrder() {
  const shippingData = getCheckoutData();
  const errEl = document.getElementById('checkoutError');

  if (!validateCheckoutData(shippingData)) {
    if (errEl) errEl.textContent = 'Please fill all shipping fields before paying online.';
    return;
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!total) {
    if (errEl) errEl.textContent = 'Your cart is empty.';
    return;
  }

  try {
    const res = await apiFetch('/orders/payment', { method: 'POST', body: JSON.stringify({ amount: total }) });
    const orderData = await res.json();
    if (!res.ok) { errEl.textContent = orderData.message; return; }

    const options = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'DURGAS Fine Jewellery',
      description: 'Secure online payment',
      order_id: orderData.id,
      prefill: {
        name: currentUser?.full_name || '',
        email: currentUser?.email || '',
      },
      notes: {
        address: shippingData.shipping_address,
      },
      theme: { color: '#C9A84C' },
      handler: async function (response) {
        await verifyRazorpayPayment(response, shippingData);
      },
      modal: {
        ondismiss: function () {
          if (errEl) errEl.textContent = 'Payment canceled. Please try again.';
        },
      },
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  } catch (err) {
    if (errEl) errEl.textContent = 'Failed to initialize Razorpay payment.';
    console.error(err);
  }
}

async function verifyRazorpayPayment(response, shippingData) {
  const errEl = document.getElementById('checkoutError');
  try {
    const verifyRes = await apiFetch('/orders/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        ...shippingData,
      }),
    });
    const data = await verifyRes.json();
    if (!verifyRes.ok) { errEl.textContent = data.message; return; }
    showOrderConfirmation(data.order_number, data.total_amount, true);
  } catch (err) {
    if (errEl) errEl.textContent = 'Payment verification failed. Please contact support.';
    console.error(err);
  }
}

function showOrderConfirmation(orderNumber, totalAmount, isOnline = false) {
  closeCheckout();
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');

  if (confirmMessage) {
    confirmMessage.textContent = `Order ${orderNumber} placed! Total: ${formatPrice(totalAmount)}${isOnline ? ' (paid online)' : ''}`;
  }
  if (confirmOverlay && confirmModal) {
    confirmOverlay.classList.add('open');
    confirmModal.classList.add('open');
  } else {
    alert(`Order ${orderNumber} placed successfully! Total: ${formatPrice(totalAmount)}`);
    window.location.href = '/products';
  }

  cartItems = [];
  updateCartBadge(0);
  renderCart();
}

function injectRazorpayButton() {
  const modal = document.getElementById('checkoutModal');
  if (!modal || modal.querySelector('#razorpayPayNow')) return;

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.flexDirection = 'column';
  controls.style.gap = '10px';
  controls.style.marginTop = '14px';

  const payNow = document.createElement('button');
  payNow.id = 'razorpayPayNow';
  payNow.className = 'btn btn-primary';
  payNow.textContent = 'Pay with Razorpay';
  payNow.style.width = '100%';
  payNow.onclick = placeRazorpayOrder;

  const note = document.createElement('p');
  note.textContent = 'Pay online via Razorpay to complete checkout instantly.';
  note.style.color = '#555';
  note.style.fontSize = '0.85rem';
  note.style.margin = '0';

  controls.appendChild(payNow);
  controls.appendChild(note);

  const placeButton = modal.querySelector('button[onclick="placeOrder()"]');
  if (placeButton?.parentNode) {
    placeButton.parentNode.insertBefore(controls, placeButton.nextSibling);
  } else {
    modal.appendChild(controls);
  }
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function closeConfirm() {
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmModal = document.getElementById('confirmModal');
  if (confirmOverlay && confirmModal) {
    confirmOverlay.classList.remove('open');
    confirmModal.classList.remove('open');
  }
  window.location.href = '/products';
}

// Initial pull on load
document.addEventListener('DOMContentLoaded', async () => {
  if (userToken) syncCartFromServer();
  try {
    await loadRazorpayScript();
  } catch (err) {
    console.warn('Razorpay script failed to load:', err);
  }
  injectRazorpayButton();
});
