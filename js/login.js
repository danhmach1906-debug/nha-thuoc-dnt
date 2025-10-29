// ===== API-based Auth =====
const API_URL = 'php/api/';

const $ = s=>document.querySelector(s);
const fmt = n=> (n||0).toLocaleString('vi-VN');

// Hàm đăng nhập qua API
async function signIn(username, password) {
  try {
    const response = await fetch(API_URL + 'login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Lỗi kết nối' };
  }
}

function signOut() {
  window.location.href = 'php/logout.php';
}

// ===== Catalog storage =====
const KEY = cat=>`catalog:${cat}`;
function load(cat){ return JSON.parse(localStorage.getItem(KEY(cat))||'[]'); }
function save(cat,rows){ localStorage.setItem(KEY(cat), JSON.stringify(rows)); }

// ===== Views =====
const authView=$('#authView');
const appView=$('#appView');
const who=$('#who');

function updateShell(){
  const sess=getSession();
  who.textContent=sess? `${sess.email} (${sess.role})`:'Khách';
  if(!sess){ authView.style.display='block'; appView.style.display='none'; return; }
  authView.style.display='none'; appView.style.display='block';
  const canWrite = (sess.role==='admin' || sess.role==='staff');
  document.querySelectorAll('#add,#clearCat,#import').forEach(el=> el.disabled=!(canWrite));
  document.querySelectorAll('[data-need="admin"]').forEach(el=> el.style.display = (sess.role==='admin') ? '' : 'none');
}

// login handlers
$('#loginBtn').onclick=()=>{
  const ok=signIn($('#email').value.trim(), $('#password').value);
  if(!ok){ $('#err').style.display='block'; $('#err').textContent='Sai email hoặc mật khẩu.'; return; }
  $('#err').style.display='none'; updateShell(); render();
};
$('#loginGuest').onclick=()=>{ setSession({email:'guest@local',role:'customer',at:Date.now()}); updateShell(); render(); };
$('#logout').onclick=()=>{ signOut(); updateShell(); };

// ===== Product table =====
const catSel=$('#cat');
const subSel=$('#sub');
const qInp=$('#q');
const rowsTbody=$('#rows');
const catName=$('#catName');

function render(){
  const cat=catSel.value; catName.textContent=cat.toUpperCase();
  const q=(qInp.value||'').toLowerCase();
  const sub=subSel.value;
  const sess=getSession(); const canWrite=sess && sess.role==='admin';
  let rows=load(cat);
  if(q) rows=rows.filter(r=>`${r.name} ${r.brand} ${r.desc}`.toLowerCase().includes(q));
  if(sub) rows=rows.filter(r=> (r.sub||'')===sub);
  if(!rows.length){ rowsTbody.innerHTML='<tr><td colspan="8" class="muted">Chưa có sản phẩm. Nhấn “Thêm sản phẩm”.</td></tr>'; return; }
  rowsTbody.innerHTML = rows.map(r=>`
    <tr>
      <td><code>${r.id}</code></td>
      <td>${r.name}</td>
      <td>${r.brand||''}</td>
      <td>${fmt(r.price)}</td>
      <td>${r.unit||''}</td>
      <td>${r.sub||''}</td>
      <td>${r.stock ?? ''}</td>
      <td>
        <button class="btn" data-act="view" data-id="${r.id}">Xem</button>
        <button class="btn" data-act="edit" data-id="${r.id}" ${canWrite?'':'disabled'}>Sửa</button>
        <button class="btn" data-act="del" data-id="${r.id}" ${canWrite?'':'disabled'}>Xóa</button>
      </td>
    </tr>
  `).join('');

  rowsTbody.querySelectorAll('button').forEach(b=> b.onclick=()=>{ 
    const id=b.dataset.id; const act=b.dataset.act; 
    if(act==='view') return preview(id); 
    if(act==='edit') return edit(id); 
    if(act==='del') return remove(id); 
  });
}

// add/edit dialog
const dlg=$('#dlg'); const form=$('#form');
function openDlg(data){ 
  form.reset(); 
  ['id','name','brand','price','unit','sub','img','desc','stock'].forEach(k=> form.elements[k].value = data?.[k] ?? ''); 
  dlg.showModal(); 
}
function closeDlg(){ dlg.close(); }

