// ========== Helpers ==========
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
const fmt = (n)=> (n||0).toLocaleString('vi-VN') + 'đ';
const norm = (s)=> (s||'')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'');

// ========== Product State ==========
let allProducts = [];
let searchQuery = '';
let currentLetter = '*';
let selectedProduct = null;

function openProductModalById(productId){
  const p = allProducts.find(x => x.MaSP === productId);
  if (!p) return;
  selectedProduct = p;

  const dlg = document.getElementById('dlg');
  const imgEl = document.getElementById('dlgImgPh');
  const tEl = document.getElementById('dlgTitle');
  const brandEl = document.getElementById('dlgBrand');
  const catEl = document.getElementById('dlgCat');
  const unitEl = document.getElementById('dlgUnit');
  const priceEl = document.getElementById('dlgPrice');
  const descEl = document.getElementById('dlgDesc');
  const qtyEl = document.getElementById('qty');

  if (tEl) tEl.textContent = p.TenSP || '';
  if (brandEl) brandEl.textContent = p.TenNCC || '';
  if (catEl) catEl.textContent = p.MaLoai ? `Mã loại: ${p.MaLoai}` : '';
  if (unitEl) unitEl.textContent = p.DonViTinh || '';
  if (priceEl) priceEl.textContent = fmt(parseFloat(p.DonGia||0));
  if (descEl) descEl.textContent = p.MoTa || '';
  if (imgEl){ imgEl.src = p.Hinhanh || 'image/placeholder.png'; imgEl.alt = p.TenSP || 'Ảnh sản phẩm'; }
  if (qtyEl) qtyEl.value = 1;

  dlg?.showModal();
}

// cấu trúc cart: [{id,name,price,unit,qty,img?}]
const state = {
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  coupon: (localStorage.getItem('coupon') || '').toUpperCase(), // ví dụ "DNT10"
  discountRate: 0,
};

function save(){
  localStorage.setItem('cart', JSON.stringify(state.cart));
  if(state.coupon) localStorage.setItem('coupon', state.coupon);
  else localStorage.removeItem('coupon');
}

// ========== Render giỏ ==========
function renderCart(){
  const wrap = $('#cartItems');
  const empty = $('#cartEmpty');

  // Kiểm tra nếu không có element giỏ hàng (trang không phải trang giỏ hàng)
  if (!wrap || !empty) {
    updateCount();
    return;
  }

  if(!state.cart.length){
    wrap.innerHTML = '';
    empty.classList.remove('hide');
    updateTotals();
    updateCount();
    return;
  }
  empty.classList.add('hide');

  wrap.innerHTML = state.cart.map(i => `
    <div class="cart-row" data-id="${i.id}">
      <div class="thumb">🧴</div>
      <div class="info">
        <div class="name">${i.name}</div>
        <div class="note muted">${fmt(i.price)} / ${i.unit||'sp'}</div>
        <div class="controls">
          <div class="qty">
            <button data-act="dec">–</button>
            <input value="${i.qty}" inputmode="numeric" />
            <button data-act="inc">+</button>
          </div>
          <button class="btn link danger" data-act="del">🗑 Xóa</button>
        </div>
      </div>
      <div class="line">${fmt(i.price * i.qty)}</div>
    </div>
  `).join('');

  // gắn event
  wrap.querySelectorAll('.cart-row').forEach(row=>{
    const id = row.dataset.id;
    const item = state.cart.find(x=>x.id===id);
    if(!item) return;

    row.querySelector('[data-act="dec"]').onclick = ()=>{
      item.qty = Math.max(1, item.qty-1); save(); renderCart();
    };
    row.querySelector('[data-act="inc"]').onclick = ()=>{
      item.qty = Math.min(99, item.qty+1); save(); renderCart();
    };
    row.querySelector('[data-act="del"]').onclick = ()=>{
      state.cart = state.cart.filter(x=>x.id!==id); save(); renderCart();
    };
    row.querySelector('input').onchange = (e)=>{
      const v = Math.max(1, Math.min(99, parseInt(e.target.value||'1',10)));
      item.qty = v; save(); renderCart();
    };
  });

  updateTotals();
  updateCount();
}

