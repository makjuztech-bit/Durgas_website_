let cartItems = [];
let isBuyNowMode = false;

function openCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  if (overlay && sidebar) {
    overlay.classList.add('open');
    sidebar.classList.add('open');
    renderCart();
  } else {
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

async function addToCart(e, productId, quantity = 1) {
  if (e && e.stopPropagation) e.stopPropagation();
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  if (!currentUser) {
    // Add locally to cart for guests
    addGuestItem(productId, qty);
    return;
  }
  try {
    const res = await apiFetch('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: qty }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.message || 'Could not add to bag.');
      return;
    }
    await syncCartFromServer();
    openCart();
  } catch (err) {
    console.error(err);
    addGuestItem(productId, qty);
  }
}

async function addGuestItem(productId, quantity = 1) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  try {
    const res = await fetch(API + '/products/' + productId);
    if (!res.ok) return;
    const p = await res.json();
    const existing = cartItems.find(i => i.id === p.id || i.product_id === p.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cartItems.push({
        id: p.id,
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: qty,
        image: getProductImage(p),
        sku: p.sku || ('DJ-' + p.id),
        metal_composition: p.metal_composition || p.material
      });
    }
    saveLocalCart();
    renderCart();
    openCart();
  } catch (e) {
    console.error('Guest cart add failed:', e);
  }
}

function saveLocalCart() {
  try {
    localStorage.setItem('durgas_local_cart', JSON.stringify(cartItems));
  } catch (e) {}
  updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
}

function loadLocalCart() {
  try {
    const saved = localStorage.getItem('durgas_local_cart');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

async function syncCartFromServer() {
  const localItems = loadLocalCart();
  if (!currentUser) {
    cartItems = localItems;
    updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
    renderCart();
    return;
  }
  try {
    const res = await apiFetch('/cart');
    if (res.ok) {
      const serverItems = await res.json();
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        cartItems = serverItems;
      } else if (localItems.length > 0) {
        cartItems = localItems;
        // Sync local items to server in background
        for (const it of localItems) {
          const pid = it.product_id || it.id;
          apiFetch('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ product_id: pid, quantity: it.quantity || 1 }),
          }).catch(() => {});
        }
      } else {
        cartItems = [];
      }
      updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
      renderCart();
    }
  } catch (err) {
    console.error('Cart sync notice:', err.message);
    cartItems = localItems;
    renderCart();
  }
}

async function removeFromCart(id) {
  if (currentUser) {
    try {
      await apiFetch('/cart/' + id, { method: 'DELETE' });
      await syncCartFromServer();
      return;
    } catch (err) {
      console.error(err);
    }
  }
  cartItems = cartItems.filter(i => (i.id !== id && i.product_id !== id));
  saveLocalCart();
  renderCart();
}

async function updateCartQuantity(id, quantity) {
  const nextQuantity = Number(quantity);
  if (!Number.isInteger(nextQuantity) || nextQuantity < 1) return removeFromCart(id);
  if (currentUser) {
    try {
      const res = await apiFetch('/cart/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: nextQuantity }),
      });
      if (res.ok) {
        await syncCartFromServer();
        return;
      }
    } catch (err) {
      console.error('Cart quantity update failed:', err);
    }
  }
  const item = cartItems.find(i => i.id === id || i.product_id === id);
  if (item) {
    item.quantity = nextQuantity;
    saveLocalCart();
    renderCart();
  }
}

function updateCartBadge(total) {
  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.textContent = total;
}

