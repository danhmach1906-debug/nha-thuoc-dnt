// Shared cart drawer for category pages
(function(){
  const $ = (s)=>document.querySelector(s);
  const fmt = (n)=> (n||0).toLocaleString('vi-VN') + 'đ';
  const state = { cart: [] };
  try{ state.cart = JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ state.cart=[]; }

  function persist(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }

  function updateHeaderCount(){
    const el = document.getElementById('cartCount');
    if(!el) return;
    const total = state.cart.reduce((s,i)=> s + (i.qty||i.quantity||0), 0);
    el.textContent = String(total);
  }

  function render(){
    const list = $('#cartList'); if(!list) return;
    if(!state.cart.length){
      list.innerHTML = '<div class="muted">Giỏ hàng trống.</div>';
      $('#subtotal') && ($('#subtotal').textContent = '0đ');
      $('#grand') && ($('#grand').textContent = '0đ');
      updateHeaderCount();
      return;
    }
    list.innerHTML = state.cart.map(r=>`
      <div class="cart-item">
        <div class="thumb" style="width:56px;height:56px;background:#f3f6ff;border-radius:10px;display:grid;place-items:center;overflow:hidden;">
          <img src="${r.img||'image/default.png'}" alt="${r.name||''}"
               style="max-width:100%;max-height:100%;object-fit:contain"
               onerror="this.src='image/default.png'">
        </div>
        <div>
          <div class="title">${r.name||''}</div>
          <div class="muted">${r.unit||''}</div>
          <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
            <div class="qty">
              <button data-act="dec" data-id="${r.id||r.name}">–</button>
              <input data-role="qty" data-id="${r.id||r.name}" value="${r.qty||r.quantity||1}">
              <button data-act="inc" data-id="${r.id||r.name}">+</button>
            </div>
            <button class="btn" data-act="del" data-id="${r.id||r.name}">🗑 Xóa</button>
          </div>
        </div>
        <div style="font-weight:800">${fmt((r.price||0) * (r.qty||r.quantity||1))}</div>
      </div>
    `).join('');
    const subtotal = state.cart.reduce((s,i)=> s + (i.price||0)*(i.qty||i.quantity||1), 0);
    $('#subtotal') && ($('#subtotal').textContent = fmt(subtotal));
    $('#grand') && ($('#grand').textContent = fmt(subtotal));
    updateHeaderCount();

    // Bind row actions
    list.querySelectorAll('button[data-act]').forEach(b=> b.onclick = ()=>{
      const id = b.dataset.id;
      const it = state.cart.find(x=> String(x.id||x.name)===String(id)); if(!it) return;
      if(b.dataset.act==='del') state.cart = state.cart.filter(x=> String(x.id||x.name)!==String(id));
      if(b.dataset.act==='inc'){
        const total = state.cart.reduce((s,i)=> s + (i.qty||i.quantity||0), 0);
        if (total >= 50){ alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.'); }
        else it.qty = Math.min(99, (it.qty||it.quantity||1)+1, 50 - (total - (it.qty||it.quantity||1)) );
      }
      if(b.dataset.act==='dec') it.qty = Math.max(1, (it.qty||it.quantity||1)-1);
      persist(); render();
    });
    list.querySelectorAll('input[data-role="qty"]').forEach(inp=> inp.onchange = ()=>{
      const id = inp.dataset.id; const it = state.cart.find(x=> String(x.id||x.name)===String(id)); if(!it) return;
      const desired = Math.max(1, Math.min(99, (+inp.value||1)));
      const others = state.cart.filter(x=> String(x.id||x.name)!==String(id)).reduce((s,i)=> s + (i.qty||i.quantity||0), 0);
      const allowed = Math.max(1, Math.min(99, 50 - others));
      it.qty = Math.min(desired, allowed);
      if (desired > allowed) alert('Giỏ hàng chỉ cho phép tối đa 50 sản phẩm.');
      persist(); render();
    });
  }

  function buildPreview(){
    const subtotal = state.cart.reduce((s,i)=> s + (i.price||0)*(i.qty||i.quantity||1), 0);
    return { items: state.cart, subtotal, discount: 0, shipping: 0, grand: subtotal };
  }

  function checkout(){
    if(!state.cart.length){ alert('Giỏ hàng trống.'); return; }
    const preview = buildPreview();
    sessionStorage.setItem('orderPreview', JSON.stringify(preview));
    window.location.href = 'DatHang.html';
  }

  function open(){ const el=$('#cart'); if(el) el.classList.add('open'); }
  function close(){ const el=$('#cart'); if(el) el.classList.remove('open'); }

  // Wire header buttons if present
  document.addEventListener('DOMContentLoaded', ()=>{
    $('#closeCart')?.addEventListener('click', close);
    $('#checkout')?.addEventListener('click', checkout);
    render();
  });

  // Expose
  window.openCart = open;
  window.renderCartDrawer = render;
})();
