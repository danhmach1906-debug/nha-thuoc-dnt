// ======== DATA ========
const CATALOG = {
  "duoc-my-pham": {
    menu: [
      { key: "da-mat", label: "Chăm sóc da mặt" },
      { key: "co-the", label: "Chăm sóc cơ thể" },
      { key: "giai-phap-lan-da", label: "Giải pháp làn da" },
      { key: "toc-da-dau", label: "Chăm sóc tóc – da đầu" },
      { key: "trang-diem", label: "Mỹ phẩm trang điểm" },
      { key: "vung-mat", label: "Chăm sóc da vùng mắt" },
      { key: "tu-nhien", label: "Sản phẩm từ thiên nhiên" }
    ],
    panels: {
      "da-mat": {
        title: "Chăm sóc da mặt",
        chips: ["Sữa rửa mặt", "Kem chống nắng", "Dưỡng da mặt", "Serum/Ampoule", "Mặt nạ"],
        items: [
          { id: "dm1", name: "Sữa rửa mặt thảo dược Sắc Ngọc Khang", price: 69000, unit: "Tuýp", img: "image/Sacngockhang.png" },
          { id: "dm2", name: "Nước tẩy trang JMsolution Derma Care", price: 165170, unit: "Chai", img: "image/JMsolutiondermacare.png", old: 199000, off: "-17%" },
          { id: "dm3", name: "Nước tẩy trang Water Luminous S.O.S", price: 165170, unit: "Chai", img: "image/Waterluminous.png", old: 199000, off: "-17%" },
          { id: "dm4", name: "Mặt nạ JMSolution Placenta Lanolin", price: 23800, unit: "Cái", img: "image/JMsolutionPlacentaLannolin.png", old: 28000, off: "-15%" }
        ]
      },
      "co-the": {
        title: "Chăm sóc cơ thể",
        chips: ["Sữa tắm", "Dưỡng thể", "Khử mùi", "Tẩy tế bào chết"],
        items: [
          { id: "ct1", name: "Sữa tắm dịu nhẹ Daily Calm", price: 129000, unit: "Chai", img: "image/Dailycalm.png" },
          { id: "ct2", name: "Lotion dưỡng thể Vit C Bright", price: 175000, unit: "Chai", img: "image/LotionvitC.png" }
        ]
      },
      "giai-phap-lan-da": {
        title: "Giải pháp làn da",
        chips: ["Mụn", "Sạm nám", "Lão hoá", "Dưỡng ẩm mạnh"],
        items: [
          { id: "gp1", name: "Serum trị mụn BHA 2%", price: 255000, unit: "Chai", img: "image/SerumBHA.png" },
          { id: "gp2", name: "Kem dưỡng phục hồi Barrier", price: 315000, unit: "Hũ", img: "image/Barrier.png" }
        ]
      },
      "toc-da-dau": {
        title: "Chăm sóc tóc – da đầu",
        chips: ["Dầu gội", "Dầu xả", "Serum tóc", "Ủ tóc"],
        items: [
          { id: "tk1", name: "Dầu gội phục hồi Protein", price: 165000, unit: "Chai", img: "image/DGprotein.png" },
          { id: "tk2", name: "Serum dưỡng tóc Argan", price: 220000, unit: "Chai", img: "image/Serumargan.png" }
        ]
      },
      "trang-diem": {
        title: "Mỹ phẩm trang điểm",
        chips: ["Kem nền", "Phấn phủ", "Son", "Tẩy trang"],
        items: [
          { id: "td1", name: "Cushion semi-matte SPF50", price: 320000, unit: "Hộp", img: "image/Cushionsemimatte.png" },
          { id: "td2", name: "Son tint dưỡng ẩm", price: 98000, unit: "Thỏi", img: "image/Sontint.png" }
        ]
      },
      "vung-mat": {
        title: "Chăm sóc da vùng mắt",
        chips: ["Kem mắt", "Mặt nạ mắt", "Serum mắt"],
        items: [
          { id: "vm1", name: "Kem dưỡng mắt peptide", price: 275000, unit: "Tuýp", img: "image/peptide.png" }
        ]
      },
      "tu-nhien": {
        title: "Sản phẩm từ thiên nhiên",
        chips: ["Hữu cơ", "Chiết xuất thiên nhiên"],
        items: [
          { id: "tn1", name: "Gel lô hội organic", price: 85000, unit: "Tuýp", img: "image/Gelorganic.png" }
        ]
      }
    }
  }
};

// ======== DOM ========
const leftPanel = document.getElementById('leftPanel');
const leftNav = document.getElementById('leftNav');
const chipRow = document.getElementById('chipRow');
const scroller = document.getElementById('scroller');
const sectionTitle = document.getElementById('sectionTitle');
const seeAll = document.getElementById('seeAll');

// ======== HELPERS ========
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
const cardTpl = (p) => `
  <article class="card" tabindex="0" data-product='${JSON.stringify(p).replace(/'/g,"&#39;")}' aria-label="${p.name}">
    <div class="thumb"><img src="${p.img || 'image/placeholder.png'}" alt="${p.name}"></div>
    <div class="meta">
      <div class="title">${p.name}</div>
      <div><span class="price">${fmt(p.price)}</span> / ${p.unit}</div>
    </div>
  </article>`;

