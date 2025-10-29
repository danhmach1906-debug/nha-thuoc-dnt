// ===== Helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt = (n) => (n||0).toLocaleString('vi-VN') + 'đ';

// ===== SEARCH PRODUCTS =====
function searchProducts() {
  const input = document.getElementById('mainSearchInput');
  const query = input?.value.trim();
  
  if (!query) {
    alert('Vui lòng nhập từ khóa tìm kiếm');
    return;
  }
  
  // Chuyển đến trang MenuTatca.html với query
  window.location.href = `MenuTatca.html?search=${encodeURIComponent(query)}`;
}

// ===== HERO SLIDER =====
(function(){
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const slides = Array.from(hero.querySelectorAll('.slide'));
  if (!slides.length) return;

  const prevBtn = hero.querySelector('.prev');
  const nextBtn = hero.querySelector('.next');
  const dotsWrap = hero.querySelector('#heroDots') || hero.querySelector('.dots');

  let idx = 0, timer = null;

  // create dots
  if (dotsWrap && !dotsWrap.children.length) {
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'dot' + (i===0 ? ' active' : '');
      d.setAttribute('aria-label','Chuyển banner ' + (i+1));
      d.addEventListener('click', () => go(i));
      dotsWrap.appendChild(d);
    });
  }

  function render(){
    slides.forEach((s,i)=> s.classList.toggle('active', i===idx));
    if (dotsWrap) [...dotsWrap.children].forEach((d,i)=> d.classList.toggle('active', i===idx));
  }
  function go(n){ idx = (n + slides.length) % slides.length; render(); restart(); }
  function next(){ go(idx+1); }
  function prev(){ go(idx-1); }
  function start(){ timer = setInterval(next, 4000); }
  function stop(){ if (timer) clearInterval(timer); }
  function restart(){ stop(); start(); }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', start);

  render(); start();
})();

// ===== Search focus effect
const input = document.querySelector('.search input');
input?.addEventListener('focus', ()=>{ document.querySelector('.search .input').style.boxShadow = `0 0 0 3px var(--ring)`;});
input?.addEventListener('blur', ()=>{ document.querySelector('.search .input').style.boxShadow = 'none';});

// ===== Filter demo
const cards = [...document.querySelectorAll('.products .card')];
function applyFilter(cat){
  cards.forEach(c=>{ const ok=(cat==='all')||(c.dataset.cat===cat); c.style.display = ok?'':'none';});
  document.querySelectorAll('.nav-link[data-filter]').forEach(a=>{
    const active=(a.dataset.filter===cat); a.style.opacity=active?'1':'0.85'; a.style.fontWeight=active?'800':'600';
  });
}
document.querySelectorAll('.nav-link[data-filter]').forEach(a=> a.addEventListener('click', ()=> applyFilter(a.dataset.filter||'all')));
applyFilter('all');

// ===== Product modal + cart
const state = { cart: JSON.parse(localStorage.getItem('cart')||'[]'), current:null };
const dlg = $('#dlg');

cards.forEach(card=>{
  card.addEventListener('click', ()=>{
    const p = {
      id: card.dataset.id, name: card.dataset.name, brand: card.dataset.brand||'',
      cat: card.dataset.cat||'', price: Number(card.dataset.price||0), unit: card.dataset.unit||'',
      desc: card.dataset.desc||'', img: card.dataset.img||'', rx: String(card.dataset.rx)==='true'
    };
    state.current = p;
    $('#dlgTitle').textContent = p.name;
    $('#dlgBrand').textContent = p.brand;
    $('#dlgCat').textContent   = p.cat;
    $('#dlgUnit').textContent  = p.unit;
    $('#dlgRx').textContent    = p.rx? 'Kê đơn bắt buộc' : 'Không kê đơn';
    $('#dlgPrice').textContent = fmt(p.price);
    $('#dlgDesc').textContent  = p.desc;
    $('#qty').value = 1;
    const imgEl = $('#dlgImgPh');
    if(imgEl){ imgEl.src = p.img || 'placeholder.png'; imgEl.alt = p.name || 'Ảnh sản phẩm'; }
    dlg.showModal();
  });
});

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

