 const fmt = (n)=> (n||0).toLocaleString('vi-VN') + 'đ';

const params = new URLSearchParams(location.search);
const orderIdParam = params.get('id') || '';
const orderCodeParam = params.get('code') || '';
let order = null;

function textPay(code){
  if(code==='COD') return 'Thanh toán khi nhận hàng (COD)';
  if(code==='BANK') return 'Chuyển khoản ngân hàng';
  if(code==='WALLET') return 'Ví điện tử';
  return code||'—';
}

function render(ord){
  const idEl = document.getElementById('invId');
  const stEl = document.getElementById('invStatus');
  const timeEl = document.getElementById('invTime');
  const payEl = document.getElementById('invPayment');
  const cName = document.getElementById('cName');
  const cPhone= document.getElementById('cPhone');
  const cAddr = document.getElementById('cAddress');
  const cNote = document.getElementById('cNote');

  if(idEl) idEl.textContent = 'Mã đơn: ' + (ord.code || ('#' + (ord.id || '—')));
  if(timeEl) timeEl.textContent = new Date(ord.created_at || Date.now()).toLocaleString('vi-VN');
  if(payEl) payEl.textContent = textPay(ord.payment);
  if(stEl){
    const canceled = ord.status === 'canceled';
    stEl.textContent = canceled ? 'Đã hủy' : 'Đang xử lý';
    stEl.classList.toggle('canceled', canceled);
  }

  // Cập nhật tiến trình
  updateProgress(ord.status||'pending');

  if(cName) cName.textContent = ord.customer?.name || '—';
  if(cPhone) cPhone.textContent = ord.customer?.phone || '—';
  if(cAddr) cAddr.textContent = ord.customer?.address || '—';
  if(cNote) cNote.textContent = ord.customer?.note || '';

  const list = document.getElementById('invItems');
  const items = ord.items || (ord.order?.items || []);
  if(list){
    const toImg = (u)=>{
      if(!u) return 'image/default.png';
      const s = String(u);
      if(/^https?:|^data:/.test(s)) return s;
      return s.includes('image/') ? s : ('image/' + s);
    };
    list.innerHTML = items.map(i=>{
      const src = toImg(i.image || i.img);
      return `
      <div class="cart-row">
        <div class="thumb"><img src="${src}" alt="${i.name||''}" onerror="this.src='image/default.png'"></div>
        <div>
          <div class="name">${i.name||''}</div>
          <div class="note">${i.qty||1} × ${fmt(i.price||0)} / ${i.unit||'sp'}</div>
        </div>
        <div class="item-price">${fmt((i.qty||1)*(i.price||0))}</div>
      </div>`;
    }).join('');
  }

  const sub = (ord.pricing?.subtotal ?? ord.order?.subtotal) || 0;
  const ship= (ord.pricing?.shipping ?? ord.order?.shipping) || 0;
  const disc= (ord.pricing?.discount ?? ord.order?.discount) || 0;
  const grand= (ord.pricing?.total ?? ord.order?.grand) ?? Math.max(0, sub - (disc||0) + (ship||0));
  const elSub = document.getElementById('invSubtotal');
  const elShip= document.getElementById('invShipping');
  const elDisc= document.getElementById('invDiscount');
  const elGrand= document.getElementById('invGrand');
  if(elSub) elSub.textContent = fmt(sub);
  if(elShip) elShip.textContent = fmt(ship);
  if(elDisc) elDisc.textContent = '-' + fmt(disc||0);
  if(elGrand) elGrand.textContent = fmt(grand);

  const btnCancel = document.getElementById('btnCancelOrder');
  if(btnCancel){
    if(ord.status === 'canceled') btnCancel.setAttribute('disabled','');
    const storedCodes = (()=>{ try{ return JSON.parse(sessionStorage.getItem('lastOrderCodes')||'null')||[]; }catch(e){ return []; } })();
    const hasCodes = Array.isArray(ord.codes) && ord.codes.length > 0 ? true : (storedCodes.length>0);
    if(!ord.id && !ord.code && !hasCodes){ btnCancel.setAttribute('disabled',''); }
    btnCancel.onclick = ()=>{
      if(!confirm('Bạn có chắc muốn hủy đơn này?')) return;
      const payload = (hasCodes ? { codes: (ord.codes && ord.codes.length? ord.codes : storedCodes) }
                      : (ord.id ? { id: ord.id } : (ord.code ? { code: ord.code } : null)));
      // Xóa hóa đơn hoàn toàn trên CSDL theo yêu cầu
      if (payload) payload.delete = true;
      if(!payload){ alert('Không xác định được đơn hàng để hủy.'); return; }
      fetch('php/api/cancel_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(async r=>{
        const text = await r.text();
        let res = null; try{ res = JSON.parse(text); }catch(e){ throw new Error(text || 'Phản hồi không hợp lệ từ máy chủ'); }
        if(!res?.success) throw new Error(res?.message||'Hủy đơn thất bại');
        return res;
      })
      .then(res=>{
        btnCancel.setAttribute('disabled','');
        if(res?.mode === 'delete'){
          alert('Hóa đơn đã được xóa.');
          // dọn session và chuyển trang
          sessionStorage.removeItem('lastOrder');
          sessionStorage.removeItem('lastOrderCode');
          sessionStorage.removeItem('lastOrderCodes');
          setTimeout(()=>{ window.location.href = 'GiaoDien.html'; }, 400);
        } else {
          ord.status = 'canceled';
          sessionStorage.setItem('lastOrder', JSON.stringify(ord));
          if(stEl){ stEl.textContent = 'Đã hủy'; stEl.classList.add('canceled'); }
          alert('Đơn hàng đã được hủy.');
          updateProgress('canceled');
        }
      })
      .catch(err=> {
        const msg = String(err?.message||'');
        alert('Không thể hủy đơn: ' + (msg.length>300? msg.slice(0,300)+'…' : msg));
      });
    };
  }

  // In hoá đơn
  const btnPrint = document.getElementById('btnPrint');
  if(btnPrint){ btnPrint.onclick = ()=> window.print(); }

  // Sao chép mã đơn
  const btnCopy = document.getElementById('btnCopyCode');
  if(btnCopy){
    btnCopy.onclick = async ()=>{
      const code = (ord.code || ('#' + (ord.id||'')) || '').toString();
      try{
        if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(code); }
        else{
          const ta = document.createElement('textarea');
          ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        const prev = btnCopy.textContent; btnCopy.textContent = 'Đã sao chép!';
        setTimeout(()=> btnCopy.textContent = prev, 1200);
      }catch(e){ alert('Không thể sao chép mã.'); }
    };
  }

}