let allDbProducts = null;
async function loadDb(){
  if(!allDbProducts){
    try{
      const r = await fetch('php/get_products.php?letter=*',{cache:'no-store'});
      const j = await r.json();
      allDbProducts = (j && j.status==='success' && Array.isArray(j.data)) ? j.data : [];
    }catch(e){ allDbProducts = []; }
  }
  // L06: Hỗ trợ làm đẹp
  const list = (allDbProducts||[]).filter(p=> String(p.MaLoai||'')==='L06').map(p=>({
    id: p.MaSP,
    name: p.TenSP,
    price: parseFloat(p.DonGia||0),
    unit: p.DonViTinh || 'Hộp',
    img: p.Hinhanh
  }));
  scroller.innerHTML = list.map(cardTpl).join('');
}

// ======== EVENTS ========
function setupProductClick() {
  document.querySelectorAll('#scroller .card').forEach(card => {
    card.addEventListener('click', () => {
      const p = JSON.parse(card.getAttribute('data-product'));
      const dlg = document.getElementById('dlg');
      if (!dlg) return alert('❌ Không tìm thấy #dlg');

      document.getElementById('dlgTitle').textContent = p.name;
      document.getElementById('dlgBrand').textContent = '';
      document.getElementById('dlgCat').textContent = 'dmp';
      document.getElementById('dlgRx').textContent = 'Không kê đơn';
      document.getElementById('dlgUnit').textContent = p.unit;
      document.getElementById('dlgPrice').textContent = fmt(p.price);
      document.getElementById('dlgDesc').textContent = 'Sản phẩm chính hãng, an toàn cho da.';
      document.getElementById('dlgImgPh').src = p.img;
      const addBtn = document.getElementById('addToCart'); if(addBtn) addBtn.textContent = 'Đặt hàng';

      document.getElementById('qty').value = 1;
      dlg.currentProduct = p;
      dlg.showModal();
    });
  });
}

// ======== CART FUNCTIONS ========
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = totalItems;
}

// ======== RENDER ========
function renderPanel(tabKey, panelKey) {
  const tab = CATALOG[tabKey];
  const showLeft = !!tab;
  leftPanel.classList.toggle('show', showLeft);

  if (!showLeft) {
    leftNav.innerHTML = '';
    sectionTitle.textContent = 'Bán chạy nhất';
    chipRow.innerHTML = '';
    scroller.innerHTML = '';
    seeAll.href = '#';
    return;
  }

  leftNav.innerHTML = tab.menu.map((m, i) => (
    `<a href="#/${tabKey}/${m.key}" data-panel="${m.key}" class="${(panelKey ? m.key === panelKey : i === 0) ? 'active' : ''}">${m.label}</a>`
  )).join('');

  const chosen = panelKey || tab.menu[0].key;
  const data = tab.panels[chosen];

  sectionTitle.textContent = data.title;
  chipRow.innerHTML = data.chips.map(c => `<div class="chip">${c}<span>›</span></div>`).join('');
  loadDb().then(()=> setTimeout(setupProductClick, 0));

  document.querySelectorAll('#leftNav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#leftNav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      renderPanel(tabKey, a.dataset.panel);
      scroller.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });
}

// ======== DIALOG EVENTS ========
document.addEventListener('DOMContentLoaded', () => {
  // Plus/Minus buttons
  const plusBtn = document.getElementById('plus');
  const minusBtn = document.getElementById('minus');
  const addToCartBtn = document.getElementById('addToCart');
  
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      const qty = document.getElementById('qty');
      qty.value = Math.max(1, (+qty.value || 1) + 1);
    });
  }
  
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      const qty = document.getElementById('qty');
      qty.value = Math.max(1, (+qty.value || 1) - 1);
    });
  }
  
  // Add to cart
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async () => {
      const ok = await ensureLoggedIn(); if (!ok) return;
      const dlg = document.getElementById('dlg');
      const cp = dlg && dlg.currentProduct ? dlg.currentProduct : null;
      const name = document.getElementById('dlgTitle').textContent;
      const price = parseFloat(document.getElementById('dlgPrice').textContent.replace(/[^0-9]/g, ''));
      const unit = document.getElementById('dlgUnit').textContent;
      const img = document.getElementById('dlgImgPh').src;
      const qty = Math.max(1, parseInt(document.getElementById('qty').value) || 1);
      
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      let found = null;
      if (cp && cp.id) {
        found = cart.find(item => item.id === cp.id);
      }
      if (!found) found = cart.find(item => item.name === name);
      
      if (found) {
        found.qty = Math.min(99, (found.qty||0) + qty);
      } else {
        cart.push({ id: cp?.id, name, price, unit, img, qty });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      try{ if(typeof openCart==='function') openCart(); }catch(e){}
      document.getElementById('dlg').close();
    });
  }
  
  // Update cart count on page load
  updateCartCount();
});

// ======== INIT ========
renderPanel('duoc-my-pham');