$('#plus')?.addEventListener('click', ()=>{ const x=$('#qty'); x.value = Math.max(1,(+x.value||1)+1) });
$('#minus')?.addEventListener('click', ()=>{ const x=$('#qty'); x.value = Math.max(1,(+x.value||1)-1) });
$('#addToCart')?.addEventListener('click', async ()=>{
  const ok = await ensureLoggedIn(); if (!ok) return;
  const p = state.current; 
  if (!p) return;

  const qty = Math.max(1, Math.min(99, (+$('#qty').value || 1)));
  const found = state.cart.find(i => i.id === p.id);

  if (found) {
    found.qty = Math.min(99, found.qty + qty);
    // vá ảnh cho item cũ
    if (!found.img && p.img) found.img = p.img;
  } else {
    state.cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      qty,
      img: (p.img?.includes('image/') ? p.img : 'image/' + p.img) || $('#dlgImgPh')?.src || 'image/default.png'

    });
  }

  persist();
  renderCart();
  dlg.close();
  openCart();
});


// Cart
const cartEl = $('#cart');
const openCart = ()=> cartEl.classList.add('open');
const closeCart = ()=> cartEl.classList.remove('open');
$('#openCartBtn')?.addEventListener('click', openCart);
$('#closeCart')?.addEventListener('click', closeCart);

function persist(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }
function renderCart(){
  const list = $('#cartList');
  if(!state.cart.length){
    list.innerHTML = '<div class="muted">Giỏ hàng trống.</div>';
    $('#subtotal').textContent = '0đ'; $('#grand').textContent='0đ'; $('#cartCount').textContent='0'; return;
  }
  list.innerHTML = state.cart.map(r=>`
    <div class="cart-item">
      <div style="width:56px;height:56px;background:#f2f6ff;border-radius:10px;display:grid;place-items:center">🧴</div>
      <div>
        <div class="title">${r.name}</div>
        <div class="muted">${r.unit}</div>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
          <div class="qty">
            <button data-act="dec" data-id="${r.id}">–</button>
            <input data-role="qty" data-id="${r.id}" value="${r.qty}" />
            <button data-act="inc" data-id="${r.id}">+</button>
          </div>
          <button class="btn" data-act="del" data-id="${r.id}">🗑 Xóa</button>
        </div>
      </div>
      <div style="font-weight:800">${fmt(r.price*r.qty)}</div>
    </div>
  `).join('');
  const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);
  $('#subtotal').textContent = fmt(subtotal);
  $('#grand').textContent = fmt(subtotal);
  $('#cartCount').textContent = state.cart.reduce((s,i)=>s+i.qty,0);

  // bind actions
  list.querySelectorAll('button[data-act]').forEach(b=> b.onclick = ()=>{
    const id = b.dataset.id; const it = state.cart.find(x=>x.id===id); if(!it) return;
    if(b.dataset.act==='del') state.cart = state.cart.filter(x=>x.id!==id);
    if(b.dataset.act==='inc'){
      const total = state.cart.reduce((s,i)=> s + (i.qty||0), 0);
      if (total >= 50){ alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); }
      else it.qty = Math.min(99, it.qty+1, 50 - (total - it.qty));
    }
    if(b.dataset.act==='dec') it.qty = Math.max(1, it.qty-1);
    persist(); renderCart();
  });
  list.querySelectorAll('input[data-role="qty"]').forEach(inp=> inp.onchange = ()=>{
    const id = inp.dataset.id; const it = state.cart.find(x=>x.id===id); if(!it) return;
    const desired = Math.max(1, Math.min(99, (+inp.value||1)));
    const others = state.cart.filter(x=>x.id!==id).reduce((s,i)=> s + (i.qty||0), 0);
    const allowed = Math.max(1, Math.min(99, 50 - others));
    it.qty = Math.min(desired, allowed);
    if (desired > allowed) alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.');
    persist(); renderCart();
  });
}
$('#checkout')?.addEventListener('click', ()=>{
  if(!state.cart.length) { alert('Giỏ hàng trống.'); return; }
  const subtotal = state.cart.reduce((s,i)=> s + i.price*i.qty, 0);
  const preview = {
    items: state.cart,
    subtotal,
    discount: 0,
    shipping: 0,
    grand: subtotal
  };
  // Save cart items to localStorage
  localStorage.setItem('cart', JSON.stringify(state.cart));
  // Save order preview to sessionStorage
  sessionStorage.setItem('orderPreview', JSON.stringify(preview));
  // Redirect to DatHang.html
  window.location.href = 'DatHang.html';
});
renderCart();

