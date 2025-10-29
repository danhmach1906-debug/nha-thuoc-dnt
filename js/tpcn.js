// ===== DATA: nội dung mỗi panel =====
const DATA = {
  "lam-dep": {
    title: "Hỗ trợ làm đẹp",
    chips: ["Da", "Hỗ trợ giảm cân", "Tóc"],
    items: [
      {id:"b1",name:"Royal Care Bio Hair, Nail – bổ sung khoáng…",price:160000,unit:"Hộp",img:"image/Royalcare.png"},
      //{id:"b2",name:"Hair Volume New Nordic giúp tóc chắc khoẻ…",price:567000,unit:"Hộp",img:"image/beauty2.png", old:630000, off:"-10%"},
      {id:"b3",name:"Hana Colla Q10 – đẹp da, chống oxy hoá",price:776000,unit:"Hộp",img:"image/Hanacolla.png", old:970000, off:"-20%"},
      {id:"b4",name:"Perfect White hỗ trợ làm sáng da…",price:1790000,unit:"Hộp",img:"image/Perfectwhite.png"},
      {id:"b5",name:"Omexxel Collagen giúp làm đẹp da",price:380000,unit:"Hộp",img:"image/Omexxelcollagen.png"}
    ]
  },
  "than-kinh": {
    title: "Thần kinh não",
    chips: ["Bổ não - cải thiện trí nhớ", "Hỗ trợ giấc ngủ", "Tuần hoàn máu", "Kiểm soát căng thẳng"],
    items: [
      {id:"n1",name:"Omexxel Ginkgo 120 hỗ trợ tuần hoàn não",price:788000,unit:"Hộp",img:"image/Omexxelginkgo.png"},
      {id:"n2",name:"Pikolin Ocavill – tuần hoàn máu não",price:492000,unit:"Hộp",img:"image/Pikolinocavill.png", old:615000, off:"-20%"},
      {id:"n3",name:"Natto Gold 3000FU – hỗ trợ hoạt huyết",price:295000,unit:"Hộp",img:"image/Nattogold.png"},
      {id:"n4",name:"GABA Jpanwell – hỗ trợ giấc ngủ ngon",price:960000,unit:"Hộp",img:"image/GABAjpanwell.png"}
    ]
  },
  "tieu-hoa": {
    title: "Hỗ trợ tiêu hóa",
    chips: ["Men vi sinh", "Lợi khuẩn", "Gan – mật"],
    items: [
      {id:"d1",name:"Men vi sinh Kids Probiotic",price:145000,unit:"Hộp",img:"image/Kidsprobiotic.png"},
      {id:"d2",name:"Probiotic 10 strains – hỗ trợ đường ruột",price:235000,unit:"Hộp",img:"image/Probiotic10strains.png"}
    ]
  },
  "dieu-tri": {
    title: "Hỗ trợ điều trị",
    chips: ["Cơ xương khớp", "Hô hấp", "Gout", "Tiết niệu"],
    items: [
      {id:"t1",name:"Calcium Premium JpanWell – xương khớp",price:920000,unit:"Hộp",img:"image/Calciumpremiumjpanwell.png"},
      {id:"t2",name:"Glucosamine Triple Strength – khớp",price:860000,unit:"Hộp",img:"image/Glucosaminetriplestrength.png", off:"-20%"}
    ]
  },
  "tim-mach": {
    title: "Sức khỏe tim mạch",
    chips: ["Omega 3", "Huyết áp", "Mỡ máu"],
    items: [
      {id:"h1",name:"Omega-3 Fish Oil 1000mg",price:210000,unit:"Hộp",img:"image/Omega3fish.png"}
    ]
  },
  "dinh-duong": {
    title: "Dinh dưỡng",
    chips: ["Vitamin tổng hợp", "Khoáng chất", "Sữa bột"],
    items: [
      {id:"v1",name:"Imuvita Easylife – đa vitamin",price:390000,unit:"Hộp",img:"image/Imuvitaeasylife.png"}
    ]
  }
};

// ===== UI render =====
const chipRow = document.getElementById('chipRow');
const scroller = document.getElementById('scroller');
const sectionTitle = document.getElementById('sectionTitle');

// Dialog elements
const dlg = document.getElementById('dlg');
const dlgTitle = document.getElementById('dlgTitle');
const dlgImg = document.getElementById('dlgImgPh');
const dlgPrice = document.getElementById('dlgPrice');
const dlgUnit = document.getElementById('dlgUnit');
const dlgDesc = document.getElementById('dlgDesc');
const dlgQty = document.getElementById('qty');
const dlgPlus = document.getElementById('plus');
const dlgMinus = document.getElementById('minus');
const addToCartBtn = document.getElementById('addToCart');

const fmt = n => (n || 0).toLocaleString('vi-VN') + 'đ';

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

// Update cart count in the UI (sum qty)
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

