const fmt = (n)=> (n||0).toLocaleString('vi-VN') + 'đ';

const data = JSON.parse(sessionStorage.getItem('orderPreview') || 'null');
if(!data || !data.items?.length){
  alert('Không có dữ liệu đơn hàng.');
  window.location.href = 'GiaoDien.html';
}

async function normalizeName(s){
  return (s||'')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[–—‐]/g,'-')
    .replace(/\s+/g,' ')
    .trim();
}

let ALL_PRODUCTS_CACHE = null;
async function loadAllProducts(){
  if (ALL_PRODUCTS_CACHE) return ALL_PRODUCTS_CACHE;
  try{
    const r = await fetch('php/get_products.php?letter=*', { cache: 'no-store' });
    const j = await r.json();
    ALL_PRODUCTS_CACHE = (j && j.status==='success' && Array.isArray(j.data)) ? j.data : [];
  }catch(e){ ALL_PRODUCTS_CACHE = []; }
  return ALL_PRODUCTS_CACHE;
}

async function resolveMaSPByName(name){
  try{
    const core = String(name||'').split('–')[0].split('-')[0].trim();
    const q = encodeURIComponent(core || name || '');
    const url = `php/nhanvien.php?type=sanpham&action=fetch&search=${q}`;
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    if (j && j.status === 'ok' && Array.isArray(j.data)){
      const target = await normalizeName(name);
      let best = null;
      for (const row of j.data){
        const ten = await normalizeName(row.TenSP||'');
        if (ten === target) { best = row; break; }
        if (target.includes(ten) || ten.includes(target)) best = best || row;
      }
      if (best) return best;
    }
  }catch(e){}
  // Fallback: load all products and fuzzy-match by token overlap
  try{
    const all = await loadAllProducts();
    const target = await normalizeName(name);
    const toks = new Set(target.split(/[^a-z0-9]+/g).filter(Boolean));
    let best = null, bestScore = 0;
    for (const row of all){
      const ten = await normalizeName(row.TenSP||'');
      if (!ten) continue;
      const rtoks = new Set(ten.split(/[^a-z0-9]+/g).filter(Boolean));
      let score = 0; toks.forEach(t=>{ if (rtoks.has(t)) score++; });
      if (ten.includes(target) || target.includes(ten)) score += 2; // boost contains
      if (score > bestScore){ bestScore = score; best = row; }
    }
    return best;
  }catch(e){}
  return null;
}

async function ensureItemsHaveMaSP(items){
  const out = [];
  for (const it of items){
    if (/^SP\d+/i.test(String(it.id||''))){ out.push(it); continue; }
    const row = await resolveMaSPByName(it.name||'');
    if (row && row.MaSP){
      out.push({
        ...it,
        id: row.MaSP,
        price: parseFloat(row.DonGia||it.price||0),
        unit: row.DonViTinh || it.unit
      });
    }
    // nếu không tìm thấy -> bỏ qua item này để tránh lỗi backend
  }
  return out;
}

const itemsEl = document.querySelector('#items');
if(itemsEl){
  itemsEl.innerHTML = data.items.map(i=>`
    <div class="cart-row" style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center">
      <div>
        <div class="name">${i.name}</div>
        <div class="note muted">${i.qty} × ${fmt(i.price)} / ${i.unit||'sp'}</div>
      </div>
      <div class="line">${fmt(i.qty*i.price)}</div>
    </div>
  `).join('');
}

const elSub = document.querySelector('#tSubtotal');
const elShip = document.querySelector('#tShip');
const elGrand = document.querySelector('#tGrand');
if(elSub) elSub.textContent = fmt(data.subtotal);
if(elShip) elShip.textContent = fmt(data.shipping);
if(elGrand) elGrand.textContent = fmt(data.grand);

const formEl = document.querySelector('#checkoutForm');
if(formEl){
  formEl.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const mappedItems = await ensureItemsHaveMaSP(data.items || []);
    if (!mappedItems.length){
      alert('Sản phẩm trong giỏ chưa có trong kho. Vui lòng chọn sản phẩm có sẵn.');
      return;
    }
    const subtotal = mappedItems.reduce((s,i)=> s + (i.price||0)*(i.qty||1), 0);
    const previewUpdated = { ...data, items: mappedItems, subtotal, grand: subtotal };
    sessionStorage.setItem('orderPreview', JSON.stringify(previewUpdated));
    const payload = {
      customer: {
        name: document.getElementById('coName')?.value || '',
        phone: document.getElementById('coPhone')?.value || '',
        address: document.getElementById('coAddress')?.value || '',
        note: document.getElementById('coNote')?.value || '',
      },
      payment: formEl.querySelector('input[name="pay"]:checked')?.value || 'COD',
      order: previewUpdated
    };
    console.log('ĐƠN HÀNG GỬI LÊN BACKEND (demo):', payload);

    // Gửi lên backend để tạo hóa đơn trong bảng hoadon (schema MaHD,...)
    fetch('php/api/create_hoadon.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async r => {
      const text = await r.text();
      try{ return JSON.parse(text); }
      catch(e){ throw new Error(text || 'Phản hồi không hợp lệ từ máy chủ'); }
    })
    .then(res => {
      if (!res?.success) throw new Error(res?.message || 'Tạo hóa đơn thất bại');
      const o = res.data || {};
      // Lưu bản xem hóa đơn dựa trên dữ liệu form + preview để trang hóa đơn render đầy đủ
      const clientInvoice = {
        code: o.code || (o.codes?.[0]||''),
        status: o.status || 'pending',
        created_at: o.created_at || new Date().toISOString(),
        payment: payload.payment,
        customer: payload.customer,
        order: previewUpdated,
        pricing: o.pricing || null,
        codes: Array.isArray(o.codes) ? o.codes : []
      };
      sessionStorage.setItem('lastOrder', JSON.stringify(clientInvoice));
      sessionStorage.setItem('lastOrderCode', String(clientInvoice.code||''));
      if (clientInvoice.codes?.length) sessionStorage.setItem('lastOrderCodes', JSON.stringify(clientInvoice.codes));
      // Xoá giỏ hàng và chuyển sang trang hóa đơn (không truyền id/code để dùng session)
      localStorage.removeItem('cart');
      window.location.href = 'HoaDon.html';
    })
    .catch(err => {
      const msg = String(err?.message||'');
      alert('Không thể tạo đơn hàng: ' + (msg.length>300? msg.slice(0,300)+'…' : msg));
    });
  });
}