async function applySessionUI(){
  try{
    const res = await fetch('php/session.php', { cache: 'no-store' });
    const sess = await res.json();
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const dashboardLink = document.getElementById('dashboardLink');

    if (sess && sess.logged_in){
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.style.display = '';
      if (userName) userName.textContent = sess.username || '';
      if (userRole) userRole.textContent = sess.role || '';
      if (dashboardLink){
        const r = (sess.role||'').toLowerCase();
        const showDash = r.includes('quản trị') || r.includes('nhân viên') || r.includes('admin') || r.includes('staff');
        dashboardLink.style.display = showDash ? 'block' : 'none';
      }
    }else{
      if (loginBtn) loginBtn.style.display = '';
      if (userMenu) userMenu.style.display = 'none';
    }
  }catch(e){ /* ignore */ }
}

function initUserDropdown(){
  const btn = document.getElementById('userBtn');
  const dd  = document.getElementById('userDropdown');
  const wrap= document.getElementById('userMenu');
  btn?.addEventListener('click', ()=>{
    if (!dd) return; dd.style.display = (dd.style.display==='block') ? 'none' : 'block';
  });
  document.addEventListener('click', (e)=>{
    if (!dd || !wrap) return; if (!wrap.contains(e.target)) dd.style.display = 'none';
  });
}

function logout(){ if (confirm('Bạn có chắc muốn đăng xuất?')) { window.location.href = 'php/logout.php'; } }
window.logout = logout;

document.addEventListener('DOMContentLoaded', ()=>{ applySessionUI(); initUserDropdown(); });
//==========intro=================//
(function () {
  const intro = document.getElementById('intro');
  const app   = document.getElementById('app');
  const skip  = document.getElementById('skipIntro');
  const video = document.getElementById('introVideo');

  // Hiện 1 lần mỗi phiên
  const seen = sessionStorage.getItem('introSeen');

  function showApp() {
    if (app) app.classList.remove('is-hidden');
    document.body.classList.remove('noscroll');
  }


function endIntro() {
  if (!intro) { showApp(); return; }

  // đưa về đầu trang và tắt smooth trong 1 tick để không nhảy nhót
  const root = document.documentElement;
  const prevSmooth = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';

// KÉO VỀ ĐẦU TRANG để hết khoảng trắng do giữ vị trí scroll
  // gọi 2 lần để chắc ăn trên Safari/chrome cũ
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 0);
  intro.classList.add('hide');
  sessionStorage.setItem('introSeen', '1');

  setTimeout(() => {
    showApp();
    try { intro.remove(); } catch(e){}
    // khôi phục smooth nếu trước đó có dùng
    root.style.scrollBehavior = prevSmooth || '';
  }, 600);
}


//  function endIntro() {
//    if (!intro) { showApp(); return; }
//    intro.classList.add('hide');         // fade out
//    sessionStorage.setItem('introSeen', '1');
//    setTimeout(() => {
//      showApp();
//      try { intro.remove(); } catch(e){}
//    }, 600);
//  }

  function startIntro() {
    if (!intro || !app) return showApp();

    document.body.classList.add('noscroll');
    app.classList.add('is-hidden');

    let safety = setTimeout(endIntro, 6000); // fallback nếu video lỗi

    // Khi video sẵn sàng -> có thể thêm logic nếu muốn
    video && video.addEventListener('canplay', () => { /* noop */ }, { once: true });

    // Tự đóng khi video kết thúc
    video && video.addEventListener('ended', () => {
      clearTimeout(safety);
      endIntro();
    }, { once: true });

    // Nút Bỏ qua
    skip && skip.addEventListener('click', () => {
      clearTimeout(safety);
      // Dừng video để giải phóng
      try { video.pause(); } catch(e){}
      endIntro();
    });
  }

  if (seen) {
    // Đã xem trong phiên -> bỏ qua intro
    endIntro();
  } else {
    // Bắt đầu intro khi DOM sẵn sàng
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startIntro);
    } else {
      startIntro();
    }
  }
})();