// Render Order Page and Sidebar
function renderCart() {
  const totalQty = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);
  const subtotalBeforeGst = Math.round((totalAmount / 1.03) * 100) / 100;
  const gstAmount = Math.round((totalAmount - subtotalBeforeGst) * 100) / 100;

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
            <img src="${i.image || getProductImage(i)}" style="width:100%;height:100%;object-fit:cover">
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">${i.name}</p>
            <p class="cart-item-meta">Qty: <button onclick="updateCartQuantity(${i.id}, ${(i.quantity || 1) - 1})">−</button> ${i.quantity || 1} <button onclick="updateCartQuantity(${i.id}, ${(i.quantity || 1) + 1})">+</button></p>
            <p class="cart-item-price">${formatPrice(i.price * (i.quantity || 1))}</p>
            <button class="cart-item-remove" onclick="removeFromCart(${i.id})">Remove</button>
          </div>
        </div>`).join('');
      const totalEl = document.getElementById('cartTotal');
      if (totalEl) totalEl.innerHTML = `${formatPrice(totalAmount)}`;
      sidebarFooter.style.display = 'block';
    }
  }

  // 2. Order Page rendering (/cart)
  const orderContainer = document.getElementById('orderItemsContainer');
  const emptyState = document.getElementById('cartEmptyState');
  const mainGrid = document.getElementById('orderMainGrid');

  if (orderContainer && emptyState && mainGrid) {
    if (!cartItems.length) {
      emptyState.style.display = 'block';
      mainGrid.style.display = 'none';
      if (typeof loadCartEmptyRecommendations === 'function') loadCartEmptyRecommendations();
      return;
    }

    emptyState.style.display = 'none';
    mainGrid.style.display = 'grid';

    const countBadge = document.getElementById('orderItemsCountBadge');
    if (countBadge) countBadge.textContent = `${totalQty} piece${totalQty > 1 ? 's' : ''}`;

    orderContainer.innerHTML = cartItems.map(i => {
      const q = i.quantity || 1;
      const lineTotal = Number(i.price) * q;
      const sku = i.sku || ('DJ-' + (i.product_id || i.id));
      const img = i.image || getProductImage(i);
      return `
        <div class="order-item-row">
          <img src="${img}" alt="${i.name}" class="order-item-thumb">
          <div style="flex:1;">
            <p style="font-weight:600;font-size:0.95rem;margin:0 0 4px;color:#222">${i.name}</p>
            <p style="font-size:0.75rem;color:#777;margin:0 0 8px;">SKU: ${sku} ${i.size ? `· Size: ${i.size}` : ''}</p>
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="wa-qty-picker" style="padding:2px 8px;">
                <button type="button" onclick="updateCartQuantity(${i.id}, ${q - 1})">−</button>
                <input type="number" value="${q}" readonly style="width:30px">
                <button type="button" onclick="updateCartQuantity(${i.id}, ${q + 1})">+</button>
              </div>
              <button type="button" onclick="removeFromCart(${i.id})" style="background:none;border:none;color:#c0392b;font-size:0.78rem;cursor:pointer;text-decoration:underline">Remove</button>
            </div>
          </div>
          <div style="text-align:right">
            <p style="font-size:0.8rem;color:#777;margin:0">Unit: ${formatPrice(i.price)}</p>
            <p style="font-size:1.05rem;font-weight:600;color:var(--maroon, #6B1724);margin:4px 0 0">${formatPrice(lineTotal)}</p>
          </div>
        </div>`;
    }).join('');

    // Update Price Summary
    const subtotalEl = document.getElementById('orderSummarySubtotal');
    if (subtotalEl) subtotalEl.textContent = formatPrice(totalAmount);

    const gstEl = document.getElementById('orderSummaryGst');
    if (gstEl) gstEl.textContent = `₹${gstAmount.toLocaleString('en-IN')} (Included)`;

    const finalTotalEl = document.getElementById('orderSummaryFinalTotal');
    if (finalTotalEl) finalTotalEl.textContent = formatPrice(totalAmount);
  }
}

// Load recommendations for empty cart page
async function loadCartEmptyRecommendations() {
  const container = document.getElementById('cartEmptyRecommendations');
  if (!container) return;
  try {
    const res = await fetch(API + '/products?limit=4');
    if (!res.ok) return;
    const prods = await res.json();
    if (!Array.isArray(prods) || !prods.length) return;
    container.innerHTML = prods.slice(0, 4).map(p => {
      const img = getProductImage(p);
      return `
        <div style="background:#FAF8F5; border:1px solid #EAE5D9; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; text-align:left; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="height:140px; background:#fff; overflow:hidden; position:relative;">
            <img src="${img}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80'">
          </div>
          <div style="padding:12px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <p style="font-weight:600; font-size:0.85rem; color:#222; margin:0 0 4px; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${p.name}</p>
              <p style="color:var(--maroon,#6B1724); font-weight:700; font-size:0.95rem; margin:0 0 10px;">${formatPrice(p.price)}</p>
            </div>
            <button type="button" class="btn-primary" onclick="quickAddPieceToCart(${p.id})" style="width:100%; padding:8px 10px; font-size:0.78rem; justify-content:center; cursor:pointer;">
              <span>+ Add to Bag &amp; Checkout</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Failed to load cart recommendations:', e);
  }
}

