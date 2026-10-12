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

async function addToCart(e, productId) {
  if (e) e.stopPropagation();
  if (!currentUser) {
    // Add locally to cart for guests
    addGuestItem(productId);
    return;
  }
  try {
    const res = await apiFetch('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
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
    addGuestItem(productId);
  }
}

async function addGuestItem(productId) {
  try {
    const res = await fetch(API + '/products/' + productId);
    if (!res.ok) return;
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
  if (!currentUser) {
    cartItems = loadLocalCart();
    updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
    renderCart();
    return;
  }
  try {
    const res = await apiFetch('/cart');
    if (res.ok) {
      cartItems = await res.json();
      updateCartBadge(cartItems.reduce((s, i) => s + (i.quantity || 1), 0));
      renderCart();
    }
  } catch (err) {
    console.error('Cart sync failed:', err);
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

// Customer Form Data Helpers
function getOrderFormData() {
  return {
    customer_name: document.getElementById('orderCustName')?.value.trim() || '',
    customer_phone: document.getElementById('orderCustPhone')?.value.trim() || '',
    shipping_address: document.getElementById('orderCustAddress')?.value.trim() || '',
    shipping_city: document.getElementById('orderCustCity')?.value.trim() || '',
    shipping_state: document.getElementById('orderCustState')?.value.trim() || '',
    shipping_pincode: document.getElementById('orderCustPincode')?.value.trim() || '',
  };
}

function validateOrderFormData(data) {
  const errEl = document.getElementById('orderFormError');
  if (!data.customer_name) {
    if (errEl) { errEl.textContent = 'Please enter your Full Name.'; errEl.style.display = 'block'; }
    return false;
  }
  if (!/^[0-9+ ()-]{10,16}$/.test(data.customer_phone)) {
    if (errEl) { errEl.textContent = 'Please enter a valid 10-digit mobile phone number.'; errEl.style.display = 'block'; }
    return false;
  }
  if (!data.shipping_address) {
    if (errEl) { errEl.textContent = 'Please enter your complete delivery street address.'; errEl.style.display = 'block'; }
    return false;
  }
  if (!data.shipping_city || !data.shipping_state) {
    if (errEl) { errEl.textContent = 'Please enter city and state.'; errEl.style.display = 'block'; }
    return false;
  }
  if (!/^\d{6}$/.test(data.shipping_pincode)) {
    if (errEl) { errEl.textContent = 'Please enter a valid 6-digit postal pincode.'; errEl.style.display = 'block'; }
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
    const addrInput = document.getElementById('orderCustAddress');
    const cityInput = document.getElementById('orderCustCity');
    const stateInput = document.getElementById('orderCustState');
    const pinInput = document.getElementById('orderCustPincode');

    if (nameInput) nameInput.value = (currentUser?.full_name) || saved.name || '';
    if (phoneInput) phoneInput.value = (currentUser?.phone) || saved.phone || '';
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
    document.getElementById('orderCustName')?.focus();
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
  msg += `Address: ${data.shipping_address}, ${data.shipping_city}, ${data.shipping_state} - ${data.shipping_pincode}\n\n`;
  msg += `Please verify availability and send order confirmation.`;

  // Record order asynchronously in background
  try {
    fetch('/api/orders/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
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
    document.getElementById('orderCustName')?.focus();
    return;
  }

  saveCustomerDetailsLocally(data);

  if (method === 'online') {
    return placeRazorpayOrder();
  }

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);

  const body = {
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    shipping_address: `${data.shipping_address}, ${data.shipping_city}, ${data.shipping_state} - ${data.shipping_pincode}`,
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
      return;
    }
    showOrderConfirmation(result.order_number || ('DJ-ORD-' + Date.now()), totalAmount, false);
  } catch (err) {
    console.error('Order submission failed:', err);
    // If guest or offline, record WhatsApp inquiry and show confirmation
    showOrderConfirmation('DJ-INQ-' + Math.floor(100000 + Math.random() * 900000), totalAmount, false);
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