// Card template with click handler
const cardTpl = (p) => {
  const price = p.old ? 
    `<div><span class="price">${fmt(p.price)}</span> <span class="small"><span class="strike">${fmt(p.old)}</span> ${p.off || ''}</span></div>` :
    `<div class="price">${fmt(p.price)}</div>`;
    
  return `
  <article class="card" data-product='${JSON.stringify(p).replace(/'/g, '&#39;')}'>
    ${p.off ? `<div class="badge-off">${p.off}</div>` : ''}
    <div class="thumb"><img src="${p.img || 'image/placeholder.png'}" alt="${p.name}"></div>
    <div class="meta">
      <div class="title">${p.name}</div>
      ${price}
      <div class="unit">${p.unit}</div>
    </div>
  </article>`;
};

let allDbProducts = null;
const LOAI_MAP = { 'lam-dep':'L06','than-kinh':'L05','tieu-hoa':'L04','dieu-tri':'L03','tim-mach':'L07','dinh-duong':'L08' };
async function loadDbForPanel(key){
  try{
    if(!allDbProducts){
      const r = await fetch('php/get_products.php?letter=*', { cache: 'no-store' });
      const j = await r.json();
      allDbProducts = (j && j.status==='success' && Array.isArray(j.data)) ? j.data : [];
    }
    const ma = LOAI_MAP[key] || '';
    const list = (allDbProducts||[]).filter(p=> String(p.MaLoai||'')===ma).map(p=>({
      id: p.MaSP,
      name: p.TenSP,
      price: parseFloat(p.DonGia||0),
      unit: p.DonViTinh || 'Hộp',
      img: p.Hinhanh
    }));
    scroller.innerHTML = list.map(cardTpl).join('');
  }catch(e){ scroller.innerHTML=''; }
}

// render panel
function renderPanel(key) {
  const data = DATA[key];
  if (!data) return;
  sectionTitle.textContent = data.title;
  chipRow.innerHTML = data.chips.map(c => `<div class="chip">${c} <span>›</span></div>`).join('');
  scroller.innerHTML = '';
  loadDbForPanel(key);
  document.querySelectorAll('#leftNav a').forEach(a => {
    a.classList.toggle('active', a.dataset.panel === key);
  });
}

// Handle product click
function handleProductClick(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  
  const product = JSON.parse(card.dataset.product.replace(/&#39;/g, "'"));
  
  // Populate dialog
  dlgTitle.textContent = product.name;
  dlgImg.src = product.img || 'image/placeholder.png';
  dlgPrice.textContent = fmt(product.price);
  dlgUnit.textContent = product.unit;
  const _cat = document.getElementById('dlgCat'); if(_cat) _cat.textContent = 'tpcn';
  const _rx  = document.getElementById('dlgRx');  if(_rx)  _rx.textContent  = 'Không kê đơn';
  if (addToCartBtn) addToCartBtn.textContent = 'Đặt hàng';
  dlgQty.value = 1;
  
  // Show dialog
  dlg.showModal();
  
  // Store current product for add to cart
  dlg.currentProduct = product;
}

// Handle add to cart (use qty field)
async function addToCart() {
  const ok = await ensureLoggedIn(); if (!ok) return;
  if (!dlg.currentProduct) return;
  
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const quantity = parseInt(dlgQty.value) || 1;
  const product = dlg.currentProduct;
  
  // Check if product already in cart
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty = Math.min(99, (existing.qty || existing.quantity || 0) + quantity);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      img: product.img,
      qty: quantity
    });
  }
  
  // Save to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Update cart count
  updateCartCount();
  // Open cart drawer like GiaoDien
  try{ if (typeof openCart === 'function') openCart(); }catch(e){}
  
  // Close dialog
  dlg.close();
}

// Bind events
function bindEvents() {
  // Left nav
  document.querySelectorAll('#leftNav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      renderPanel(a.dataset.panel);
    });
  });
  
  // Product click
  scroller.addEventListener('click', handleProductClick);
  
  // Quantity controls
  dlgPlus.addEventListener('click', () => {
    dlgQty.value = (parseInt(dlgQty.value) || 1) + 1;
  });
  
  dlgMinus.addEventListener('click', () => {
    const qty = parseInt(dlgQty.value) || 1;
    if (qty > 1) dlgQty.value = qty - 1;
  });
  
  // Add to cart button
  addToCartBtn.addEventListener('click', addToCart);
  
  // Prevent closing when clicking inside dialog
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}

// Initialize
function init() {
  bindEvents();
  renderPanel('lam-dep'); // Show first panel by default
  updateCartCount(); // Initialize cart count
  // Ensure small cart button navigates to GioHang
  const cartAnchor = document.querySelector('.actions a.btn.primary[href="GioHang.html"]');
  if (cartAnchor){ cartAnchor.addEventListener('click', ()=>{}); }
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