// Quick add a specific jewellery piece and show checkout
async function quickAddPieceToCart(productId) {
  try {
    const res = await fetch(API + '/products/' + productId);
    if (!res.ok) throw new Error('Product not found');
    const p = await res.json();
    const existing = cartItems.find(i => i.id === p.id || i.product_id === p.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({
        id: p.id,
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: 1,
        image: getProductImage(p),
        sku: p.sku || ('DJ-' + p.id),
        metal_composition: p.metal_composition || p.material
      });
    }
    saveLocalCart();
    renderCart();
    const formEl = document.getElementById('orderMainGrid');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    console.error('Quick add failed:', e);
  }
}

// 1-Click Sample piece add for immediate checkout test
async function addSampleItemAndCheckout() {
  try {
    const res = await fetch(API + '/products?limit=1');
    if (res.ok) {
      const prods = await res.json();
      if (Array.isArray(prods) && prods.length > 0) {
        await quickAddPieceToCart(prods[0].id);
        return;
      }
    }
  } catch (e) {
    console.error(e);
  }
  // Fallback default five-metal item
  cartItems = [{
    id: 12,
    product_id: 12,
    name: 'Five-Metal Heavy Suriya Kappu Kada',
    price: 3450,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
    sku: 'DJ-12',
    metal_composition: 'Authentic Five Metals (Panchaloha)'
  }];
  saveLocalCart();
  renderCart();
  const formEl = document.getElementById('orderMainGrid');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
}

// Customer Form Data Helpers
function getOrderFormData() {
  return {
    customer_name: document.getElementById('orderCustName')?.value.trim() || '',
    customer_phone: document.getElementById('orderCustPhone')?.value.trim() || '',
    customer_email: document.getElementById('orderCustEmail')?.value.trim() || '',
    shipping_address: document.getElementById('orderCustAddress')?.value.trim() || '',
    shipping_city: document.getElementById('orderCustCity')?.value.trim() || '',
    shipping_state: document.getElementById('orderCustState')?.value.trim() || '',
    shipping_pincode: document.getElementById('orderCustPincode')?.value.trim() || '',
  };
}

function validateOrderFormData(data) {
  const errEl = document.getElementById('orderFormError');
  const fields = ['orderCustName', 'orderCustPhone', 'orderCustAddress', 'orderCustCity', 'orderCustState', 'orderCustPincode'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });

  const showError = (msg, inputId) => {
    if (errEl) {
      errEl.textContent = '⚠️ ' + msg;
      errEl.style.display = 'block';
      errEl.style.padding = '8px 12px';
      errEl.style.background = '#FDF2F2';
      errEl.style.border = '1px solid #F5C6CB';
      errEl.style.borderRadius = '4px';
    }
    const inputEl = document.getElementById(inputId);
    if (inputEl) {
      inputEl.style.borderColor = '#c0392b';
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!data.customer_name) {
    showError('Please enter your Full Name for delivery.', 'orderCustName');
    return false;
  }
  if (!/^[0-9+ ()-]{10,16}$/.test(data.customer_phone)) {
    showError('Please enter a valid 10-digit mobile phone number.', 'orderCustPhone');
    return false;
  }
  if (!data.shipping_address) {
    showError('Please enter your complete doorstep street address.', 'orderCustAddress');
    return false;
  }
  if (!data.shipping_city) {
    showError('Please enter your City.', 'orderCustCity');
    return false;
  }
  if (!data.shipping_state) {
    showError('Please enter your State.', 'orderCustState');
    return false;
  }
  if (!/^\d{6}$/.test(data.shipping_pincode)) {
    showError('Please enter a valid 6-digit postal pincode.', 'orderCustPincode');
    return false;
  }
  if (errEl) errEl.style.display = 'none';
  return true;
}