// ===== LOAD PRODUCTS FROM DATABASE =====
(async function() {
  const productScroller = document.getElementById('productScroller');
  if (!productScroller) return;

  try {
    // Fetch products from API
    const response = await fetch('php/api/get_products.php?limit=20');
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      // Clear existing products
      productScroller.innerHTML = '';
      
      // Render products
      data.data.forEach(product => {
        const article = document.createElement('article');
        article.className = 'card';
        // Align fields with API php/get_products.php
        article.dataset.id = product.MaSP;
        article.dataset.name = product.TenSP;
        article.dataset.price = product.DonGia;
        article.dataset.unit = product.DonViTinh;
        article.dataset.brand = product.TenNCC || 'DNT';
        article.dataset.img = product.Hinhanh;
        
        article.innerHTML = `
          <div class="thumb">
            <img src="${product.Hinhanh}" 
                 alt="${product.TenSP}" 
                 style="max-width:100%;max-height:100%;object-fit:contain;"
                 onerror="this.src='image/default.png'">
          </div>
          <div class="meta">
            <div class="title-2">${product.TenSP}</div>
            <div class="price">${fmt(product.DonGia)} / ${product.DonViTinh}</div>
            <div class="small">Còn hàng · Giao nhanh</div>
          </div>
        `;
        
        productScroller.appendChild(article);
      });
      
      console.log(`✅ Loaded ${data.data.length} products from database`);
    }
  } catch (error) {
    console.error('❌ Error loading products:', error);
    // Keep the default hardcoded products if API fails
  }
})();
function renderCart() {
  const list = document.getElementById("cartList");
  if (!state.cart.length) {
    list.innerHTML = '<div class="muted">Giỏ hàng trống.</div>';
    document.getElementById("subtotal").textContent = "0đ";
    document.getElementById("grand").textContent = "0đ";
    document.getElementById("cartCount").textContent = "0";
    return;
  }

  // vá lại các sản phẩm không có ảnh (do cart cũ trong localStorage)
  state.cart.forEach(it => {
    if (!it.img) {
      const cardEl = document.querySelector(`.products .card[data-id="${it.id}"]`);
      const imgSrc = cardEl?.querySelector(".thumb img")?.getAttribute("src");
      it.img = imgSrc || "image/default.png";
    }
  });
  persist();

  list.innerHTML = state.cart.map(r => `
    <div class="cart-item">
      <div class="thumb" 
           style="width:56px;height:56px;background:#f3f6ff;border-radius:10px;display:grid;place-items:center;overflow:hidden;">
        <img src="${r.img}" alt="${r.name}"
             style="max-width:100%;max-height:100%;object-fit:contain"
             onerror="this.src='image/default.png'">
      </div>
      <div>
        <div class="title">${r.name}</div>
        <div class="muted">${r.unit}</div>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
          <div class="qty">
            <button data-act="dec" data-id="${r.id}">–</button>
            <input data-role="qty" data-id="${r.id}" value="${r.qty}">
            <button data-act="inc" data-id="${r.id}">+</button>
          </div>
          <button class="btn" data-act="del" data-id="${r.id}">🗑 Xóa</button>
        </div>
      </div>
      <div style="font-weight:800">${fmt(r.price * r.qty)}</div>
    </div>
  `).join("");

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("subtotal").textContent = fmt(subtotal);
  document.getElementById("grand").textContent = fmt(subtotal);
  document.getElementById("cartCount").textContent = state.cart.reduce((s, i) => s + i.qty, 0);

  // hành động nút tăng/giảm/xóa
  list.querySelectorAll("button[data-act]").forEach(b => {
    const id = b.dataset.id;
    b.onclick = () => {
      const it = state.cart.find(x => x.id === id);
      if (!it) return;
      if (b.dataset.act === "del") state.cart = state.cart.filter(x => x.id !== id);
      if (b.dataset.act === "inc"){
        const total = state.cart.reduce((s,i)=> s + (i.qty||0), 0);
        if (total >= 50){ alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); }
        else it.qty = Math.min(99, it.qty+1, 50 - (total - it.qty));
      }
      if (b.dataset.act === "dec") it.qty = Math.max(1, it.qty-1);
      persist();
      renderCart();
    };
  });

  list.querySelectorAll('input[data-role="qty"]').forEach(inp => {
    inp.onchange = () => {
      const id = inp.dataset.id;
      const it = state.cart.find(x => x.id === id);
      if (!it) return;
      const desired = Math.max(1, Math.min(99, (+inp.value||1)));
      const others = state.cart.filter(x=>x.id!==id).reduce((s,i)=> s + (i.qty||0), 0);
      const allowed = Math.max(1, Math.min(99, 50 - others));
      it.qty = Math.min(desired, allowed);
      if (desired > allowed) alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.');
      persist();
      renderCart();
    };
  });
}
