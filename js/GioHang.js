// ===== Helpers
const fmt = n => (n||0).toLocaleString('vi-VN') + 'đ';
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ===== State
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let discount = 0;      // số tiền giảm (hoặc tính theo %)
let discountRate = 0;  // nếu dùng % (VD: 10% => 0.1)
let shipping = 0;

// ===== Rendering
const els = {
  cartEmpty: $('#cartEmpty'),
  cartItems: $('#cartItems'),
  tSubtotal: $('#tSubtotal'),
  tDiscount: $('#tDiscount'),
  tShipping: $('#tShipping'),
  tGrand   : $('#tGrand'),
  form     : $('#checkoutForm'),
};

function saveCart(){
  localStorage.setItem('cart', JSON.stringify(cart));
}

function calcSubtotal(){
  return cart.reduce((s,i)=> s + i.price* i.qty, 0);
}

function calcShipping(){
  // đọc radio chọn ship
  const ship = els.form?.querySelector('input[name="ship"]:checked')?.value || 'express';
  const sub = calcSubtotal();

  if (ship === 'express') return 20000;
  // standard: free >= 499k, else 15k
  return sub >= 499000 ? 0 : 15000;
}

function calcTotals(){
  const sub = calcSubtotal();
  shipping = calcShipping();
  // nếu dùng rate thì discount tiền = sub * rate
  const discountMoney = discountRate ? Math.round(sub * discountRate) : discount;

  const grand = Math.max(0, sub - discountMoney) + shipping;

  els.tSubtotal.textContent = fmt(sub);
  els.tDiscount.textContent = '-' + fmt(discountMoney);
  els.tShipping.textContent = fmt(shipping);
  els.tGrand.textContent    = fmt(grand);
}

function rowTpl(item){
  return `
    <div class="cart-row" data-id="${item.id}" 
         style="display:flex;align-items:center;gap:10px;
                padding:10px 14px;margin-bottom:10px;
                background:#fff;border-radius:10px;
                box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      
      <div class="thumb"
           style="flex-shrink:0;width:60px;height:60px;
                  background:#f9fafb;border-radius:8px;
                  display:flex;align-items:center;justify-content:center;
                  overflow:hidden;">
        <img src="${item.img || 'image/default.png'}" 
             alt="${item.name}" 
             style="width:100%;height:100%;
                    object-fit:contain;object-position:center;
                    display:block;border-radius:6px;"
             onerror="this.src='image/default.png'">
      </div>

      <div style="flex:1;margin-left:10px;min-width:0;">
        <div style="font-weight:600;font-size:15px;color:#111827;
                    line-height:1.3;margin-bottom:4px;word-break:break-word;">
          ${item.name}
        </div>
        <div style="color:#64748b;font-size:13px;">${fmt(item.price)} / ${item.unit||''}</div>

        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
          <div class="qty"
               style="display:flex;align-items:center;
                      border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <button type="button" data-act="dec"
                    style="width:26px;height:26px;border:none;background:#f1f5f9;cursor:pointer;">–</button>
            <input data-role="qty" value="${item.qty}"
                   style="width:34px;text-align:center;border:none;outline:none;font-size:13px;">
            <button type="button" data-act="inc"
                    style="width:26px;height:26px;border:none;background:#f1f5f9;cursor:pointer;">+</button>
          </div>

          <button type="button" class="btn" data-act="del"
                  style="background:#fee2e2;color:#dc2626;border:none;
                         border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;">
            🗑 Xóa
          </button>
        </div>
      </div>

      <div style="font-weight:700;font-size:15px;color:#0e50ec;
                  min-width:40px;text-align:right;white-space:nowrap;">
        ${fmt(item.price * item.qty)}
      </div>
    </div>
  `;
}



function renderCart(){
  if (!cart.length){
    els.cartEmpty.classList.remove('hide');
    els.cartItems.innerHTML = '';
  } else {
    els.cartEmpty.classList.add('hide');
    els.cartItems.innerHTML = cart.map(rowTpl).join('');
    bindRowEvents();
  }
  calcTotals();
}

function bindRowEvents(){
  // +/- xoá / nhập qty
  $$('#cartItems .cart-row').forEach(row=>{
    const id = row.dataset.id;
    const it = cart.find(x=> String(x.id) === id);
    if(!it) return;

    row.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.onclick = ()=>{
        const act = btn.dataset.act;
        if(act==='del'){
          cart = cart.filter(x=> String(x.id) !== id);
        }else if(act==='inc'){
          const total = cart.reduce((s,i)=> s + (i.qty||0), 0);
          if (total >= 50){ alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); }
          else {
            const others = total - it.qty;
            const allowedForThis = Math.max(1, 50 - others);
            it.qty = Math.min(99, it.qty + 1, allowedForThis);
          }
        }else if(act==='dec'){
          it.qty = Math.max(1, it.qty - 1);
        }
        saveCart(); renderCart();
      };
    });

    const qtyInp = row.querySelector('input[data-role="qty"]');
    qtyInp.onchange = ()=>{
      const desired = Math.max(1, Math.min(99, (+qtyInp.value||1)));
      const others = cart.filter(x=>x.id!==id).reduce((s,i)=> s + (i.qty||0), 0);
      const allowed = Math.max(1, Math.min(99, 50 - others));
      it.qty = Math.min(desired, allowed);
      if (desired > allowed) alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.');
      saveCart(); renderCart();
    };
  });
}

// ===== Coupon
$('#applyCoupon')?.addEventListener('click', (e)=>{
  e.preventDefault();
  const code = ($('#couponInput').value || '').trim().toUpperCase();
  discount = 0; discountRate = 0;
  if(!code){ calcTotals(); return; }

  if(code === 'DNT10'){
    discountRate = 0.10; // giảm 10%
    alert('Áp dụng mã DNT10: giảm 10% tạm tính.');
  }else{
    alert('Mã không hợp lệ.');
  }
  calcTotals();
});

