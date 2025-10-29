// ===== DATA: Chăm sóc cá nhân =====
const CATALOG = {
  "cham-soc-ca-nhan": {
    menu: [
      { key: "ve-sinh-ca-nhan",     label: "Vệ sinh cá nhân" },
      { key: "cham-soc-rang-mieng", label: "Chăm sóc răng miệng" },
      { key: "thuc-pham-do-uong",   label: "Thực phẩm - Đồ uống" },
      { key: "do-dung-gia-dinh",    label: "Đồ dùng gia đình" },
      { key: "hang-tong-hop",       label: "Hàng tổng hợp" },
      { key: "tinh-dau",            label: "Tinh dầu các loại" },
      { key: "thiet-bi-lam-dep",    label: "Thiết bị làm đẹp" }
    ],
    panels: {
      "ve-sinh-ca-nhan": {
        title: "Vệ sinh cá nhân",
        chips: ["Khăn ướt","Bông tẩy trang","Dao cạo","Dung dịch vệ sinh"],
        items: [
          { id:"vs1", name:"Khăn ướt không mùi 100 tờ", price:29000, unit:"Gói", img:"image/Khanuotkhongmui.png" },
          { id:"vs2", name:"Bông tẩy trang 120 miếng",  price:35000, unit:"Gói", img:"image/Bongtaytrang.png" }
        ]
      },
      "cham-soc-rang-mieng": {
        title: "Chăm sóc răng miệng",
        chips: ["Kem đánh răng","Bàn chải điện","Chỉ nha khoa","Nước súc miệng"],
        items: [
          { id:"rm1", name:"Nước súc miệng Chlor-Rinse Plus 250ml", price:131250, unit:"Chai", img:"image/Chlorrinse.png", old:175000, off:"-25%" },
          { id:"rm2", name:"Nước súc miệng Fluorinze Anti-cavity",  price:123750, unit:"Chai", img:"image/Fluorinzeanti.png", old:165000, off:"-25%" },
          { id:"rm5", name:"Bàn chải điện Oral-B Vitality",         price:479520, unit:"Hộp", img:"image/Oralbvitality.png", old:999000, off:"-52%" }
        ]
      },
      "thuc-pham-do-uong": {
        title: "Thực phẩm - Đồ uống",
        chips: ["Nước uống","Snack","Đồ dinh dưỡng"],
        items: [
          { id:"tp1", name:"Nước điện giải 500ml", price:15000, unit:"Chai", img:"image/Nuocdiengiai.png" }
        ]
      },
      "do-dung-gia-dinh": {
        title: "Đồ dùng gia đình",
        chips: ["Bông băng y tế","Găng tay","Khẩu trang"],
        items: [
          { id:"gd1", name:"Khẩu trang y tế 4 lớp", price:28000, unit:"Hộp", img:"image/Khautrangyte.png" }
        ]
      },
      "hang-tong-hop": {
        title: "Hàng tổng hợp",
        chips: ["Tiện ích","Phụ kiện"],
        items: [
          { id:"th1", name:"Bình uống kẻ vạch 1L", price:69000, unit:"Cái", img:"image/Binhuongkevach.png" }
        ]
      },
      "tinh-dau": {
        title: "Tinh dầu các loại",
        chips: ["Tinh dầu xông","Tinh dầu massage"],
        items: [
          { id:"tdau1", name:"Tinh dầu sả chanh 10ml", price:55000, unit:"Chai", img:"image/Tinhdausachanh.png" }
        ]
      },
      "thiet-bi-lam-dep": {
        title: "Thiết bị làm đẹp",
        chips: ["Máy rửa mặt","Máy xông mặt"],
        items: [
          { id:"tb1", name:"Máy rửa mặt sonic mini", price:329000, unit:"Máy", img:"image/Mayruamatsonicmini.png" }
        ]
      }
    }
  }
};

// ===== HELPERS =====
const fmt = n => (n || 0).toLocaleString('vi-VN') + 'đ';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

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