function saveCustomerDetailsLocally(data) {
  try {
    localStorage.setItem('durgas_customer_details', JSON.stringify({
      name: data.customer_name,
      phone: data.customer_phone,
      email: data.customer_email,
      address: data.shipping_address,
      city: data.shipping_city,
      state: data.shipping_state,
      pincode: data.shipping_pincode,
    }));
  } catch (e) {}
}

function autofillCustomerForm() {
  try {
    const saved = JSON.parse(localStorage.getItem('durgas_customer_details') || '{}');
    const nameInput = document.getElementById('orderCustName');
    const phoneInput = document.getElementById('orderCustPhone');
    const emailInput = document.getElementById('orderCustEmail');
    const addrInput = document.getElementById('orderCustAddress');
    const cityInput = document.getElementById('orderCustCity');
    const stateInput = document.getElementById('orderCustState');
    const pinInput = document.getElementById('orderCustPincode');

    if (nameInput) nameInput.value = (currentUser?.full_name) || saved.name || '';
    if (phoneInput) phoneInput.value = (currentUser?.phone) || saved.phone || '';
    if (emailInput) emailInput.value = (currentUser?.email) || saved.email || '';
    if (addrInput) addrInput.value = (currentUser?.address) || saved.address || '';
    if (cityInput) cityInput.value = (currentUser?.city) || saved.city || '';
    if (stateInput) stateInput.value = (currentUser?.state) || saved.state || '';
    if (pinInput) pinInput.value = (currentUser?.pincode) || saved.pincode || '';
  } catch (e) {}
}

// WhatsApp Order Submission
function submitOrderViaWhatsApp() {
  if (!cartItems.length) {
    alert('Your shopping bag is empty.');
    return;
  }

  const data = getOrderFormData();
  if (!validateOrderFormData(data)) {
    return;
  }

  saveCustomerDetailsLocally(data);

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);
  const waNumber = '917448882444';

  let msg = `*NEW ORDER INQUIRY — DURGAS JEWELLERY*\n\n`;
  msg += `*Selected Jewellery Items:*\n`;
  cartItems.forEach((item, idx) => {
    const q = item.quantity || 1;
    const lineTotal = Number(item.price) * q;
    const sku = item.sku || ('DJ-' + (item.product_id || item.id));
    msg += `${idx + 1}. ${item.name} (${sku})\n`;
    if (item.metal_composition) msg += `   Composition: ${item.metal_composition}\n`;
    if (item.size) msg += `   Size/Variant: ${item.size}\n`;
    msg += `   Qty: ${q} | Price: ₹${Number(item.price).toLocaleString('en-IN')} | Total: ₹${lineTotal.toLocaleString('en-IN')}\n\n`;
  });

  msg += `*Subtotal:* ₹${totalAmount.toLocaleString('en-IN')}\n`;
  msg += `*Insured Delivery:* Free Delivery across India\n`;
  msg += `*Final Payable:* ₹${totalAmount.toLocaleString('en-IN')}\n\n`;

  msg += `*Customer Delivery Details:*\n`;
  msg += `Name: ${data.customer_name}\n`;
  msg += `Phone: ${data.customer_phone}\n`;
  if (data.customer_email) msg += `Email: ${data.customer_email}\n`;
  msg += `Address: ${data.shipping_address}, ${data.shipping_city}, ${data.shipping_state} - ${data.shipping_pincode}\n\n`;
  msg += `Please verify availability and send order confirmation.`;

  // Record order asynchronously in background
  try {
    fetch(API + '/orders/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        shipping_address: `${data.shipping_address}, ${data.shipping_city}, ${data.shipping_state} - ${data.shipping_pincode}`,
        items: cartItems.map(i => ({
          name: i.name,
          sku: i.sku || ('DJ-' + (i.product_id || i.id)),
          quantity: i.quantity || 1,
          price: i.price,
          metal_composition: i.metal_composition || ''
        })),
        total_amount: totalAmount,
        notes: 'Initiated via Website Order Page'
      })
    }).catch(() => {});
  } catch (e) {}

  // Open WhatsApp
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// Cash on Delivery / Direct Online Order Submission
async function submitDirectOrder(method = 'cod') {
  if (!cartItems.length) {
    alert('Your bag is empty.');
    return;
  }

  const data = getOrderFormData();
  if (!validateOrderFormData(data)) {
    return;
  }

  saveCustomerDetailsLocally(data);

  if (method === 'online') {
    return placeRazorpayOrder();
  }

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);
  const codBtn = document.getElementById('btnPlaceOrderCod');
  const originalCodText = codBtn ? codBtn.innerHTML : '';
  if (codBtn) {
    codBtn.disabled = true;
    codBtn.innerHTML = '<span>Placing Order...</span>';
  }

  const body = {
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email || undefined,
    shipping_address: data.shipping_address,
    shipping_city: data.shipping_city,
    shipping_state: data.shipping_state,
    shipping_pincode: data.shipping_pincode,
    shipping_phone: data.customer_phone,
    payment_method: 'cod',
    items: cartItems
  };

  try {
    const res = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.message || 'Order could not be recorded.');
      if (codBtn) { codBtn.disabled = false; codBtn.innerHTML = originalCodText; }
      return;
    }
    showOrderConfirmation(result.order_number || ('DJ-ORD-' + Date.now()), totalAmount, false);
  } catch (err) {
    console.error('Order submission failed:', err);
    alert('An unexpected error occurred while placing the order. Please try again or order via WhatsApp.');
    if (codBtn) { codBtn.disabled = false; codBtn.innerHTML = originalCodText; }
  }
}

