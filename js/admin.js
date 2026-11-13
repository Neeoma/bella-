/* Bella Paint — admin dashboard.
   NOTE: this is a front-end demo. Data lives in this browser's localStorage and the
   passcode check below is NOT real security. Replace with a server + auth before going live. */
(function () {
  const { Store, naira, esc, uid, colourById } = window.Bella;
  const $ = (s, el) => (el || document).querySelector(s);
  const PASSCODE = 'bella-admin';
  const ORDER_STATUS = ['New', 'Confirmed', 'Out for delivery', 'Delivered', 'Cancelled'];
  const ENQ_STATUS = ['New', 'Contacted', 'Quoted', 'Won', 'Closed'];
  const TABS = ['Overview', 'Orders', 'Products', 'Customers', 'Enquiries'];
  let tab = 'Overview';

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  const isNew = (x) => x.status === 'New';
  const notice = '<p class="notice">Demo mode: orders, enquiries and product edits are stored in this browser only. Connect a backend before using this with real customers.</p>';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- auth (demo only) ---------- */
  function showApp() {
    $('#login').hidden = true;
    $('#shell').hidden = false;
    render();
  }
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.elements.pass.value === PASSCODE) {
      sessionStorage.setItem('bella_admin', '1');
      showApp();
    } else {
      $('#loginMsg').textContent = 'Incorrect passcode.';
    }
  });
  $('#logout').onclick = () => { sessionStorage.removeItem('bella_admin'); location.reload(); };

  /* ---------- derived data ---------- */
  function customers() {
    const map = new Map();
    const touch = (key, base) => {
      if (!map.has(key)) map.set(key, Object.assign({ orders: 0, spent: 0, enquiries: 0, last: base.date }, base));
      const c = map.get(key);
      if (base.date > c.last) c.last = base.date;
      return c;
    };
    Store.orders().forEach((o) => {
      const c = touch((o.customer.email || o.customer.phone).toLowerCase(), { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, date: o.date });
      c.orders += 1;
      if (o.status !== 'Cancelled') c.spent += o.total;
    });
    Store.enquiries().forEach((q) => {
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
        <td><b>${esc(o.id)}</b><small>${fmtDate(o.date)}</small></td>
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
      const orders = Store.orders(), enq = Store.enquiries();
      const revenue = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
      return `<div class="admin-head"><div><h1>Overview</h1><p class="fine">${fmtDate(new Date().toISOString())}</p></div></div>${notice}
        <div class="cards">
          <div class="card"><span class="label">Order value</span><b>${naira(revenue)}</b></div>
          <div class="card"><span class="label">Orders</span><b>${orders.length}</b></div>
          <div class="card"><span class="label">Enquiries</span><b>${enq.length}</b></div>
          <div class="card"><span class="label">Customers</span><b>${customers().length}</b></div>
          <div class="card"><span class="label">Products</span><b>${Store.products().length}</b></div>
        </div>
        <div class="panel"><h3>Latest orders</h3>${ordersTable(orders.slice(0, 5))}</div>
        <div class="panel"><h3>Latest enquiries</h3>${enquiriesTable(enq.slice(0, 5))}</div>`;
    },
    Orders() {
      return `<div class="admin-head"><h1>Orders</h1></div><div class="panel">${ordersTable(Store.orders())}</div>`;
    },
    Enquiries() {
      return `<div class="admin-head"><h1>Enquiries</h1></div><div class="panel">${enquiriesTable(Store.enquiries())}</div>`;
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
      const list = Store.products();
      return `<div class="admin-head"><h1>Products</h1>
        <div class="actions"><button class="btn btn-line btn-sm" data-act="reset">Reset to defaults</button><button class="btn btn-solid btn-sm" data-act="new">+ Add product</button></div></div>
        <div class="panel"><table><thead><tr><th>Product</th><th>Category</th><th>Sizes &amp; prices</th><th>Tintable</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr>
          <td><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></td>
          <td>${esc(p.category)}<small>${esc(p.finish)}</small></td>
          <td>${p.sizes.map((s) => `${esc(s.label)} — ${naira(s.price)}`).join('<br>')}</td>
          <td>${p.tintable ? 'Yes' : 'No'}</td>
          <td><div class="actions"><button class="link" data-act="edit" data-id="${esc(p.id)}">Edit</button><button class="link danger" data-del="product" data-id="${esc(p.id)}">Delete</button></div></td>
        </tr>`).join('')}</tbody></table></div>`;
    }
  };

  function render() {
    const counts = { Orders: Store.orders().filter(isNew).length, Enquiries: Store.enquiries().filter(isNew).length };
    $('#tabs').innerHTML = TABS.map((t) =>
      `<button type="button" class="${t === tab ? 'on' : ''}" data-tab="${t}">${t}${counts[t] ? `<span class="badge">${counts[t]}</span>` : ''}</button>`).join('');
    $('#view').innerHTML = views[tab]();
  }

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { tab = b.dataset.tab; render(); }
  });

  /* ---------- status changes + deletes ---------- */
  $('#view').addEventListener('change', (e) => {
    const s = e.target.closest('select[data-kind]');
    if (!s) return;
    const isOrder = s.dataset.kind === 'order';
    const list = isOrder ? Store.orders() : Store.enquiries();
    const item = list.find((x) => x.id === s.dataset.id);
    if (!item) return;
    item.status = s.value;
    (isOrder ? Store.saveOrders : Store.saveEnquiries)(list);
    toast(`${item.id} marked ${s.value}`);
    render();
  });

  $('#view').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm('Delete this ' + del.dataset.del + '? This cannot be undone.')) return;
      const id = del.dataset.id;
      if (del.dataset.del === 'order') Store.saveOrders(Store.orders().filter((x) => x.id !== id));
      if (del.dataset.del === 'enquiry') Store.saveEnquiries(Store.enquiries().filter((x) => x.id !== id));
      if (del.dataset.del === 'product') Store.saveProducts(Store.products().filter((x) => x.id !== id));
      return render();
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'reset') {
      if (confirm('Restore the original product list? Your product edits will be lost.')) { Store.resetProducts(); render(); }
    } else if (act.dataset.act === 'new') {
      openProduct(null);
    } else if (act.dataset.act === 'edit') {
      openProduct(Store.products().find((p) => p.id === act.dataset.id));
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

  form.addEventListener('submit', (e) => {
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
    const list = Store.products();
    const data = {
      id: form.elements.id.value || uid('prod'), name, category: form.elements.category.value, finish: form.elements.finish.value.trim(),
      desc: form.elements.desc.value.trim(), coverage: form.elements.coverage.value.trim(), tintable: form.elements.tintable.checked, sizes
    };
    const idx = list.findIndex((p) => p.id === data.id);
    if (idx >= 0) list[idx] = data; else list.push(data);
    Store.saveProducts(list);
    closeProduct();
    toast('Product saved');
    render();
  });

  if (sessionStorage.getItem('bella_admin') === '1') showApp();
})();
