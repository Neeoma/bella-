/* Bella Paint — admin dashboard (server-backed).
   Sign-in uses the server's session cookie; all data comes from /api/admin/*. */
(function () {
  const { api, naira, esc, uid, colourById } = window.Bella;
  const $ = (s, el) => (el || document).querySelector(s);
  const ORDER_STATUS = ['New', 'Confirmed', 'Out for delivery', 'Delivered', 'Cancelled', 'Awaiting payment'];
  const ENQ_STATUS = ['New', 'Contacted', 'Quoted', 'Won', 'Closed'];
  const TABS = ['Overview', 'Orders', 'Products', 'Customers', 'Enquiries'];
  const state = { orders: [], enquiries: [], products: [] };
  let tab = 'Overview';

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  const isNew = (x) => x.status === 'New';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- auth ---------- */
  function showApp() {
    $('#login').hidden = true;
    $('#shell').hidden = false;
    load();
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg');
    msg.textContent = 'Signing in…';
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: e.target.elements.pass.value }) });
      msg.textContent = '';
      showApp();
    } catch (err) {
      msg.textContent = err.status === 429 ? err.message : 'Incorrect password.';
    }
  });
  $('#logout').onclick = async () => {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch (e) { /* already signed out */ }
    location.reload();
  };

  /* ---------- data ---------- */
  async function load() {
    try {
      const [orders, enquiries, products] = await Promise.all([
        api('/api/admin/orders'), api('/api/admin/enquiries'), api('/api/admin/products')
      ]);
      state.orders = orders; state.enquiries = enquiries; state.products = products;
    } catch (err) {
      $('#view').innerHTML = '<p class="empty">Could not load data. Check the server is running, then refresh.</p>';
      return;
    }
    render();
  }

  function customers() {
    const map = new Map();
    const touch = (key, base) => {
      if (!map.has(key)) map.set(key, Object.assign({ orders: 0, spent: 0, enquiries: 0, last: base.date }, base));
      const c = map.get(key);
      if (base.date > c.last) c.last = base.date;
      return c;
    };
    state.orders.forEach((o) => {
      const c = touch((o.customer.email || o.customer.phone).toLowerCase(), { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, date: o.date });
      c.orders += 1;
      if (o.status !== 'Cancelled') c.spent += o.total;
    });
    state.enquiries.forEach((q) => {
      const c = touch((q.email || q.phone).toLowerCase(), { name: q.name, email: q.email, phone: q.phone, date: q.date });
      c.enquiries += 1;
    });
    return Array.from(map.values()).sort((a, b) => (a.last < b.last ? 1 : -1));
  }

  const statusSelect = (list, current, kind, id) =>
    `<select data-kind="${kind}" data-id="${esc(id)}" aria-label="Status">${list.map((s) =>
      `<option${s === current ? ' selected' : ''}>${s}</option>`).join('')}</select>`;

  const itemsText = (o) => o.items.map((i) => {
    const c = i.colourId && colourById(i.colourId);
    return `${i.qty} × ${esc(i.name)} ${esc(i.size)}${c ? ' <small>' + c.name + ' ' + c.code + '</small>' : ''}`;
  }).join('<br>');

  /* ---------- views ---------- */
  function ordersTable(orders) {
    if (!orders.length) return '<p class="empty">No orders yet. Place a test order from the website.</p>';
    return `<table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${orders.map((o) => `<tr>
        <td><b>${esc(o.id)}</b><small>${fmtDate(o.date)}</small>${o.reference ? `<small>Ref ${esc(o.reference)}${o.paid ? ' · Paid' : ''}</small>` : ''}</td>
        <td>${esc(o.customer.name)}<small>${esc(o.customer.phone)} · ${esc(o.customer.email)}</small><small>${esc(o.customer.address)}</small></td>
        <td>${itemsText(o)}</td>
        <td class="num">${naira(o.total)}<small>${esc(o.payment)}</small></td>
        <td>${statusSelect(ORDER_STATUS, o.status, 'order', o.id)}</td>
        <td><button class="link danger" data-del="order" data-id="${esc(o.id)}">Delete</button></td>
      </tr>`).join('')}</tbody></table>`;
  }

  function enquiriesTable(list) {
    if (!list.length) return '<p class="empty">No enquiries yet. Submit the quote form on the website.</p>';
    return `<table><thead><tr><th>Ref</th><th>Contact</th><th>Request</th><th class="num">Estimate</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((q) => `<tr>
        <td><b>${esc(q.id)}</b><small>${fmtDate(q.date)}</small></td>
        <td>${esc(q.name)}<small>${esc(q.phone)} · ${esc(q.email)}</small></td>
        <td>${esc(q.service)} · ${esc(q.property)}<small>${esc(q.room)} · ${q.area} m² · ${q.litres} L · ${esc(q.colour)}</small>${q.message ? `<small>“${esc(q.message)}”</small>` : ''}</td>
        <td class="num">${naira(q.estimate)}</td>
        <td>${statusSelect(ENQ_STATUS, q.status, 'enquiry', q.id)}</td>
        <td><button class="link danger" data-del="enquiry" data-id="${esc(q.id)}">Delete</button></td>
      </tr>`).join('')}</tbody></table>`;
  }

  const views = {
    Overview() {
      const revenue = state.orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
      return `<div class="admin-head"><div><h1>Overview</h1><p class="fine">${fmtDate(new Date().toISOString())}</p></div></div>
        <div class="cards">
          <div class="card"><span class="label">Order value</span><b>${naira(revenue)}</b></div>
          <div class="card"><span class="label">Orders</span><b>${state.orders.length}</b></div>
          <div class="card"><span class="label">Enquiries</span><b>${state.enquiries.length}</b></div>
          <div class="card"><span class="label">Customers</span><b>${customers().length}</b></div>
          <div class="card"><span class="label">Products</span><b>${state.products.length}</b></div>
        </div>
        <div class="panel"><h3>Latest orders</h3>${ordersTable(state.orders.slice(0, 5))}</div>
        <div class="panel"><h3>Latest enquiries</h3>${enquiriesTable(state.enquiries.slice(0, 5))}</div>`;
    },
    Orders() {
      return `<div class="admin-head"><h1>Orders</h1></div><div class="panel">${ordersTable(state.orders)}</div>`;
    },
    Enquiries() {
      return `<div class="admin-head"><h1>Enquiries</h1></div><div class="panel">${enquiriesTable(state.enquiries)}</div>`;
    },
    Customers() {
      const list = customers();
      return `<div class="admin-head"><h1>Customers</h1></div><div class="panel">${list.length ? `
        <table><thead><tr><th>Name</th><th>Contact</th><th class="num">Orders</th><th class="num">Enquiries</th><th class="num">Spent</th><th>Last activity</th></tr></thead><tbody>
        ${list.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.email)}<small>${esc(c.phone)}</small></td>
          <td class="num">${c.orders}</td><td class="num">${c.enquiries}</td><td class="num">${naira(c.spent)}</td><td>${fmtDate(c.last)}</td></tr>`).join('')}
        </tbody></table>` : '<p class="empty">Customers appear here once they order or send an enquiry.</p>'}</div>`;
    },
    Products() {
      return `<div class="admin-head"><h1>Products</h1>
        <div class="actions"><button class="btn btn-line btn-sm" data-act="reset">Reset to defaults</button><button class="btn btn-solid btn-sm" data-act="new">+ Add product</button></div></div>
        <div class="panel"><table><thead><tr><th>Product</th><th>Category</th><th>Sizes &amp; prices</th><th>Tintable</th><th></th></tr></thead><tbody>
        ${state.products.map((p) => `<tr>
          <td><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></td>
          <td>${esc(p.category)}<small>${esc(p.finish)}</small></td>
          <td>${p.sizes.map((s) => `${esc(s.label)} — ${naira(s.price)}`).join('<br>')}</td>
          <td>${p.tintable ? 'Yes' : 'No'}</td>
          <td><div class="actions"><button class="link" data-act="edit" data-id="${esc(p.id)}">Edit</button><button class="link danger" data-del="product" data-id="${esc(p.id)}">Delete</button></div></td>
        </tr>`).join('')}</tbody></table></div>`;
    }
  };

  function render() {
    const counts = { Orders: state.orders.filter(isNew).length, Enquiries: state.enquiries.filter(isNew).length };
    $('#tabs').innerHTML = TABS.map((t) =>
      `<button type="button" class="${t === tab ? 'on' : ''}" data-tab="${t}">${t}${counts[t] ? `<span class="badge">${counts[t]}</span>` : ''}</button>`).join('');
    $('#view').innerHTML = views[tab]();
  }

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { tab = b.dataset.tab; render(); }
  });

  /* ---------- status changes + deletes ---------- */
  $('#view').addEventListener('change', async (e) => {
    const s = e.target.closest('select[data-kind]');
    if (!s) return;
    const isOrder = s.dataset.kind === 'order';
    const list = isOrder ? state.orders : state.enquiries;
    const item = list.find((x) => x.id === s.dataset.id);
    if (!item) return;
    const prev = item.status;
    item.status = s.value;
    try {
      await api(`/api/admin/${isOrder ? 'orders' : 'enquiries'}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ status: s.value }) });
      toast(`${item.id} marked ${s.value}`);
    } catch (err) {
      item.status = prev;
      toast('Could not update status.');
    }
    render();
  });

  $('#view').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm('Delete this ' + del.dataset.del + '? This cannot be undone.')) return;
      const id = del.dataset.id;
      const kind = del.dataset.del;
      try {
        const endpoint = kind === 'product' ? 'products' : kind === 'order' ? 'orders' : 'enquiries';
        await api(`/api/admin/${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const list = kind === 'order' ? state.orders : kind === 'enquiry' ? state.enquiries : state.products;
        list.splice(list.findIndex((x) => x.id === id), 1);
        render();
      } catch (err) { toast('Could not delete.'); }
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'reset') {
      if (confirm('Restore the original product list? Your product edits will be lost.')) {
        try { await api('/api/admin/products/reset', { method: 'POST' }); load(); } catch (err) { toast('Could not reset.'); }
      }
    } else if (act.dataset.act === 'new') {
      openProduct(null);
    } else if (act.dataset.act === 'edit') {
      openProduct(state.products.find((p) => p.id === act.dataset.id));
    }
  });

  /* ---------- product editor ---------- */
  const form = $('#productForm');
  function openProduct(p) {
    form.reset();
    $('#pmMsg').textContent = '';
    $('#pmTitle').textContent = p ? 'Edit product' : 'Add product';
    form.elements.id.value = p ? p.id : '';
    if (p) {
      form.elements.name.value = p.name; form.elements.category.value = p.category; form.elements.finish.value = p.finish;
      form.elements.desc.value = p.desc; form.elements.coverage.value = p.coverage || ''; form.elements.tintable.checked = !!p.tintable;
      form.elements.sizes.value = p.sizes.map((s) => `${s.label}: ${s.price}`).join('\n');
    }
    $('#productModal').hidden = false;
    $('#overlay').hidden = false;
    form.elements.name.focus();
  }
  function closeProduct() {
    $('#productModal').hidden = true;
    $('#overlay').hidden = true;
  }
  $('#pmClose').onclick = closeProduct;
  $('#overlay').onclick = closeProduct;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProduct(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const sizes = form.elements.sizes.value.split('\n').map((line) => {
      const i = line.lastIndexOf(':');
      if (i < 1) return null;
      const label = line.slice(0, i).trim();
      const price = Number(line.slice(i + 1).replace(/[^\d.]/g, ''));
      return label && price > 0 ? { label, price } : null;
    }).filter(Boolean);
    if (!name) return ($('#pmMsg').textContent = 'Please enter a product name.');
    if (!sizes.length) return ($('#pmMsg').textContent = 'Add at least one size, e.g. 4L: 32000');
    const data = {
      id: form.elements.id.value || uid('prod'), name, category: form.elements.category.value, finish: form.elements.finish.value.trim(),
      desc: form.elements.desc.value.trim(), coverage: form.elements.coverage.value.trim(), tintable: form.elements.tintable.checked, sizes
    };
    try {
      if (form.elements.id.value) {
        await api(`/api/admin/products/${encodeURIComponent(data.id)}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await api('/api/admin/products', { method: 'POST', body: JSON.stringify(data) });
      }
      closeProduct();
      toast('Product saved');
      load();
    } catch (err) {
      $('#pmMsg').textContent = err.message || 'Could not save the product.';
    }
  });

  /* stay signed in across page loads */
  api('/api/admin/me').then((d) => { if (d.signedIn) showApp(); }).catch(() => {});
})();