function updateCount(){
  const c = state.cart.reduce((s,i)=>s+i.qty,0);
  const el = $('#cartCount');
  if (el) el.textContent = c;
}

// ========== Tính tiền ==========
function updateTotals(){
  const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);

  // mã giảm (demo): DNT10 = 10%
  state.discountRate = 0;
  if(state.coupon === 'DNT10') state.discountRate = 0.10;

  const discount = Math.round(subtotal * state.discountRate);

  // ship: miễn phí >= 499k, ngược lại 30k (nếu có hàng)
  const shipping = subtotal ? (subtotal >= 499000 ? 0 : 30000) : 0;

  const grand = Math.max(0, subtotal - discount + shipping);

  // Chỉ cập nhật nếu các element tồn tại (trang giỏ hàng)
  const elSubtotal = $('#tSubtotal');
  const elDiscount = $('#tDiscount');
  const elShipping = $('#tShipping');
  const elGrand = $('#tGrand');
  
  if (elSubtotal) elSubtotal.textContent = fmt(subtotal);
  if (elDiscount) elDiscount.textContent = '-' + fmt(discount);
  if (elShipping) elShipping.textContent = fmt(shipping);
  if (elGrand) elGrand.textContent = fmt(grand);
}

// ========== Mã giảm ==========
$('#applyCoupon')?.addEventListener('click', ()=>{
  const code = ($('#couponInput').value || '').trim().toUpperCase();
  if(!code){ state.coupon=''; save(); updateTotals(); return; }
  if(['DNT10'].includes(code)){
    state.coupon = code;
    save();
    updateTotals();
    alert('Áp dụng mã thành công!');
  }else{
    state.coupon = '';
    save();
    updateTotals();
    alert('Mã không hợp lệ.');
  }
});

// ========== Đặt hàng -> sang form ==========
$('#placeOrder')?.addEventListener('click', ()=>{
  if(!state.cart.length){
    alert('Giỏ hàng trống.');
    return;
  }
  // chuẩn bị dữ liệu preview cho trang đặt hàng
  const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);
  const discount = Math.round(subtotal * (state.coupon==='DNT10' ? 0.10 : 0));
  const shipping = subtotal ? (subtotal >= 499000 ? 0 : 30000) : 0;
  const grand = Math.max(0, subtotal - discount + shipping);

  const orderPreview = {
    items: state.cart,
    coupon: state.coupon,
    subtotal, discount, shipping, grand,
    at: new Date().toISOString()
  };
  sessionStorage.setItem('orderPreview', JSON.stringify(orderPreview));

  // sang trang form đặt hàng
  window.location.href = 'DatHang.html';
});

// ========== Load Products ==========
async function loadProducts(letter = '*') {
  currentLetter = letter;
  const statusEl = $('#status');
  const gridEl = $('#grid');
  const titleEl = $('#titleList');
  const countEl = $('#count');

  if (statusEl) statusEl.textContent = '⏳ Đang tải sản phẩm...';
  if (gridEl) gridEl.innerHTML = '';

  try {
    const response = await fetch(`php/Tatcasp.php?letter=${letter}`);
    const result = await response.json();

    if (result.status === 'success') {
      allProducts = result.data;
      const q = (searchQuery || '').trim();
      const data = q ? allProducts.filter(p=>{
        const hay = `${p.TenSP||''} ${p.TenNCC||''} ${p.MaSP||''}`;
        return norm(hay).includes(norm(q));
      }) : allProducts;
      renderProducts(data);

      // Update title
      if (titleEl) {
        titleEl.textContent = q
          ? `Kết quả cho "${q}"`
          : (letter === '*' ? 'Tất cả sản phẩm' : `Sản phẩm bắt đầu bằng "${letter}"`);
      }

      // Update count
      if (countEl) {
        countEl.textContent = `${data.length} sản phẩm`;
      }

      if (statusEl) {
        if (data.length === 0) {
          statusEl.textContent = '😔 Không tìm thấy sản phẩm nào';
        } else {
          statusEl.textContent = '';
        }
      }
    } else {
      if (statusEl) statusEl.textContent = '❌ Lỗi: ' + result.message;
    }
  } catch (error) {
    console.error('Error loading products:', error);
    if (statusEl) statusEl.textContent = '❌ Không thể tải sản phẩm. Vui lòng thử lại.';
  }
}