function preview(id){ 
  const cat=catSel.value; const rows=load(cat); const r=rows.find(x=>x.id===id); 
  if(!r) return alert('Không tìm thấy.');
  openDlg(r); 
  [...form.elements].forEach(el=> el.disabled=true); 
  const unfreeze=()=>{[...form.elements].forEach(el=> el.disabled=false); dlg.removeEventListener('close', unfreeze)}; 
  dlg.addEventListener('close', unfreeze);
}

function edit(id){ 
  const cat=catSel.value; const rows=load(cat); const r=rows.find(x=>x.id===id); 
  if(!r) return alert('Không tìm thấy.'); 
  openDlg(r); 
  dlg.addEventListener('close', onSaveOnce, {once:true}); 
  function onSaveOnce(e){ 
    if(dlg.returnValue!=='ok') return; 
    const d=collect(); 
    const i=rows.findIndex(x=>x.id===id); 
    rows[i]=d; save(cat,rows); render(); 
  } 
}

function remove(id){ 
  if(!confirm('Xóa sản phẩm này?')) return; 
  const cat=catSel.value; 
  let rows=load(cat).filter(r=>r.id!==id); 
  save(cat,rows); render(); 
}

function collect(){ 
  const d=Object.fromEntries(new FormData(form)); 
  d.price=+d.price||0; d.stock=+d.stock||0; 
  return d; 
}

$('#add').onclick=()=>{ 
  const sess=getSession(); 
  if(!sess||!(sess.role==='admin'||sess.role==='staff')) return alert('Chỉ admin/nhân viên thêm sản phẩm.'); 
  openDlg(); 
  dlg.addEventListener('close', onAddOnce, {once:true}); 
  function onAddOnce(){ 
    if(dlg.returnValue!=='ok') return; 
    const cat=catSel.value; 
    const rows=load(cat); 
    const d=collect(); 
    if(rows.some(x=>x.id===d.id)) return alert('ID đã tồn tại.'); 
    rows.push(d); save(cat,rows); render(); 
  } 
};

// filters
;[catSel,subSel].forEach(el=> el.onchange=()=>render()); 
qInp.oninput=()=>render();

// export/import/clear
$('#export').onclick=()=>{ 
  const cat=catSel.value; 
  const rows=load(cat); 
  const blob=new Blob([JSON.stringify(rows,null,2)], {type:'application/json'}); 
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); 
  a.download=`${cat}-catalog.json`; a.click(); 
};
$('#import').onchange=async (e)=>{ 
  const sess=getSession(); 
  if(!sess||!(sess.role==='admin'||sess.role==='staff')) return alert('Chỉ admin/nhân viên import.'); 
  const file=e.target.files[0]; if(!file) return; 
  const text=await file.text(); 
  try{ 
    const arr=JSON.parse(text); 
    if(!Array.isArray(arr)) throw new Error('Invalid'); 
    save(catSel.value,arr); render(); alert('Import xong.'); 
  }catch{ alert('File JSON không hợp lệ.'); } 
};
$('#clearCat').onclick=()=>{ 
  const sess=getSession(); 
  if(!sess||!(sess.role==='admin'||sess.role==='staff')) return alert('Chỉ admin/nhân viên.'); 
  if(confirm('Xóa toàn bộ sản phẩm của danh mục hiện tại?')){ 
    localStorage.removeItem(KEY(catSel.value)); render(); 
  } 
};

// admin-only ops
$('#resetUsers').onclick=()=>{ 
  const sess=getSession(); 
  if(!sess||sess.role!=='admin') return alert('Chỉ admin.'); 
  localStorage.removeItem(USERS_KEY); seed(); alert('Đã reset tài khoản mẫu.'); updateShell(); 
};
$('#wipeAll').onclick=()=>{ 
  const sess=getSession(); 
  if(!sess||sess.role!=='admin') return alert('Chỉ admin.'); 
  if(confirm('XÓA TẤT CẢ catalog:* ?')){ 
    Object.keys(localStorage).filter(k=>k.startsWith('catalog:')).forEach(k=> localStorage.removeItem(k)); 
    alert('Đã xóa toàn bộ catalog.'); 
  }
};

// boot
updateShell(); render();