// ===== RENDER UI =====
function renderPanel(tabKey, panelKey) {
  const tab = CATALOG[tabKey];
  const leftNav = $('#leftNav');
  const chipRow = $('#chipRow');
  const scroller = $('#scroller');
  const sectionTitle = $('#sectionTitle');
  const seeAll = $('#seeAll');

  // --- Left menu ---
  leftNav.innerHTML = tab.menu.map((m, i) =>
    `<a href="#/${tabKey}/${m.key}" data-panel="${m.key}" 
       class="${(panelKey ? m.key === panelKey : i === 0) ? 'active' : ''}">${m.label}</a>`
  ).join('');

  const chosen = panelKey || tab.menu[0].key;
  const data = tab.panels[chosen];

  // --- Right side ---
  sectionTitle.textContent = data.title;
  chipRow.innerHTML = data.chips.map(c => `<div class="chip">${c}<span>›</span></div>`).join('');

  scroller.innerHTML = data.items.map(p => `
    <article class="card" tabindex="0" data-id="${p.id}" aria-label="${p.name}">
      ${p.off ? `<div class="badge-off">${p.off}</div>` : ''}
      <div class="thumb">
        <img src="${p.img}" alt="${p.name}" onerror="this.src='image/placeholder.png'">
      </div>
      <div class="meta">
        <div class="title">${p.name}</div>
        <div class="price-row">
          <div class="price">${fmt(p.price)}<span class="unit"> / ${p.unit}</span></div>
          <button class="add-to-cart-btn" data-product='${JSON.stringify(p).replace(/'/g, "'")}'>
            <i class="fas fa-cart-plus"></i> Thêm vào giỏ
          </button>
        </div>
        ${p.old ? `<div class="old-price">${fmt(p.old)}</div>` : ''}
      </div>
    </article>
  `).join('');
  seeAll.href = `#/${tabKey}/${chosen}`;

  // --- Menu click ---
  $$('#leftNav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      $$('#leftNav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      renderPanel(tabKey, a.dataset.panel);
      scroller.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });

  // --- Product click: hiển thị dialog ---
  setTimeout(() => {
    $$('#scroller .card').forEach(card => {
      card.addEventListener('click', () => {
        const p = {
          name: card.getAttribute('aria-label'),
          price: Number(card.querySelector('.price')?.textContent.replace(/\D/g, '') || 0),
          unit: card.querySelector('.meta')?.textContent.split('/')[1]?.trim() || '',
          img: card.querySelector('img')?.getAttribute('src') || 'image/placeholder.png'
        };

        const dlg = $('#dlg');
        if (!dlg) return alert('❌ Không tìm thấy #dlg');

        $('#dlgTitle').textContent = p.name;
        $('#dlgBrand').textContent = '';
        $('#dlgCat').textContent = '';
        $('#dlgRx').textContent = '';
        $('#dlgUnit').textContent = p.unit;
        const _cat = $('#dlgCat'); if(_cat) _cat.textContent = 'cssk';
        const _rx  = $('#dlgRx');  if(_rx)  _rx.textContent  = 'Không kê đơn';
        const addBtn = $('#addToCart'); if(addBtn) addBtn.textContent = 'Đặt hàng';
        $('#dlgPrice').textContent = fmt(p.price);
        $('#dlgDesc').textContent = 'Sản phẩm chính hãng, chất lượng cao.';
        $('#dlgImgPh').src = p.img;

        $('#qty').value = 1;
        dlg.showModal();
      });
    });
  }, 0);
}

// ===== Hàm thêm vào giỏ hàng =====
function addToCart(product) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(item => item.id === product.id);
  const requested = Math.max(1, +product.qty || 1);

  // enforce max 50 total items
  const currentTotal = cart.reduce((s,i)=> s + (i.qty||0), 0);
  const maxTotal = 50;
  if (currentTotal >= maxTotal) { alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); return; }
  const allowed = Math.max(0, maxTotal - currentTotal);
  const addQty = Math.min(requested, allowed);
  if (addQty <= 0) { alert('Giỏ hàng đã đạt giới hạn 50 sản phẩm.'); return; }

  if (existing) {
    existing.qty = Math.min(99, (existing.qty || 0) + addQty);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      img: product.img,
      qty: addQty
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showNotification('Đã thêm vào giỏ hàng');
}

// ===== Cập nhật số lượng giỏ hàng =====
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

// ===== Hiển thị thông báo =====
function showNotification(message) {
  // Tạo thông báo nếu chưa có
  let notification = document.querySelector('.notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'notification';
    document.body.appendChild(notification);
    
    // Thêm style cho thông báo
    const style = document.createElement('style');
    style.textContent = `
      .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        transition: transform 0.3s ease;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notification.show {
        transform: translateX(-50%) translateY(0);
      }
      .notification i {
        font-size: 18px;
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  notification.classList.add('show');
  
  // Ẩn thông báo sau 2 giây
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

// ===== Xử lý sự kiện =====
document.addEventListener('click', async (e) => {
  // Xử lý click nút Thêm vào giỏ
  const addToCartBtn = e.target.closest('.add-to-cart-btn');
  if (addToCartBtn) {
    e.preventDefault();
    e.stopPropagation();
    const ok = await ensureLoggedIn(); if (!ok) return;
    const product = JSON.parse(addToCartBtn.dataset.product);
    addToCart(product);
    return;
  }
  
  // Xử lý click nút + trong dialog
  if (e.target.closest('#plus')) {
    const q = $('#qty');
    q.value = Math.max(1, (+q.value || 1) + 1);
    return;
  }
  
  // Xử lý click nút - trong dialog
  if (e.target.closest('#minus')) {
    const q = $('#qty');
    q.value = Math.max(1, (+q.value || 1) - 1);
    return;
  }
  
  // Xử lý click nút Thêm vào giỏ trong dialog
  if (e.target.closest('#addToCart')) {
    const ok = await ensureLoggedIn(); if (!ok) return;
    const name = $('#dlgTitle').textContent;
    const price = Number($('#dlgPrice').textContent.replace(/\D/g, '')) || 0;
    const unit = $('#dlgUnit').textContent;
    const img = $('#dlgImgPh').src;
    const qty = Math.max(1, +$('#qty').value || 1);

    // Sử dụng qty thay vì quantity để đồng bộ với giỏ hàng
    addToCart({ id: 'dlg-' + Date.now(), name, price, unit, img, qty });
    try{ if(typeof openCart==='function') openCart(); }catch(e){}
    $('#dlg').close();
  }
});

// Cập nhật số lượng giỏ hàng khi tải trang
updateCartCount();

// ===== INIT =====
renderPanel('cham-soc-ca-nhan');