async function placeRazorpayOrder() {
  if (!cartItems.length) {
    alert('Your bag is empty.');
    return;
  }

  const data = getOrderFormData();
  if (!validateOrderFormData(data)) {
    return;
  }

  saveCustomerDetailsLocally(data);

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);

  const onlineBtn = document.getElementById('btnPayOnlineRazorpay');
  const originalText = onlineBtn ? onlineBtn.innerHTML : '';
  if (onlineBtn) {
    onlineBtn.disabled = true;
    onlineBtn.innerHTML = '<span>Initiating Payment...</span>';
  }

  try {
    const res = await apiFetch('/orders/payment', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city,
        shipping_state: data.shipping_state,
        shipping_pincode: data.shipping_pincode,
        shipping_phone: data.customer_phone,
        items: cartItems
      })
    });

    const paymentOrder = await res.json();
    if (!res.ok) {
      alert(paymentOrder.message || 'Unable to initialize online payment gateway.');
      if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
      return;
    }

    if (typeof Razorpay === 'undefined') {
      alert('Razorpay payment gateway script is still loading. Please check your internet connection and try again.');
      if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
      return;
    }

    const options = {
      key: paymentOrder.key,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || 'INR',
      name: 'Durgas Five Metal Jewellery',
      description: 'Handcrafted Authentic Five-Metal Jewellery',
      image: '/durgas main logo.jpeg',
      order_id: paymentOrder.id,
      handler: async function (response) {
        try {
          const verifyRes = await apiFetch('/orders/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              customer_email: data.customer_email || undefined,
              shipping_address: data.shipping_address,
              shipping_city: data.shipping_city,
              shipping_state: data.shipping_state,
              shipping_pincode: data.shipping_pincode,
              shipping_phone: data.customer_phone,
              items: cartItems
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            alert(verifyData.message || 'Payment verification failed. Please contact customer support.');
            if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
            return;
          }

          showOrderConfirmation(verifyData.order_number || ('DJ-ORD-' + Date.now()), totalAmount, true);
        } catch (vErr) {
          console.error('Verification error:', vErr);
          alert('Payment was recorded but verification network failed. Please contact support with Payment ID: ' + response.razorpay_payment_id);
          if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
        }
      },
      prefill: {
        name: data.customer_name,
        email: data.customer_email || (currentUser?.email || ''),
        contact: data.customer_phone
      },
      theme: {
        color: '#6B1724'
      },
      modal: {
        ondismiss: function () {
          if (onlineBtn) {
            onlineBtn.disabled = false;
            onlineBtn.innerHTML = originalText;
          }
          apiFetch('/orders/payment/failure', {
            method: 'POST',
            body: JSON.stringify({ razorpay_order_id: paymentOrder.id })
          }).catch(() => {});
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      alert('Payment failed: ' + (resp.error?.description || 'Transaction declined'));
      if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
      apiFetch('/orders/payment/failure', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: paymentOrder.id,
          razorpay_payment_id: resp.error?.metadata?.payment_id
        })
      }).catch(() => {});
    });
    rzp.open();
  } catch (err) {
    console.error('Razorpay initialization failed:', err);
    alert('Failed to connect to payment gateway. Please try Cash on Delivery or WhatsApp order.');
    if (onlineBtn) { onlineBtn.disabled = false; onlineBtn.innerHTML = originalText; }
  }
}