function updateProgress(status){
  const wrap = document.getElementById('invProgress');
  if(!wrap) return;
  const steps = [...wrap.querySelectorAll('.step')];
  let idx = 1;
  const s = (status||'').toLowerCase();
  if(s==='pending') idx = 1;
  else if(s==='confirmed') idx = 2;
  else if(s==='shipping') idx = 3;
  else if(s==='completed') idx = 4;
  else if(s==='canceled') idx = 0;
  steps.forEach((el,i)=>{
    const n = i+1;
    el.classList.toggle('done', idx>0 && n<idx);
    el.classList.toggle('active', idx>0 && n===idx);
    el.classList.toggle('muted', idx===0);
  });
}

async function loadOrder(){
  try{
    const loading = document.getElementById('loading');
    if(loading) loading.classList.remove('hide');
    if(orderIdParam || orderCodeParam){
      try{
        const q = orderIdParam ? ('?id=' + encodeURIComponent(orderIdParam)) : ('?code=' + encodeURIComponent(orderCodeParam));
        const res = await fetch('php/api/get_order.php' + q, { cache: 'no-store' });
        const text = await res.text();
        let data = null; try { data = JSON.parse(text); } catch(e){ throw new Error(text || 'Phản hồi rỗng/không hợp lệ'); }
        if(!data?.success) throw new Error(data?.message||'Không tải được đơn hàng');
        order = data.data;
        sessionStorage.setItem('lastOrder', JSON.stringify(order));
        render(order);
        if(loading) loading.classList.add('hide');
        return;
      }catch(fetchErr){
        // Fallback sang session nếu có
        const tmp = JSON.parse(sessionStorage.getItem('lastOrder') || 'null');
        if(tmp){ order = tmp; render(order); if(loading) loading.classList.add('hide'); return; }
        throw fetchErr;
      }
    }
    // Fallback: dùng bản lưu tạm trong session
    const tmp = JSON.parse(sessionStorage.getItem('lastOrder') || 'null');
    if(tmp){ order = tmp; render(order); if(loading) loading.classList.add('hide'); return; }
    alert('Không tìm thấy đơn hàng.');
    window.location.href = 'GioHang.html';
  }catch(e){
    alert('Lỗi tải hóa đơn: ' + (e?.message||'Không xác định'));
  } finally {
    const loading = document.getElementById('loading');
    if(loading) loading.classList.add('hide');
  }
}

document.addEventListener('DOMContentLoaded', loadOrder);