// ========== Render Products ==========
function renderProducts(products) {
  const gridEl = $('#grid');
  if (!gridEl) return;

  if (products.length === 0) {
    gridEl.innerHTML = '';
    return;
  }

  gridEl.innerHTML = products.map(product => `
    <article class="card" data-id="${product.MaSP}" role="button" tabindex="0">
      <div class="thumb">
        ${product.Hinhanh ? `<img src="${product.Hinhanh}" alt="${product.TenSP}" onerror="this.src='image/placeholder.png'">` : '🧴'}
      </div>
      <div class="meta">
        <div class="title-2">${product.TenSP}</div>
        <div class="price">${fmt(product.DonGia)} / ${product.DonViTinh || 'Hộp'}</div>
        <div class="small">Còn hàng</div>
      </div>
    </article>
  `).join('');

  // Open product modal on card click
  gridEl.querySelectorAll('.card').forEach(card => {
    const productId = card.dataset.id;
    card.addEventListener('click', () => openProductModalById(productId));
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') openProductModalById(productId);
    });
  });
}

// ========== Add to Cart ==========
function addToCart(productId, qty = 1) {
  const product = allProducts.find(p => p.MaSP === productId);
  if (!product) return;

  // Check if product already in cart
  const existingItem = state.cart.find(item => item.id === productId);
  
  // enforce max total 50 items in cart
  const currentTotal = state.cart.reduce((s,i)=> s + (i.qty||0), 0);
  const maxTotal = 50;
  if (currentTotal >= maxTotal) { alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); return; }
  const allowed = Math.max(0, maxTotal - currentTotal);
  const addQty = Math.max(1, Math.min(allowed, qty));
  if (addQty <= 0) { alert('Giỏ hàng đã đạt giới hạn 50 sản phẩm.'); return; }

  if (existingItem) {
    existingItem.qty = Math.min(99, existingItem.qty + addQty);
  } else {
    state.cart.push({
      id: product.MaSP,
      name: product.TenSP,
      price: parseFloat(product.DonGia),
      unit: product.DonViTinh || 'sp',
      qty: addQty,
      img: product.Hinhanh
    });
  }
  
  save();
  updateCount();
}

// ========== Modal qty handlers ==========
function setupModalHandlers(){
  const plus = document.getElementById('plus');
  const minus = document.getElementById('minus');
  const qtyEl = document.getElementById('qty');
  const addBtn = document.getElementById('addToCart');
  const dlg = document.getElementById('dlg');

  plus?.addEventListener('click', ()=>{ if(!qtyEl) return; qtyEl.value = Math.min(99, (+qtyEl.value||1)+1); });
  minus?.addEventListener('click', ()=>{ if(!qtyEl) return; qtyEl.value = Math.max(1, (+qtyEl.value||1)-1); });
  addBtn?.addEventListener('click', async ()=>{
    const ok = await ensureLoggedIn(); if (!ok) return;
    if (!selectedProduct) return;
    const q = Math.max(1, Math.min(99, (+qtyEl?.value||1)));
    addToCart(selectedProduct.MaSP, q);
    dlg?.close();
    renderCartDrawer();
    openCart();
  });
}

async function ensureLoggedIn(){
  try{
    const r = await fetch('php/session.php', { cache: 'no-store' });
    const s = await r.json();
    if (s && s.logged_in) return true;
  }catch(e){}
  alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
  window.location.href = 'dangnhap.html';
  return false;
}

// ========== Cart drawer (open/close + render) ==========
function openCart(){ document.getElementById('cart')?.classList.add('open'); }
function closeCart(){ document.getElementById('cart')?.classList.remove('open'); }