// ===== Ship/pay change -> recalc
els.form?.querySelectorAll('input[name="ship"]').forEach(r=> r.addEventListener('change', calcTotals));

// ===== Validate & Place order
$('#placeOrder')?.addEventListener('click', ()=>{
  if(!cart.length){ alert('Giỏ hàng đang trống.'); return; }

  // Nếu không có form (đang ở trang Giỏ hàng), điều hướng sang trang Đặt hàng
  if(!els.form){
    // Lưu tóm tắt đơn hàng để trang Đặt hàng hiển thị
    const sub = calcSubtotal();
    const shipFee = calcShipping();
    const discountMoney = discountRate ? Math.round(sub * discountRate) : discount;
    const grand = Math.max(0, sub - discountMoney) + shipFee;
    const preview = {
      items: cart,
      subtotal: sub,
      discount: discountMoney,
      shipping: shipFee,
      grand
    };
    sessionStorage.setItem('orderPreview', JSON.stringify(preview));
    window.location.href = 'DatHang.html';
    return;
  }

  // đơn giản: check 3 field bắt buộc
  const f = Object.fromEntries(new FormData(els.form).entries());
  let ok = true;

  const setErr = (name, msg='')=>{
    const wrap = els.form.querySelector(`[name="${name}"]`)?.closest('.field');
    if(wrap){ wrap.querySelector('.err').textContent = msg; }
  };

  // reset err
  ['fullname','phone','address'].forEach(n=> setErr(n,''));

  if(!f.fullname){ setErr('fullname','Vui lòng nhập họ tên'); ok=false; }
  if(!/^(0|\+84)\d{8,10}$/.test((f.phone||'').replace(/\s/g,''))){ setErr('phone','Số điện thoại không hợp lệ'); ok=false; }
  if(!f.address){ setErr('address','Vui lòng nhập địa chỉ'); ok=false; }

  if(!ok) { window.scrollTo({top:0, behavior:'smooth'}); return; }

  // build payload demo
  const sub = calcSubtotal();
  const shipFee = calcShipping();
  const discountMoney = discountRate ? Math.round(sub * discountRate) : discount;
  const grand = Math.max(0, sub - discountMoney) + shipFee;

  const order = {
    customer: {
      fullname: f.fullname, phone: f.phone, email: f.email||'',
      address: f.address, note: f.note||'',
    },
    shipping_method: f.ship,
    payment_method: f.pay,
    items: cart,
    pricing: {
      subtotal: sub,
      discount: discountMoney,
      shipping: shipFee,
      total: grand
    },
    coupon: ($('#couponInput').value||'').trim().toUpperCase() || null,
    created_at: new Date().toISOString()
  };

  console.log('ĐƠN HÀNG', order);
  alert('Đơn đặt thành công.');
  // OPTIONAL: clear cart
  // cart = []; saveCart(); renderCart();
});

// ===== Init
renderCart();

// ===== Đơn hàng đã đặt (modal) =====
function fmtDate(d){ try{ return new Date(d).toLocaleString('vi-VN'); }catch(e){ return d||''; } }

async function fetchOrders(){
  try{
    const res = await fetch('php/api/list_hoadon.php', { cache: 'no-store' });
    const text = await res.text();
    let data = null; try{ data = JSON.parse(text); }catch(e){ throw new Error(text || 'Phản hồi không hợp lệ'); }
    if(!data?.success){ throw new Error(data?.message || 'Không thể tải đơn hàng'); }
    return Array.isArray(data.data) ? data.data : [];
  }catch(err){
    alert('Lỗi tải đơn hàng: ' + (String(err?.message||'').slice(0,300)));
    return [];
  }
}

function renderOrdersList(list){
  const wrap = $('#ordersWrap'); if(!wrap) return;
  if(!list.length){ wrap.innerHTML = '<div class="muted">Chưa có hóa đơn nào.</div>'; return; }
  wrap.innerHTML = list.map(o=>`
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #e5eaf3;padding:12px;border-radius:10px">
      <div>
        <div style="font-weight:800;color:#0b2a6a">Mã hóa đơn: ${o.code||'—'}</div>
        <div class="muted">Ngày: ${fmtDate(o.date)||'—'} · Thanh toán: ${o.payment||'—'}</div>
        <div class="muted">Trạng thái: ${o.status||'—'}</div>
      </div>
      <div style="font-weight:900;color:#0e50ec">${fmt(o.total||0)}</div>
    </div>
  `).join('');
}

async function openOrders(){
  const dlg = $('#ordersDialog'); if(!dlg){ alert('Không tìm thấy hộp thoại đơn hàng.'); return; }
  renderOrdersList([]); // clear
  try{
    const list = await fetchOrders();
    renderOrdersList(list);
  }finally{
    try{ dlg.showModal(); }catch(e){ dlg.open = true; }
  }
}

$('#viewOrders')?.addEventListener('click', openOrders);
$('#closeOrders')?.addEventListener('click', ()=> $('#ordersDialog')?.close());

// ===== User menu (giống GiaoDien) =====
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
      if (userName) userName.textContent = sess.username || sess.full_name || 'Tài khoản';
      if (userRole) userRole.textContent = sess.role || 'Khách hàng';
      if (dashboardLink){
        const r = (sess.role||'').toLowerCase();
        const showDash = r.includes('quản trị') || r.includes('nhân viên') || r.includes('admin') || r.includes('staff');
        dashboardLink.style.display = showDash ? 'block' : 'none';
      }
    } else {
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

document.addEventListener('DOMContentLoaded', ()=>{ applySessionUI(); initUserDropdown(); });
