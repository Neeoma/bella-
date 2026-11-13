/* Bella Paint — storefront behaviour */
(function () {
  const { COLOURS, PROJECTS, Store, naira, esc, uid, colourById, isLight, roomSVG, bucketSVG, SCENES } = window.Bella;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const state = {
    colour: colourById('calabar'),
    family: 'All',
    category: 'All',
    scene: 'living',
    target: 'accent',
    finish: 'Matt',
    room: { wall: 'cowrie', accent: 'calabar', trim: null },
    cart: Store.cart()
  };

  /* ---------- helpers ---------- */
  function chips(el, items, active, onPick) {
    el.innerHTML = items.map((i) => {
      const id = i.id || i, label = i.label || i;
      return `<button type="button" class="chip${id === active ? ' on' : ''}" data-id="${esc(id)}" aria-pressed="${id === active}">${esc(label)}</button>`;
    }).join('');
    el.onclick = (e) => {
      const b = e.target.closest('.chip');
      if (b) onPick(b.dataset.id);
    };
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function setAccent(c) {
    const root = document.documentElement.style;
    root.setProperty('--accent', c.hex);
    root.setProperty('--on-accent', isLight(c.hex) ? '#15120f' : '#f8f4ec');
  }

  /* ---------- hero ---------- */
  function renderHero() {
    const picks = ['cowrie', 'savannah', 'calabar', 'zobo', 'adire', 'lagoon', 'obudu'].map(colourById);
    $('#heroStrips').innerHTML = picks.map((c, i) =>
      `<button type="button" class="strip" style="--c:${c.hex};--d:${i * 0.09}s;--h:${62 + ((i * 37) % 34)}%" data-id="${c.id}" tabindex="-1" aria-label="${c.name}"></button>`).join('');
    $('#heroStrips').onclick = (e) => {
      const b = e.target.closest('.strip');
      if (b) selectColour(b.dataset.id);
    };
  }

  /* ---------- colour studio ---------- */
  const PAIRS = { Neutrals: ['obudu', 'calabar', 'eko'], Warm: ['cowrie', 'kola', 'mangrove'], Earth: ['shea', 'sage', 'adire'],
    Greens: ['cowrie', 'laterite', 'ebony'], Blues: ['cowrie', 'savannah', 'eko'], Deep: ['shea', 'coral', 'sage'] };

  function renderStudio() {
    const families = ['All'].concat(Array.from(new Set(COLOURS.map((c) => c.family))));
    chips($('#familyChips'), families, state.family, (f) => { state.family = f; renderStudio(); });
    const list = COLOURS.filter((c) => state.family === 'All' || c.family === state.family);
    $('#swatches').innerHTML = list.map((c) =>
      `<button type="button" class="swatch${c.id === state.colour.id ? ' on' : ''}" style="--c:${c.hex}" data-id="${c.id}" aria-pressed="${c.id === state.colour.id}">
        <span class="swatch-fill"></span><span class="swatch-name">${c.name}</span><span class="swatch-code">${c.code}</span>
      </button>`).join('');
    $('#swatches').onclick = (e) => {
      const b = e.target.closest('.swatch');
      if (b) selectColour(b.dataset.id);
    };
    renderColourCard();
  }

  function renderColourCard() {
    const c = state.colour;
    const light = isLight(c.hex);
    const pairs = PAIRS[c.family].map(colourById).filter((p) => p.id !== c.id);
    const card = $('#colourCard');
    card.style.setProperty('--c', c.hex);
    card.classList.toggle('is-light', light);
    card.innerHTML = `
      <div class="cc-top">
        <span class="cc-code">${c.code} · ${c.family}</span>
        <h3>${c.name}</h3>
        <span class="cc-hex">${c.hex.toUpperCase()}</span>
      </div>
      <div class="cc-bottom">
        <span class="label">Pairs well with</span>
        <div class="pairs">${pairs.map((p) =>
          `<button type="button" class="pair" data-id="${p.id}" title="${p.name}"><i style="background:${p.hex}"></i>${p.name}</button>`).join('')}</div>
        <div class="cc-actions">
          <button type="button" class="btn btn-solid" data-act="try">Try on a wall</button>
          <button type="button" class="btn btn-line" data-act="sample">Sample pot · ${naira(2500)}</button>
        </div>
      </div>`;
    card.onclick = (e) => {
      const pair = e.target.closest('.pair');
      if (pair) return selectColour(pair.dataset.id);
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'try') {
        state.room.accent = c.id; state.target = 'accent';
        renderVisualiser();
        $('#visualiser').scrollIntoView({ behavior: 'smooth' });
      } else {
        addToCart({ productId: 'sample', name: 'Sample pot 250ml', size: '250ml', price: 2500, colourId: c.id });
      }
    };
  }

  function selectColour(id) {
    const c = colourById(id);
    if (!c) return;
    state.colour = c;
    setAccent(c);
    $('#heroSwatch').innerHTML = `<i style="background:${c.hex}"></i>${c.name} <span>${c.code}</span>`;
    $$('.strip').forEach((s) => s.classList.toggle('on', s.dataset.id === id));
    renderStudio();
    renderProducts();
  }

  /* ---------- room visualiser ---------- */
  const TARGETS = [{ id: 'accent', label: 'Feature wall' }, { id: 'wall', label: 'Side walls' }, { id: 'trim', label: 'Trim' }];
  const FINISHES = { Matt: 0, Silk: 0.1, Gloss: 0.22 };
  const TRIM_DEFAULT = '#f7f3ec';

  function paintRoom() {
    const r = $('#room'), s = state.room;
    r.style.setProperty('--wall', colourById(s.wall).hex);
    r.style.setProperty('--accent', colourById(s.accent).hex);
    r.style.setProperty('--trim', s.trim ? colourById(s.trim).hex : TRIM_DEFAULT);
    r.style.setProperty('--sheen', FINISHES[state.finish]);
    $('#visCaption').innerHTML =
      `Feature wall <b>${colourById(s.accent).name}</b> · Side walls <b>${colourById(s.wall).name}</b> · Trim <b>${s.trim ? colourById(s.trim).name : 'Brilliant White'}</b> · ${state.finish}`;
    $$('#visSwatches button').forEach((b) => b.classList.toggle('on', b.dataset.id === s[state.target]));
  }

  function renderVisualiser() {
    const room = $('#room');
    if (room.dataset.scene !== state.scene) {
      room.innerHTML = roomSVG(state.scene, 'Illustrated ' + state.scene + ' room preview');
      room.dataset.scene = state.scene;
    }
    chips($('#sceneChips'), SCENES, state.scene, (id) => { state.scene = id; renderVisualiser(); });
    chips($('#targetChips'), TARGETS, state.target, (id) => { state.target = id; renderVisualiser(); });
    chips($('#finishChips'), Object.keys(FINISHES), state.finish, (id) => { state.finish = id; renderVisualiser(); });
    $('#visSwatches').innerHTML = COLOURS.map((c) =>
      `<button type="button" style="background:${c.hex}" data-id="${c.id}" title="${c.name}" aria-label="${c.name}"></button>`).join('');
    $('#visSwatches').onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state.room[state.target] = b.dataset.id;
      paintRoom();
    };
    paintRoom();
  }

  /* ---------- showroom ---------- */
  const toolSVG = `<svg viewBox="0 0 200 220" aria-hidden="true"><ellipse cx="100" cy="204" rx="60" ry="8" fill="#000" opacity=".1"/>
    <rect x="40" y="36" width="120" height="44" rx="22" style="fill:var(--accent)"/><rect x="40" y="36" width="120" height="14" rx="7" fill="#fff" opacity=".2"/>
    <path d="M160,58 h18 v44 h-78 v26" fill="none" stroke="#8d877e" stroke-width="6" stroke-linejoin="round"/>
    <rect x="90" y="126" width="20" height="74" rx="8" fill="#2a2522"/></svg>`;

  function productArt(p) {
    if (p.category === 'Tools') return toolSVG;
    const hex = p.tintable ? state.colour.hex : '#EFE7DA';
    return bucketSVG(hex, isLight(hex));
  }

  function renderProducts() {
    const products = Store.products();
    const cats = ['All'].concat(Array.from(new Set(products.map((p) => p.category))));
    if (!cats.includes(state.category)) state.category = 'All';
    chips($('#categoryChips'), cats, state.category, (c) => { state.category = c; renderProducts(); });
    $('#showroomColour').textContent = state.colour.name;
    const list = products.filter((p) => state.category === 'All' || p.category === state.category);
    $('#products').innerHTML = list.length ? list.map((p) => `
      <article class="product" data-id="${esc(p.id)}">
        <div class="product-art">${productArt(p)}</div>
        <div class="product-info">
          <span class="product-meta">${esc(p.category)} · ${esc(p.finish)}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.desc)}</p>
          ${p.coverage ? `<span class="product-cov">Coverage: ${esc(p.coverage)}</span>` : ''}
          <div class="buy">
            <select aria-label="Size for ${esc(p.name)}">${p.sizes.map((s, i) =>
              `<option value="${i}">${esc(s.label)} — ${naira(s.price)}</option>`).join('')}</select>
            <button type="button" class="btn btn-solid">Add</button>
          </div>
        </div>
      </article>`).join('') : '<p class="empty">No products in this category yet.</p>';
  }

  $('#products').addEventListener('click', (e) => {
    const btn = e.target.closest('.buy .btn');
    if (!btn) return;
    const card = btn.closest('.product');
    const p = Store.products().find((x) => x.id === card.dataset.id);
    if (!p) return;
    const size = p.sizes[Number($('select', card).value)] || p.sizes[0];
    addToCart({ productId: p.id, name: p.name, size: size.label, price: size.price, colourId: p.tintable ? state.colour.id : null });
  });

  /* ---------- projects ---------- */
  function renderProjects() {
    $('#projectList').innerHTML = PROJECTS.map((p) => `
      <article class="project reveal">
        <div class="ba" style="--pos:50%">
          <div class="ba-layer"><img src="${esc(p.img)}" alt="${esc(p.title)} after painting" loading="lazy"></div>
          <div class="ba-layer ba-before"><img src="${esc(p.before)}" alt="${esc(p.title)} before painting" loading="lazy"></div>
          <span class="ba-tag ba-tag-l">Before</span><span class="ba-tag ba-tag-r">After</span>
          <span class="ba-handle" aria-hidden="true"></span>
          <input type="range" min="0" max="100" value="50" aria-label="Compare before and after for ${esc(p.title)}">
        </div>
        <div class="project-info">
          <span class="product-meta">${esc(p.type)} · ${p.year}</span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.note)}</p>
        </div>
      </article>`).join('');
    $('#projectList').addEventListener('input', (e) => {
      if (e.target.type === 'range') e.target.closest('.ba').style.setProperty('--pos', e.target.value + '%');
    });
  }

  /* ---------- cart ---------- */
  function addToCart(item) {
    const key = [item.productId, item.size, item.colourId || ''].join('|');
    const existing = state.cart.find((i) => i.key === key);
    if (existing) existing.qty += 1;
    else state.cart.push(Object.assign({ key, qty: 1 }, item));
    saveCart();
    const c = item.colourId ? ' in ' + colourById(item.colourId).name : '';
    toast(`Added ${item.name} ${item.size}${c}`);
  }

  const cartTotal = () => state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  function saveCart() {
    Store.saveCart(state.cart);
    renderCart();
  }

  function renderCart() {
    $('#cartCount').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
    $('#cartTotal').textContent = naira(cartTotal());
    $('#checkoutBtn').disabled = !state.cart.length;
    $('#cartItems').innerHTML = state.cart.length ? state.cart.map((i) => {
      const c = i.colourId && colourById(i.colourId);
      return `
      <div class="cart-item" data-key="${esc(i.key)}">
        <i class="cart-dot" style="background:${c ? c.hex : '#d9d5cf'}"></i>
        <div class="cart-info">
          <b>${esc(i.name)}</b>
          <span>${esc(i.size)}${c ? ' · ' + c.name + ' ' + c.code : ''}</span>
          <div class="qty">
            <button type="button" data-q="-1" aria-label="Decrease quantity">−</button><span>${i.qty}</span>
            <button type="button" data-q="1" aria-label="Increase quantity">+</button>
            <button type="button" class="remove" data-q="0">Remove</button>
          </div>
        </div>
        <b class="cart-price">${naira(i.price * i.qty)}</b>
      </div>`;
    }).join('') : '<p class="empty">Your cart is empty. Pick a colour and add a tin.</p>';
  }

  $('#cartItems').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const key = b.closest('.cart-item').dataset.key;
    const item = state.cart.find((i) => i.key === key);
    const d = Number(b.dataset.q);
    if (d === 0 || item.qty + d < 1) state.cart = state.cart.filter((i) => i.key !== key);
    else item.qty += d;
    saveCart();
  });

  /* ---------- drawer + modal ---------- */
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    $('#cart').classList.add('open');
    $('#cart').setAttribute('aria-hidden', 'false');
    $('#overlay').hidden = false;
    $('#cart [data-close]').focus();
  }
  function closeAll() {
    $('#cart').classList.remove('open');
    $('#cart').setAttribute('aria-hidden', 'true');
    $('#checkout').hidden = true;
    $('#overlay').hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  $('#cartBtn').onclick = openCart;
  $('#overlay').onclick = closeAll;
  $$('[data-close]').forEach((b) => (b.onclick = closeAll));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  const checkoutFormHTML = $('#checkoutBody').innerHTML;
  $('#checkoutBtn').onclick = () => {
    if (!state.cart.length) return;
    $('#cart').classList.remove('open');
    $('#cart').setAttribute('aria-hidden', 'true');
    $('#checkoutBody').innerHTML = checkoutFormHTML;
    $('#checkoutSummary').textContent =
      `${state.cart.reduce((s, i) => s + i.qty, 0)} item(s) · ${naira(cartTotal())}. Pay online by card or bank transfer, or pay on delivery — we confirm every order by phone.`;
    $('#checkout').hidden = false;
    $('#checkoutForm input').focus();
  };

  function validate(form, msgEl) {
    const bad = $$('[required]', form).find((f) => !f.value.trim() || !f.checkValidity());
    $$('.invalid', form).forEach((f) => f.classList.remove('invalid'));
    if (bad) {
      bad.classList.add('invalid');
      bad.focus();
      msgEl.textContent = 'Please check: ' + bad.closest('label').firstChild.textContent.trim().toLowerCase() + '.';
      msgEl.className = 'form-msg error';
      return false;
    }
    return true;
  }

  function showOrderDone(order, note) {
    $('#checkoutBody').innerHTML = `
      <h3>Thank you, ${esc(order.customer.name.split(' ')[0])}.</h3>
      <p>Your order <b>${order.id}</b> for <b>${naira(order.total)}</b> has been received (${esc(order.payment)}).</p>
      <p class="fine">${note || `We'll call ${esc(order.customer.phone)} to confirm delivery.`}</p>
      <button type="button" class="btn btn-accent" id="doneBtn">Continue browsing</button>`;
    $('#doneBtn').onclick = closeAll;
    $('#doneBtn').focus();
  }

  $('#checkout').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!validate(form, $('#checkoutMsg'))) return;
    const d = Object.fromEntries(new FormData(form));
    const customer = { name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(), address: d.address.trim() };
    const items = state.cart.map((i) => Object.assign({}, i));

    if (d.payment === 'Pay online') {
      const msg = $('#checkoutMsg');
      msg.textContent = 'Taking you to secure payment…';
      msg.className = 'form-msg';
      try {
        const data = await Store.createOnlineOrder(customer, items);
        window.location.href = data.authorization_url; // Paystack hosted checkout
      } catch (err) {
        msg.textContent = err.message || 'Online payment failed. Please try again or choose another payment method.';
        msg.className = 'form-msg error';
      }
      return;
    }

    const msg = $('#checkoutMsg');
    msg.textContent = 'Placing your order…';
    msg.className = 'form-msg';
    let order;
    try {
      order = await Store.syncOrder({ customer, payment: d.payment, items });
    } catch (err) {
      msg.textContent = err.message || 'We could not save your order. Please try again.';
      msg.className = 'form-msg error';
      return;
    }
    const orders = Store.orders();
    orders.unshift(order);
    Store.saveOrders(orders);
    state.cart = [];
    saveCart();
    showOrderDone(order);
  });

  /* Returning from Paystack: verify the payment and confirm the order. */
  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    window.history.replaceState({}, '', window.location.pathname);
    try {
      const data = await Store.verifyPayment(reference);
      if (data && data.paid) {
        const order = data.order;
        state.cart = [];
        saveCart();
        $('#checkoutBody').innerHTML = checkoutFormHTML; // reset the form behind the result
        $('#checkout').hidden = false;
        showOrderDone(order, `Payment confirmed. We'll call ${esc(order.customer.phone)} to arrange delivery.`);
      } else {
        toast('Payment not completed. Your order is saved — pay on delivery or contact us.');
      }
    } catch (err) {
      toast(err.message || 'We could not verify your payment. Please contact us with your reference.');
    }
  }

  /* ---------- quote ---------- */
  const quoteForm = $('#quoteForm');
  function estimate() {
    const d = Object.fromEntries(new FormData(quoteForm));
    const l = Math.max(0, +d.length || 0), w = Math.max(0, +d.width || 0), h = Math.max(0, +d.height || 0);
    const coats = Math.min(4, Math.max(1, Math.round(+d.coats || 1)));
    const area = 2 * (l + w) * h;
    const litres = Math.ceil((area * coats) / 12);
    const paint = litres * 8000;
    const labour = d.service === 'Supply & painting' ? area * 1800 : 0;
    const fee = d.service === 'Colour consultation' ? 35000 : 0;
    const total = d.service === 'Colour consultation' ? fee : paint + labour;
    return { area, litres, coats, paint, labour, fee, total, service: d.service };
  }
  function renderEstimate() {
    const e = estimate();
    const rows = e.service === 'Colour consultation'
      ? `<div><span>Wall area</span><b>${e.area.toFixed(1)} m²</b></div><div><span>Consultation visit</span><b>${naira(e.fee)}</b></div>`
      : `<div><span>Wall area</span><b>${e.area.toFixed(1)} m²</b></div>
         <div><span>Paint needed (${e.coats} coat${e.coats > 1 ? 's' : ''})</span><b>${e.litres} L</b></div>
         <div><span>Paint</span><b>${naira(e.paint)}</b></div>
         ${e.labour ? `<div><span>Preparation &amp; painting</span><b>${naira(e.labour)}</b></div>` : ''}`;
    $('#estimate').innerHTML = `${rows}<div class="estimate-total"><span>Estimated total</span><b>${naira(e.total)}</b></div>`;
  }
  quoteForm.addEventListener('input', renderEstimate);
  quoteForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const msg = $('#quoteMsg');
    if (!validate(quoteForm, msg)) return;
    const d = Object.fromEntries(new FormData(quoteForm));
    const e = estimate();
    const list = Store.enquiries();
    list.unshift({
      id: uid('ENQ'), date: new Date().toISOString(), status: 'New',
      name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(), message: d.message.trim(),
      service: d.service, property: d.property,
      room: `${d.length} × ${d.width} × ${d.height} m, ${e.coats} coats`,
      area: +e.area.toFixed(1), litres: e.litres, estimate: e.total, colour: state.colour.name + ' ' + state.colour.code
    });
    Store.saveEnquiries(list);
    msg.textContent = 'Sending your request…';
    msg.className = 'form-msg';
    try {
      await Store.syncEnquiry(list[0]);
    } catch (err) {
      msg.textContent = err.message || 'We could not send your request. Please try again.';
      msg.className = 'form-msg error';
      return;
    }
    msg.textContent = `Thank you, ${d.name.trim().split(' ')[0]}. Your request has been received — we'll be in touch shortly.`;
    msg.className = 'form-msg ok';
    ['name', 'phone', 'email', 'message'].forEach((n) => (quoteForm.elements[n].value = ''));
  });

  /* ---------- nav + reveal ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#navToggle').onclick = () => {
    const open = nav.classList.toggle('open');
    $('#navToggle').setAttribute('aria-expanded', open);
  };
  $('#navLinks').addEventListener('click', () => {
    nav.classList.remove('open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
  });

  function reveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('in'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- init ---------- */
  renderHero();
  renderProjects();
  renderVisualiser();
  selectColour(state.colour.id);
  renderCart();
  renderEstimate();
  onScroll();
  reveal();
  handlePaymentReturn();
  Store.loadProducts().then(renderProducts);
  $('#year').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('ready'));
})();
