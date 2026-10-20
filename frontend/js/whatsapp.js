/**
 * DURGAS JEWELLERY — WhatsApp Ordering System
 * Official Business Number: 917448882444
 */

const DURGAS_WHATSAPP = {
  number: '917448882444',
  shopName: 'Durgas Jewellery',
  deliveryCharge: 0,
  
  getApiUrl(endpoint) {
    if (typeof API !== 'undefined' && API) {
      return API + endpoint;
    }
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const base = isLocal ? (window.location.port !== '5000' ? 'http://localhost:5000' : '') : 'https://durgas-backend.onrender.com';
    return (base ? base.replace(/\/+$/, '') : '') + '/api' + endpoint;
  },

  async init() {
    try {
      const res = await fetch(this.getApiUrl('/settings'));
      if (res.ok) {
        const data = await res.json();
        if (data.whatsapp_number) this.number = data.whatsapp_number.replace(/\D/g, '');
        if (data.store_name) this.shopName = data.store_name;
        if (data.delivery_charge !== undefined) this.deliveryCharge = parseFloat(data.delivery_charge) || 0;
      }
    } catch (e) {
      console.warn('[WhatsApp] Settings fallback in use:', this.number);
    }
    this.injectModals();
    this.injectFloatingButton();
  },

  getCleanNumber() {
    return (this.number || '917448882444').replace(/\D/g, '');
  },

  getSavedCustomer() {
    try {
      const saved = JSON.parse(localStorage.getItem('durgas_customer_details') || '{}');
      if (window.currentUser) {
        return {
          name: window.currentUser.full_name || saved.name || '',
          phone: window.currentUser.phone || saved.phone || '',
          address: window.currentUser.address || saved.address || '',
          city: window.currentUser.city || saved.city || '',
          pincode: window.currentUser.pincode || saved.pincode || '',
        };
      }
      return saved;
    } catch (e) {
      return {};
    }
  },

  saveCustomer(details) {
    try {
      localStorage.setItem('durgas_customer_details', JSON.stringify(details));
    } catch (e) {}
  },

  formatInr(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  },

  /**
   * Build official Click-to-Chat URL
   */
  buildChatUrl(message) {
    const phone = this.getCleanNumber();
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encoded}`;
  },

  /**
   * Generate Single Product Order WhatsApp Message
   */
  buildProductMessage({ product, quantity = 1, size = '', customerName = '', customerPhone = '', deliveryAddress = '' }) {
    const qty = parseInt(quantity, 10) || 1;
    const price = Number(product.price || 0);
    const total = price * qty;
    const prodId = product.sku || ('DJ-PR-' + product.id);
    const prodUrl = window.location.origin + '/product/' + (product.sku || product.id);

    let msg = `Hello ${this.shopName}! I would like to place an order.\n\n`;
    msg += `Product: ${product.name}\n`;
    msg += `Product ID: ${prodId}\n`;
    if (product.material || product.metal_composition) {
      msg += `Metal / Composition: ${product.metal_composition || product.material}\n`;
    }
    if (size) msg += `Selected Size / Weight: ${size}\n`;
    else if (product.weight) msg += `Weight: ${product.weight}g\n`;
    
    msg += `Quantity: ${qty}\n`;
    msg += `Price: ${this.formatInr(price)}\n`;
    msg += `Total: ${this.formatInr(total)}\n\n`;

    msg += `Customer Name: ${customerName || '[Customer Name]'}\n`;
    msg += `Phone: ${customerPhone || '[Customer Phone]'}\n`;
    msg += `Delivery Address: ${deliveryAddress || '[Customer Address]'}\n\n`;
    msg += `Product Link: ${prodUrl}\n\n`;
    msg += `Please confirm product availability, delivery charges, and payment details.`;

    return msg;
  },

  /**
   * Generate Multi-Item Cart Order WhatsApp Message
   */
  buildCartMessage({ items, customerName = '', customerPhone = '', deliveryAddress = '' }) {
    let msg = `Hello ${this.shopName}! I would like to place an order for the items in my cart:\n\n`;

    let subtotal = 0;
    items.forEach((item, index) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = Number(item.price || 0);
      const lineTotal = price * qty;
      subtotal += lineTotal;
      const code = item.sku || ('DJ-' + (item.product_id || item.id));

      msg += `${index + 1}. ${item.name} (${code})\n`;
      if (item.metal_composition) msg += `   Composition: ${item.metal_composition}\n`;
      msg += `   Qty: ${qty} | Unit Price: ${this.formatInr(price)} | Total: ${this.formatInr(lineTotal)}\n\n`;
    });

    const delivery = this.deliveryCharge > 0 ? this.deliveryCharge : 0;
    const finalTotal = subtotal + delivery;

    msg += `Items Subtotal: ${this.formatInr(subtotal)}\n`;
    if (delivery > 0) {
      msg += `Delivery Charges: ${this.formatInr(delivery)}\n`;
    } else {
      msg += `Delivery: Free Delivery\n`;
    }
    msg += `Estimated Total: ${this.formatInr(finalTotal)}\n\n`;

    msg += `Customer Details:\n`;
    msg += `Name: ${customerName || '[Customer Name]'}\n`;
    msg += `Phone: ${customerPhone || '[Customer Phone]'}\n`;
    msg += `Delivery Address: ${deliveryAddress || '[Customer Address]'}\n\n`;

    msg += `Please confirm product availability, delivery charges, and payment details.`;
    return msg;
  },

  /**
   * Record Inquiry in Backend Orders System
   */
  async recordInquiry({ customerName, customerPhone, shippingAddress, items, totalAmount, notes }) {
    try {
      await fetch(this.getApiUrl('/orders/whatsapp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          items: items,
          total_amount: totalAmount,
          notes: notes,
        }),
      });
    } catch (e) {
      console.warn('[WhatsApp] Async inquiry record notice:', e.message);
    }
  },

  /**
   * Inject Modals into DOM
   */
  injectModals() {
    if (document.getElementById('waOrderModal')) return;

    const modalHtml = `
      <!-- Single Product WhatsApp Order Modal -->
      <div id="waOrderOverlay" class="wa-overlay" onclick="DURGAS_WHATSAPP.closeProductModal()"></div>
      <div id="waOrderModal" class="wa-modal">
        <div class="wa-modal-header">
          <div class="wa-brand">
            <span class="wa-icon-bubble">💬</span>
            <div>
              <h3>Order on WhatsApp</h3>
              <p>DURGAS FIVE METAL JEWELLERY · Official Shop Support</p>
            </div>
          </div>
          <button class="wa-close-btn" onclick="DURGAS_WHATSAPP.closeProductModal()">&times;</button>
        </div>
        
        <div class="wa-modal-body">
          <div id="waProductSummary" class="wa-product-summary"></div>

          <form id="waOrderForm" onsubmit="DURGAS_WHATSAPP.submitProductOrder(event)">
            <div class="wa-form-row">
              <label>Your Full Name *</label>
              <input type="text" id="waCustName" required placeholder="e.g. Meenakshi Sundaram" class="wa-input">
            </div>

            <div class="wa-form-row">
              <label>WhatsApp / Mobile Number *</label>
              <input type="tel" id="waCustPhone" required placeholder="e.g. 9876543210" pattern="[0-9]{10,13}" class="wa-input">
            </div>

            <div class="wa-form-row" id="waSizeRow" style="display:none">
              <label>Select Size / Variant</label>
              <select id="waCustSize" class="wa-input"></select>
            </div>

            <div class="wa-form-row">
              <label>Quantity</label>
              <div class="wa-qty-picker">
                <button type="button" onclick="DURGAS_WHATSAPP.changeQty(-1)">−</button>
                <input type="number" id="waCustQty" value="1" min="1" max="50" readonly>
                <button type="button" onclick="DURGAS_WHATSAPP.changeQty(1)">+</button>
              </div>
            </div>

            <div class="wa-form-row">
              <label>Delivery Address & City *</label>
              <textarea id="waCustAddress" required rows="2" placeholder="Door No, Street Name, Area, City & Pincode" class="wa-input"></textarea>
            </div>

            <div class="wa-pricing-box">
              <div class="wa-price-row">
                <span>Unit Price:</span>
                <strong id="waUnitPrice">₹0</strong>
              </div>
              <div class="wa-price-row wa-total-row">
                <span>Total Amount:</span>
                <strong id="waTotalPrice">₹0</strong>
              </div>
              <small class="wa-note">✓ Verified Shop Inquiry · No Immediate Online Payment Required</small>
            </div>

            <button type="submit" class="wa-submit-btn">
              <span>Send Order via WhatsApp</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </form>
        </div>
      </div>

      <!-- Cart WhatsApp Checkout Modal -->
      <div id="waCartOverlay" class="wa-overlay" onclick="DURGAS_WHATSAPP.closeCartModal()"></div>
      <div id="waCartModal" class="wa-modal">
        <div class="wa-modal-header">
          <div class="wa-brand">
            <span class="wa-icon-bubble">🛍️</span>
            <div>
              <h3>WhatsApp Bag Checkout</h3>
              <p>Durgas Jewellery · Quick Order Confirmation</p>
            </div>
          </div>
          <button class="wa-close-btn" onclick="DURGAS_WHATSAPP.closeCartModal()">&times;</button>
        </div>
        
        <div class="wa-modal-body">
          <div id="waCartSummary" class="wa-product-summary"></div>

          <form id="waCartForm" onsubmit="DURGAS_WHATSAPP.submitCartOrder(event)">
            <div class="wa-form-row">
              <label>Your Full Name *</label>
              <input type="text" id="waCartCustName" required placeholder="e.g. K. Vasanth Kumar" class="wa-input">
            </div>

            <div class="wa-form-row">
              <label>WhatsApp / Mobile Number *</label>
              <input type="tel" id="waCartCustPhone" required placeholder="e.g. 9876543210" pattern="[0-9]{10,13}" class="wa-input">
            </div>

            <div class="wa-form-row">
              <label>Delivery Address, City & Pincode *</label>
              <textarea id="waCartCustAddress" required rows="2" placeholder="Full postal delivery address" class="wa-input"></textarea>
            </div>

            <div class="wa-pricing-box">
              <div class="wa-price-row">
                <span>Items Subtotal:</span>
                <strong id="waCartSubtotal">₹0</strong>
              </div>
              <div class="wa-price-row">
                <span>Estimated Delivery:</span>
                <strong id="waCartDelivery">Free</strong>
              </div>
              <div class="wa-price-row wa-total-row">
                <span>Total Amount:</span>
                <strong id="waCartTotal">₹0</strong>
              </div>
              <small class="wa-note">Orders are reviewed and confirmed by Durgas Jewellery on WhatsApp.</small>
            </div>

            <button type="submit" class="wa-submit-btn">
              <span>Checkout via WhatsApp</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </form>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
  },

  /**
   * Inject Floating WhatsApp Help Widget
   */
  injectFloatingButton() {
    if (document.getElementById('waFloatingWidget')) return;
    const phone = this.getCleanNumber();
    const defaultMsg = encodeURIComponent(`Hello ${this.shopName}! I have an inquiry about your fine jewellery collections.`);
    const el = document.createElement('a');
    el.id = 'waFloatingWidget';
    el.href = `https://wa.me/${phone}?text=${defaultMsg}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    el.className = 'wa-floating-btn';
    el.setAttribute('aria-label', 'Chat with Durgas Jewellery on WhatsApp');
    el.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span class="wa-floating-tooltip">Order on WhatsApp · 7448882444</span>
    `;
    document.body.appendChild(el);
  },

  currentOrderProduct: null,

  /**
   * Open Single Product WhatsApp Order Modal
   */
  openProductOrder(product, defaultQty = 1) {
    this.currentOrderProduct = product;
    const overlay = document.getElementById('waOrderOverlay');
    const modal = document.getElementById('waOrderModal');
    if (!overlay || !modal) return;

    const summary = document.getElementById('waProductSummary');
    const img = product.image || (product.images?.[0]?.image_path) || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&q=80';
    const sku = product.sku || ('DJ-' + product.id);

    summary.innerHTML = `
      <img src="${img}" alt="${product.name}" class="wa-summary-img">
      <div class="wa-summary-info">
        <h4>${product.name}</h4>
        <span class="wa-sku-pill">ID: ${sku}</span>
        <p class="wa-metal-pill">⚜ ${product.metal_composition || product.material || 'Verified Metal Composition'}</p>
        <span class="wa-price-highlight">${this.formatInr(product.price)}</span>
      </div>
    `;

    // Sizes dropdown
    const sizeRow = document.getElementById('waSizeRow');
    const sizeSelect = document.getElementById('waCustSize');
    if (product.available_sizes) {
      const sizes = product.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
      if (sizes.length) {
        sizeSelect.innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join('');
        sizeRow.style.display = 'block';
      } else {
        sizeRow.style.display = 'none';
      }
    } else {
      sizeRow.style.display = 'none';
    }

    // Pre-populate customer details
    const cust = this.getSavedCustomer();
    document.getElementById('waCustName').value = cust.name || '';
    document.getElementById('waCustPhone').value = cust.phone || '';
    document.getElementById('waCustAddress').value = [cust.address, cust.city, cust.pincode].filter(Boolean).join(', ');
    document.getElementById('waCustQty').value = defaultQty;

    this.updateModalPrices(product, defaultQty);

    overlay.classList.add('active');
    modal.classList.add('active');
  },

  changeQty(delta) {
    const qtyInput = document.getElementById('waCustQty');
    let q = (parseInt(qtyInput.value, 10) || 1) + delta;
    if (q < 1) q = 1;
    if (q > 50) q = 50;
    qtyInput.value = q;
    if (this.currentOrderProduct) {
      this.updateModalPrices(this.currentOrderProduct, q);
    }
  },

  updateModalPrices(product, qty) {
    const unit = Number(product.price || 0);
    const total = unit * qty;
    document.getElementById('waUnitPrice').textContent = this.formatInr(unit);
    document.getElementById('waTotalPrice').textContent = this.formatInr(total);
  },

  closeProductModal() {
    const overlay = document.getElementById('waOrderOverlay');
    const modal = document.getElementById('waOrderModal');
    if (overlay && modal) {
      overlay.classList.remove('active');
      modal.classList.remove('active');
    }
    this.currentOrderProduct = null;
  },

  submitProductOrder(e) {
    e.preventDefault();
    const product = this.currentOrderProduct;
    if (!product) return;

    const name = document.getElementById('waCustName').value.trim();
    const phone = document.getElementById('waCustPhone').value.trim();
    const address = document.getElementById('waCustAddress').value.trim();
    const qty = parseInt(document.getElementById('waCustQty').value, 10) || 1;
    const size = document.getElementById('waCustSize')?.value || '';

    this.saveCustomer({ name, phone, address });

    const total = Number(product.price) * qty;
    const message = this.buildProductMessage({
      product,
      quantity: qty,
      size,
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
    });

    // Record inquiry in DB asynchronously
    this.recordInquiry({
      customerName: name,
      customerPhone: phone,
      shippingAddress: address,
      items: [{
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: qty,
        size: size,
        metal_composition: product.metal_composition || product.material,
      }],
      totalAmount: total,
      notes: `Single WhatsApp order inquiry for ${product.name} (Qty: ${qty})`,
    });

    this.closeProductModal();

    // Open WhatsApp
    const waUrl = this.buildChatUrl(message);
    window.open(waUrl, '_blank');
  },

  /**
   * Open Cart Checkout WhatsApp Modal
   */
  openCartOrder(items = window.cartItems) {
    if (!items || !items.length) {
      alert('Your shopping bag is empty.');
      return;
    }

    const overlay = document.getElementById('waCartOverlay');
    const modal = document.getElementById('waCartModal');
    if (!overlay || !modal) return;

    const summary = document.getElementById('waCartSummary');
    let subtotal = 0;
    summary.innerHTML = items.map(item => {
      const q = parseInt(item.quantity, 10) || 1;
      const line = Number(item.price || 0) * q;
      subtotal += line;
      const img = item.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&q=80';
      return `
        <div class="wa-cart-summary-item">
          <img src="${img}" alt="">
          <div style="flex:1">
            <p><strong>${item.name}</strong></p>
            <small>Qty: ${q} · ${this.formatInr(item.price)} each</small>
          </div>
          <strong>${this.formatInr(line)}</strong>
        </div>
      `;
    }).join('');

    const delivery = this.deliveryCharge > 0 ? this.deliveryCharge : 0;
    const finalTotal = subtotal + delivery;

    document.getElementById('waCartSubtotal').textContent = this.formatInr(subtotal);
    document.getElementById('waCartDelivery').textContent = delivery > 0 ? this.formatInr(delivery) : 'Free';
    document.getElementById('waCartTotal').textContent = this.formatInr(finalTotal);

    // Populate saved customer details
    const cust = this.getSavedCustomer();
    document.getElementById('waCartCustName').value = cust.name || '';
    document.getElementById('waCartCustPhone').value = cust.phone || '';
    document.getElementById('waCartCustAddress').value = [cust.address, cust.city, cust.pincode].filter(Boolean).join(', ');

    overlay.classList.add('active');
    modal.classList.add('active');
  },

  closeCartModal() {
    const overlay = document.getElementById('waCartOverlay');
    const modal = document.getElementById('waCartModal');
    if (overlay && modal) {
      overlay.classList.remove('active');
      modal.classList.remove('active');
    }
  },

  submitCartOrder(e) {
    e.preventDefault();
    const items = window.cartItems || [];
    if (!items.length) return;

    const name = document.getElementById('waCartCustName').value.trim();
    const phone = document.getElementById('waCartCustPhone').value.trim();
    const address = document.getElementById('waCartCustAddress').value.trim();

    this.saveCustomer({ name, phone, address });

    const message = this.buildCartMessage({
      items,
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
    });

    const subtotal = items.reduce((s, i) => s + (Number(i.price || 0) * (parseInt(i.quantity, 10) || 1)), 0);
    const finalTotal = subtotal + (this.deliveryCharge || 0);

    // Record inquiry in DB
    this.recordInquiry({
      customerName: name,
      customerPhone: phone,
      shippingAddress: address,
      items: items.map(i => ({
        product_id: i.product_id || i.id,
        name: i.name,
        sku: i.sku,
        price: i.price,
        quantity: i.quantity,
        metal_composition: i.metal_composition || i.material,
      })),
      totalAmount: finalTotal,
      notes: `Cart WhatsApp checkout inquiry for ${items.length} items`,
    });

    this.closeCartModal();

    // Open WhatsApp
    const waUrl = this.buildChatUrl(message);
    window.open(waUrl, '_blank');
  },
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  DURGAS_WHATSAPP.init();
});