let shopUpiId = '7448882444@upi';

async function fetchShopSettings() {
  try {
    const res = await fetch(API + '/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.upi_id) shopUpiId = data.upi_id;
    }
  } catch (e) {}
}

async function openUpiModal() {
  if (!cartItems.length) {
    alert('Your bag is empty. Please select a jewellery piece first.');
    return;
  }

  const data = getOrderFormData();
  saveCustomerDetailsLocally(data);
  await fetchShopSettings();

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);

  const amountEl = document.getElementById('upiPayableAmount');
  if (amountEl) amountEl.textContent = formatPrice(totalAmount);

  const upiDisplayEl = document.getElementById('upiIdDisplay');
  if (upiDisplayEl) upiDisplayEl.textContent = shopUpiId;

  // Construct standard UPI payment link
  const orderRef = 'DUR-' + Date.now().toString(36).toUpperCase();
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent('DURGAS FIVE METAL JEWELLERY')}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(orderRef)}`;

  // Generate dynamic QR Code
  const qrImg = document.getElementById('upiQrCodeImg');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUri)}`;
  }

  const intentBtn = document.getElementById('upiIntentBtn');
  if (intentBtn) {
    intentBtn.href = upiIntentUri;
    intentBtn.onclick = function(e) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile) {
        e.preventDefault();
        alert('UPI App links open directly on mobile phones with GPay, PhonePe, or Paytm installed.\n\nOn laptop/desktop, please scan the QR Code on screen using your mobile phone camera or UPI app.');
      }
    };
  }

  // Update address preview status
  const addrSummaryEl = document.getElementById('upiModalAddressSummary');
  const modalErr = document.getElementById('upiModalError');
  if (modalErr) modalErr.style.display = 'none';

  if (addrSummaryEl) {
    if (data.customer_name && data.customer_phone && data.shipping_address) {
      addrSummaryEl.innerHTML = `📍 <strong>Delivering to:</strong> ${data.customer_name} (${data.customer_phone}), ${data.shipping_address}, ${data.shipping_city || ''} - ${data.shipping_pincode || ''}`;
      addrSummaryEl.style.color = '#27ae60';
      addrSummaryEl.style.borderColor = '#b7eb8f';
    } else {
      addrSummaryEl.innerHTML = `⚠️ <em>Delivery address is not yet filled. You can scan and pay now, but please ensure your delivery address is filled before final order submission.</em>`;
      addrSummaryEl.style.color = '#856404';
      addrSummaryEl.style.borderColor = '#ffe58f';
    }
  }

  const overlay = document.getElementById('upiOverlay');
  const modal = document.getElementById('upiModal');
  if (overlay && modal) {
    overlay.classList.add('open');
    modal.classList.add('open');
  }
}

function closeUpiModal() {
  const overlay = document.getElementById('upiOverlay');
  const modal = document.getElementById('upiModal');
  if (overlay && modal) {
    overlay.classList.remove('open');
    modal.classList.remove('open');
  }
}

function copyUpiId() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shopUpiId).then(() => {
      const btn = document.getElementById('btnCopyUpi');
      if (btn) {
        btn.textContent = '✓ Copied!';
        btn.style.color = '#27ae60';
        setTimeout(() => {
          btn.textContent = '📋 Copy UPI ID';
          btn.style.color = '#8B6914';
        }, 2000);
      }
    }).catch(() => fallbackCopyUpi());
  } else {
    fallbackCopyUpi();
  }
}

function fallbackCopyUpi() {
  const temp = document.createElement('textarea');
  temp.value = shopUpiId;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
  const btn = document.getElementById('btnCopyUpi');
  if (btn) {
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy UPI ID'; }, 2000);
  }
}