function renderCartDrawer(){
  const list = document.getElementById('cartList');
  if (!list) return;
  if (!state.cart.length){
    list.innerHTML = '<div class="muted">Giỏ hàng trống.</div>';
    const subtotalEl = document.getElementById('subtotal');
    const grandEl = document.getElementById('grand');
    if (subtotalEl) subtotalEl.textContent = '0đ';
    if (grandEl) grandEl.textContent = '0đ';
    updateCount();
    return;
  }
  list.innerHTML = state.cart.map(r=>`
    <div class="cart-item">
      <div class="thumb" style="width:56px;height:56px;background:#f2f6ff;border-radius:10px;display:grid;place-items:center;overflow:hidden;">
        ${r.img ? `<img src="${r.img}" alt="${r.name}" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.src='image/default.png'">` : '🧴'}
      </div>
      <div>
        <div class="title">${r.name}</div>
        <div class="muted">${r.unit||'sp'}</div>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
          <div class="qty">
            <button data-act="dec" data-id="${r.id}">–</button>
            <input data-role="qty" data-id="${r.id}" value="${r.qty}" />
            <button data-act="inc" data-id="${r.id}">+</button>
          </div>
          <button class="btn" data-act="del" data-id="${r.id}">🗑 Xóa</button>
        </div>
      </div>
      <div style="font-weight:800">${fmt(r.price * r.qty)}</div>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);
  const subtotalEl = document.getElementById('subtotal');
  const grandEl = document.getElementById('grand');
  if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
  if (grandEl) grandEl.textContent = fmt(subtotal);
  const count = state.cart.reduce((s,i)=> s+i.qty, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) countEl.textContent = count;

  // bind actions
  list.querySelectorAll('button[data-act]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id; const it = state.cart.find(x=>x.id===id); if(!it) return;
      if (b.dataset.act==='del') state.cart = state.cart.filter(x=>x.id!==id);
      if (b.dataset.act==='inc') it.qty = Math.min(99, it.qty+1);
      if (b.dataset.act==='dec') it.qty = Math.max(1, it.qty-1);
      save(); renderCartDrawer();
    };
  });
  list.querySelectorAll('input[data-role="qty"]').forEach(inp=> inp.onchange = ()=>{
    const id = inp.dataset.id; const it = state.cart.find(x=>x.id===id); if(!it) return;
    it.qty = Math.max(1, Math.min(99, (+inp.value||1)));
    save(); renderCartDrawer();
  });
}

function initCartDrawerHandlers(){
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('checkout')?.addEventListener('click', ()=>{
    if (!state.cart.length){ alert('Giỏ hàng trống.'); return; }
    const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);
    const preview = { items: state.cart, subtotal, discount: 0, shipping: 0, grand: subtotal };
    sessionStorage.setItem('orderPreview', JSON.stringify(preview));
    window.location.href = 'DatHang.html';
  });
}

// ========== Alphabet Filter ==========
function setupAlphabetFilter() {
  const alphaBar = $('#alphaBar');
  if (!alphaBar) return;

  alphaBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('alpha-btn')) {
      // Update active state
      alphaBar.querySelectorAll('.alpha-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');

      // Load products with selected letter
      const letter = e.target.dataset.letter;
      searchQuery = '';
      const searchInput = document.querySelector('.topbar .search input');
      if (searchInput) searchInput.value = '';
      loadProducts(letter);
    }
  });
}

// ========== Search on this page ==========
function setupSearchOnAllPage(){
  const input = document.querySelector('.topbar .search input');
  const btn   = document.querySelector('.topbar .search .pill');
  if (!input) return;
  const run = ()=>{
    searchQuery = (input.value||'').trim();
    const params = new URLSearchParams(location.search);
    if (searchQuery) params.set('search', searchQuery); else params.delete('search');
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    // giữ chữ cái hiện tại, chỉ áp dụng bộ lọc
    loadProducts(currentLetter || '*');
  };
  input.addEventListener('keypress', e=>{ if (e.key==='Enter') run(); });
  btn?.addEventListener('click', run);
}

// init
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  updateCount();
  
  // Only load products if we're on the products page
  if ($('#grid')) {
    // đọc query search nếu có
    const params = new URLSearchParams(location.search);
    searchQuery = (params.get('search') || '').trim();
    // set giá trị vào ô input nếu có
    const input = document.querySelector('.topbar .search input');
    if (input && searchQuery) input.value = searchQuery;

    loadProducts('*'); // Load and then apply search filter inside
    setupAlphabetFilter();
    setupSearchOnAllPage();
    setupModalHandlers();
    initCartDrawerHandlers();
    renderCartDrawer();
  }
});
