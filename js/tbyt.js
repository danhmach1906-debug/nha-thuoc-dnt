// ===================== DATA =====================
const CATALOG = {
  "thiet-bi-y-te": {
    menu: [
      { key: "dung-cu-y-te", label: "Dụng cụ y tế" },
      { key: "dung-cu-theo-doi", label: "Dụng cụ theo dõi" },
      { key: "dung-cu-so-cuu", label: "Dụng cụ sơ cứu" },
      { key: "khau-trang", label: "Khẩu trang" }
    ],
    panels: {
      "dung-cu-so-cuu": {
        title: "Dụng cụ sơ cứu",
        chips: ["Băng y tế","Bông y tế","Cồn, nước sát trùng, nước muối","Chăm sóc vết thương","Xịt giảm đau, kháng viêm","Miếng dán giảm đau, hạ sốt"],
        items: [
          { id:"tb1", name:"Miếng dán hạ sốt Bye Bye Fever Super Cool", price:60000, unit:"Hộp", img:"image/Miengdanhasot.png" },
          { id:"tb2", name:"Dung dịch xoa bóp cơ xương khớp OVIFA 60ml", price:125000, unit:"Chai", img:"image/Dungdichxoabop.png" },
          { id:"tb3", name:"Băng cá nhân độ dính cao Urgo Family", price:16000, unit:"Gói", img:"image/Bangcanhan.png" },
          { id:"tb4", name:"Cao dán giảm đau Chí Thống Cao", price:350000, unit:"Hộp", img:"image/Caodangiamdau.png" },
          { id:"tb5", name:"Chai xịt Hyalo4 Silver Spray hỗ trợ điều trị vết thương", price:590000, unit:"Hộp", img:"image/Hyalo4Silver.png" }
        ]
      },
      "dung-cu-y-te": {
        title: "Dụng cụ y tế",
        chips: ["Bơm kim tiêm","Nhiệt kế","Máy xông khí dung","Băng nẹp, nẹp cố định"],
        items: [
          { id:"yt1", name:"Nhiệt kế điện tử đầu mềm", price:89000, unit:"Cái", img:"image/Nhietkedientu.png" },
          { id:"yt2", name:"Máy xông mũi họng mini", price:590000, unit:"Máy", img:"image/Mayxongmuihong.png" }
        ]
      },
      "dung-cu-theo-doi": {
        title: "Dụng cụ theo dõi",
        chips: ["Máy đo huyết áp","Máy đo đường huyết","Cân sức khỏe","Ống nghe"],
        items: [
          { id:"td1", name:"Máy đo huyết áp bắp tay tự động", price:690000, unit:"Máy", img:"image/Maydohuyetap.png" },
          { id:"td2", name:"Máy đo đường huyết kèm que thử", price:520000, unit:"Bộ", img:"image/Maydoduonghuyet.png" }
        ]
      },
      "khau-trang": {
        title: "Khẩu trang",
        chips: ["Khẩu trang y tế","KF94/KF95","Khẩu trang trẻ em"],
        items: [
          { id:"kt1", name:"Khẩu trang y tế 4 lớp", price:28000, unit:"Hộp", img:"image/Khautrangyte.png" },
          { id:"kt2", name:"Khẩu trang KF94 người lớn", price:49000, unit:"Gói", img:"image/Khautrangnguoilon.png" }
        ]
      }
    }
  }
};

// ===================== RUNTIME =====================
const leftPanel = document.getElementById('leftPanel');
const leftNav = document.getElementById('leftNav');
const chipRow = document.getElementById('chipRow');
const scroller = document.getElementById('scroller');
const sectionTitle = document.getElementById('sectionTitle');
const seeAll = document.getElementById('seeAll');

const fmt = n => (n||0).toLocaleString('vi-VN') + 'đ';

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

const cardTpl = (p)=>`
  <article class="card" tabindex="0" aria-label="${p.name}">
    ${p.off?`<div class="badge-off">${p.off}</div>`:''}
    <div class="thumb"><img src="${p.img||'image/placeholder.png'}" alt="${p.name}"></div>
    <div class="meta">
      <div class="title">${p.name}</div>
      <div><span class="price">${fmt(p.price)}</span> / ${p.unit}
        ${p.old?` <span class="small" style="margin-left:6px"><span class="strike">${fmt(p.old)}</span></span>`:''}
      </div>
    </div>
  </article>`;

// ======== EVENTS ========
function setupProductClick() {
  document.querySelectorAll('#scroller .card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.querySelector('.title').textContent;
      const price = parseFloat(card.querySelector('.price').textContent.replace(/[^0-9]/g, ''));
      const unit = card.querySelector('.meta').textContent.split('/')[1]?.trim() || '';
      const img = card.querySelector('img')?.getAttribute('src') || 'image/placeholder.png';
      
      const dlg = document.getElementById('dlg');
      if (!dlg) return alert('❌ Không tìm thấy hộp thoại chi tiết sản phẩm');
      
      document.getElementById('dlgTitle').textContent = name;
      document.getElementById('dlgBrand').textContent = '';
      document.getElementById('dlgCat').textContent = 'tbyt';
      document.getElementById('dlgRx').textContent = 'Không kê đơn';
      document.getElementById('dlgUnit').textContent = unit;
      document.getElementById('dlgPrice').textContent = fmt(price);
      document.getElementById('dlgDesc').textContent = 'Sản phẩm y tế chính hãng, đảm bảo chất lượng.';
      document.getElementById('dlgImgPh').src = img;
      const addBtn = document.getElementById('addToCart'); if(addBtn) addBtn.textContent = 'Đặt hàng';
      
      document.getElementById('qty').value = 1;
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

function renderPanel(tabKey, panelKey){
  const tab = CATALOG[tabKey];
  const showLeft = !!tab;
  leftPanel.classList.toggle('show', showLeft);

  if(!showLeft){
    leftNav.innerHTML = '';
    sectionTitle.textContent = 'Bán chạy nhất';
    chipRow.innerHTML = '';
    scroller.innerHTML = '';
    seeAll.href = '#';
    return;
  }

  leftNav.innerHTML = tab.menu.map((m,i)=>
    `<a href="#/${tabKey}/${m.key}" data-panel="${m.key}" class="${(panelKey?m.key===panelKey:i===0)?'active':''}">${m.label}</a>`
  ).join('');

  const chosen = panelKey || tab.menu[0].key;
  const data = tab.panels[chosen];

  sectionTitle.textContent = data.title;
  chipRow.innerHTML = data.chips.map(c=>`<div class="chip">${c}<span>›</span></div>`).join('');
  scroller.innerHTML = data.items.map(cardTpl).join('');
  seeAll.href = `#/${tabKey}/${chosen}`;
  
  // Setup product click events after rendering
  setTimeout(setupProductClick, 0);

  document.querySelectorAll('#leftNav a').forEach(a=>{
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      document.querySelectorAll('#leftNav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      renderPanel(tabKey, a.dataset.panel);
      scroller.scrollTo({left:0, behavior:'smooth'});
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
      const name = document.getElementById('dlgTitle').textContent;
      const price = parseFloat(document.getElementById('dlgPrice').textContent.replace(/[^0-9]/g, ''));
      const unit = document.getElementById('dlgUnit').textContent;
      const img = document.getElementById('dlgImgPh').src;
      const qty = Math.max(1, parseInt(document.getElementById('qty').value) || 1);
      
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const found = cart.find(item => item.name === name);
      
      if (found) {
        found.qty += qty;
      } else {
        cart.push({ name, price, unit, img, qty });
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

renderPanel('thiet-bi-y-te');