async function submitUpiOrder() {
  if (!cartItems.length) {
    alert('Your bag is empty.');
    return;
  }

  const data = getOrderFormData();
  const modalErr = document.getElementById('upiModalError');

  if (!validateOrderFormData(data)) {
    if (modalErr) {
      const errEl = document.getElementById('orderFormError');
      modalErr.textContent = '⚠️ ' + (errEl?.textContent || 'Please complete your Name, Phone Number, and Delivery Address on the form below.');
      modalErr.style.display = 'block';
    }
    const nameField = document.getElementById('orderCustName');
    if (nameField) {
      setTimeout(() => {
        closeUpiModal();
        nameField.focus();
        nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1200);
    }
    return;
  }
  if (modalErr) modalErr.style.display = 'none';

  const utr = (document.getElementById('upiUtrNumber')?.value || '').trim();
  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);

  const confirmBtn = document.getElementById('btnConfirmUpiOrder');
  const origText = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span>Recording Order...</span>';
  }

  const body = {
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email || undefined,
    shipping_address: data.shipping_address,
    shipping_city: data.shipping_city,
    shipping_state: data.shipping_state,
    shipping_pincode: data.shipping_pincode,
    shipping_phone: data.customer_phone,
    payment_method: 'upi',
    utr_number: utr,
    items: cartItems
  };

  try {
    const res = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) {
      if (modalErr) {
        modalErr.textContent = result.message || 'Order could not be recorded.';
        modalErr.style.display = 'block';
      } else {
        alert(result.message || 'Order could not be recorded.');
      }
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = origText; }
      return;
    }
    closeUpiModal();
    showOrderConfirmation(result.order_number || ('DJ-ORD-' + Date.now()), totalAmount, false);
  } catch (err) {
    console.error('UPI order submission failed:', err);
    if (modalErr) {
      modalErr.textContent = 'An unexpected error occurred while placing the order. Please try again or order via WhatsApp.';
      modalErr.style.display = 'block';
    } else {
      alert('An unexpected error occurred while placing the order. Please try again or order via WhatsApp.');
    }
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = origText; }
  }
}

function showOrderConfirmation(orderNumber, totalAmount, isOnline = false) {
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');

  if (confirmMessage) {
    confirmMessage.textContent = `Order ${orderNumber} placed successfully! Total Amount: ${formatPrice(totalAmount)}${isOnline ? ' (Paid Online)' : ' (Cash on Delivery)'}`;
  }
  if (confirmOverlay && confirmModal) {
    confirmOverlay.classList.add('open');
    confirmModal.classList.add('open');
  } else {
    alert(`Order ${orderNumber} placed successfully! Total: ${formatPrice(totalAmount)}`);
    window.location.href = '/products';
  }

  // Clear cart and buy-now data
  cartItems = [];
  try {
    localStorage.removeItem('durgas_local_cart');
    sessionStorage.removeItem('durgas_buy_now');
  } catch (e) {}
  updateCartBadge(0);
  renderCart();
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

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  // Check for Buy Now mode
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('buynow') === '1') {
    try {
      const buyNowRaw = sessionStorage.getItem('durgas_buy_now');
      if (buyNowRaw) {
        const buyNowData = JSON.parse(buyNowRaw);
        if (buyNowData && buyNowData.product) {
          isBuyNowMode = true;
          cartItems = [{
            id: buyNowData.product.id,
            product_id: buyNowData.product.id,
            name: buyNowData.product.name,
            price: Number(buyNowData.product.price),
            quantity: buyNowData.quantity || 1,
            image: getProductImage(buyNowData.product),
            sku: buyNowData.product.sku || ('DJ-' + buyNowData.product.id),
            metal_composition: buyNowData.product.metal_composition || buyNowData.product.material,
            size: buyNowData.size || ''
          }];
          updateCartBadge(buyNowData.quantity || 1);
        }
      }
    } catch (e) {
      console.error('Buy Now initialization error:', e);
    }
  }

  if (!isBuyNowMode) {
    if (currentUser) {
      await syncCartFromServer();
    } else {
      cartItems = loadLocalCart();
      updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
    }
  }

  renderCart();
  autofillCustomerForm();
});
