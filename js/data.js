/* Bella Paint — shared data + localStorage store (used by the site and the admin dashboard) */
(function () {
  const COLOURS = [
    { id: 'cowrie', name: 'Cowrie', code: 'BP 101', hex: '#EFE7DA', family: 'Neutrals' },
    { id: 'shea', name: 'Shea Butter', code: 'BP 102', hex: '#E9DCC3', family: 'Neutrals' },
    { id: 'harmattan', name: 'Harmattan Haze', code: 'BP 103', hex: '#D5CCBE', family: 'Neutrals' },
    { id: 'olumo', name: 'Olumo Stone', code: 'BP 104', hex: '#9E978C', family: 'Neutrals' },
    { id: 'agbalumo', name: 'Agbalumo', code: 'BP 201', hex: '#E8A04C', family: 'Warm' },
    { id: 'coral', name: 'Coral Bead', code: 'BP 202', hex: '#E27A63', family: 'Warm' },
    { id: 'palm', name: 'Palm Oil', code: 'BP 203', hex: '#C4472B', family: 'Warm' },
    { id: 'savannah', name: 'Savannah Gold', code: 'BP 204', hex: '#D9B25F', family: 'Warm' },
    { id: 'calabar', name: 'Calabar Clay', code: 'BP 301', hex: '#B5533C', family: 'Earth' },
    { id: 'suya', name: 'Suya Spice', code: 'BP 302', hex: '#8E4A2F', family: 'Earth' },
    { id: 'kola', name: 'Kola Nut', code: 'BP 303', hex: '#6B3A2E', family: 'Earth' },
    { id: 'laterite', name: 'Laterite Road', code: 'BP 304', hex: '#C98A62', family: 'Earth' },
    { id: 'plantain', name: 'Plantain Leaf', code: 'BP 401', hex: '#5F8556', family: 'Greens' },
    { id: 'obudu', name: 'Obudu Moss', code: 'BP 402', hex: '#3F5B45', family: 'Greens' },
    { id: 'sage', name: 'Bitterleaf Sage', code: 'BP 403', hex: '#A9B79C', family: 'Greens' },
    { id: 'mangrove', name: 'Mangrove', code: 'BP 404', hex: '#24433B', family: 'Greens' },
    { id: 'lekki', name: 'Lekki Mist', code: 'BP 501', hex: '#BCD0D6', family: 'Blues' },
    { id: 'lagoon', name: 'Lagoon', code: 'BP 502', hex: '#4E8FA3', family: 'Blues' },
    { id: 'adire', name: 'Adire Indigo', code: 'BP 503', hex: '#27406B', family: 'Blues' },
    { id: 'atlantic', name: 'Atlantic Dusk', code: 'BP 504', hex: '#5D7491', family: 'Blues' },
    { id: 'zobo', name: 'Zobo', code: 'BP 601', hex: '#6E1F3A', family: 'Deep' },
    { id: 'ube', name: 'Ube', code: 'BP 602', hex: '#4B3557', family: 'Deep' },
    { id: 'eko', name: 'Midnight Eko', code: 'BP 603', hex: '#1E2430', family: 'Deep' },
    { id: 'ebony', name: 'Ebony', code: 'BP 604', hex: '#2A2522', family: 'Deep' }
  ];

  const DEFAULT_PRODUCTS = [
    { id: 'velvet-matt', name: 'Velvet Matt Emulsion', category: 'Interior', finish: 'Matt', tintable: true,
      desc: 'A deep, chalky matt that hides imperfections and gives walls a soft, light-absorbing finish.',
      coverage: '12 m² per litre', sizes: [{ label: '1L', price: 9500 }, { label: '4L', price: 32000 }, { label: '20L', price: 138000 }] },
    { id: 'silk-touch', name: 'Silk Touch Emulsion', category: 'Interior', finish: 'Silk', tintable: true,
      desc: 'Washable mid-sheen for living rooms, hallways and busy family spaces.',
      coverage: '13 m² per litre', sizes: [{ label: '1L', price: 10500 }, { label: '4L', price: 36000 }, { label: '20L', price: 155000 }] },
    { id: 'satin-shield', name: 'Satin Shield Kitchen & Bath', category: 'Interior', finish: 'Satin', tintable: true,
      desc: 'Moisture and steam resistant satin for kitchens and bathrooms.',
      coverage: '12 m² per litre', sizes: [{ label: '1L', price: 12000 }, { label: '4L', price: 41000 }] },
    { id: 'weatherguard', name: 'WeatherGuard Exterior', category: 'Exterior', finish: 'Low sheen', tintable: true,
      desc: 'Flexible exterior coating formulated for heavy rain, humidity and strong sun.',
      coverage: '10 m² per litre', sizes: [{ label: '4L', price: 44000 }, { label: '20L', price: 189000 }] },
    { id: 'texcote', name: 'Texcote Textured Finish', category: 'Exterior', finish: 'Textured', tintable: true,
      desc: 'Heavy-bodied textured coating that covers hairline cracks on rendered walls.',
      coverage: '3 m² per litre', sizes: [{ label: '20L', price: 96000 }, { label: '30kg', price: 128000 }] },
    { id: 'gloss-enamel', name: 'High Gloss Enamel', category: 'Specialty', finish: 'Gloss', tintable: true,
      desc: 'Hard-wearing mirror gloss for doors, trim, metal gates and burglar-proofing.',
      coverage: '14 m² per litre', sizes: [{ label: '1L', price: 11500 }, { label: '4L', price: 39500 }] },
    { id: 'stucco', name: 'Stucco Veneziano', category: 'Specialty', finish: 'Polished plaster', tintable: true,
      desc: 'Decorative polished-plaster effect for feature walls and reception areas.',
      coverage: '4 m² per kg', sizes: [{ label: '5kg', price: 58000 }, { label: '20kg', price: 210000 }] },
    { id: 'primer', name: 'Alkali-Resisting Primer', category: 'Specialty', finish: 'Primer', tintable: false,
      desc: 'Seals new plaster and masonry so your topcoat goes further and lasts longer.',
      coverage: '11 m² per litre', sizes: [{ label: '4L', price: 24000 }, { label: '20L', price: 99000 }] },
    { id: 'roller-kit', name: 'Pro Roller Kit', category: 'Tools', finish: '9-inch', tintable: false,
      desc: 'Microfibre roller, tray and extension pole. Lint-free and reusable.',
      coverage: '', sizes: [{ label: 'Kit', price: 14500 }] },
    { id: 'brush-set', name: 'Angled Brush Set', category: 'Tools', finish: '3 brushes', tintable: false,
      desc: 'Three synthetic-bristle brushes for cutting in and trim work.',
      coverage: '', sizes: [{ label: 'Set', price: 8500 }] }
  ];

  const PROJECTS = [
    { id: 'p1', title: 'Ikoyi Penthouse', type: 'Residential · Interior', before: 'assets/project-living-before.jpg', img: 'assets/project-living.jpg', year: 2026,
      note: 'Full interior repaint, 4 bedrooms, Velvet Matt throughout with a moss feature wall.' },
    { id: 'p2', title: 'The Adire Suite, Abuja', type: 'Hospitality · Interior', before: 'assets/project-bedroom-before.jpg', img: 'assets/project-bedroom.jpg', year: 2025,
      note: 'Boutique hotel bedrooms finished in Silk Touch with indigo headboard walls.' },
    { id: 'p3', title: 'Clay & Co. Restaurant', type: 'Commercial · Interior', before: 'assets/project-dining-before.jpg', img: 'assets/project-dining.jpg', year: 2025,
      note: 'Dining room in warm neutrals with a Stucco Veneziano clay feature wall.' }
  ];

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  };
  const clone = (v) => JSON.parse(JSON.stringify(v));

  const Store = {
    products: () => read('bella_products', null) || clone(DEFAULT_PRODUCTS),
    saveProducts: (list) => write('bella_products', list),
    resetProducts: () => { try { localStorage.removeItem('bella_products'); } catch (e) {} },
    orders: () => read('bella_orders', []),
    saveOrders: (list) => write('bella_orders', list),
    enquiries: () => read('bella_enquiries', []),
    saveEnquiries: (list) => write('bella_enquiries', list),
    cart: () => read('bella_cart', []),
    saveCart: (list) => write('bella_cart', list)
  };

  /* ---------- server API ----------
     localStorage stays as a cache / offline fallback; the server is the source of truth. */
  const api = async (path, opts) => {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  };

  Object.assign(Store, {
    loadProducts: async () => {
      try {
        const list = await api('/api/products');
        if (Array.isArray(list) && list.length) Store.saveProducts(list);
      } catch (e) { /* offline — keep the cached list */ }
      return Store.products();
    },
    syncOrder: (order) => api('/api/orders', { method: 'POST', body: JSON.stringify({
      customer: order.customer, payment: order.payment, items: order.items
    }) }),
    syncEnquiry: (q) => api('/api/enquiries', { method: 'POST', body: JSON.stringify(q) }),
    createOnlineOrder: (customer, items) => api('/api/payments/initialize', {
      method: 'POST', body: JSON.stringify({ customer, items })
    }),
    verifyPayment: (reference) => api('/api/payments/verify?reference=' + encodeURIComponent(reference))
  });

  const naira = (n) => '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (prefix) => prefix + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  const colourById = (id) => COLOURS.find((c) => c.id === id);

  /* Relative luminance → is this colour light enough to need dark text? */
  const isLight = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  };

  window.Bella = { COLOURS, DEFAULT_PRODUCTS, PROJECTS, Store, api, naira, esc, uid, colourById, isLight };
})();
