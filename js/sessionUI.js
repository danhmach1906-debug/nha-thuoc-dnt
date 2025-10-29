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
      if (userName) userName.textContent = sess.full_name || sess.username || '';
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
  }catch(e){}
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

// ===== Unified small cart behavior for category pages =====
function getCartTotalQty(){
  try{
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    return cart.reduce((s,i)=> s + (Number(i.qty||i.quantity||0)), 0);
  }catch(e){ return 0; }
}

function updateHeaderCartCount(){
  const el = document.getElementById('cartCount');
  if (!el) return;
  el.textContent = String(getCartTotalQty());
}

function initHeaderCart(){
  updateHeaderCartCount();
  // Keep in sync when other tabs/pages update the cart
  window.addEventListener('storage', (e)=>{ if(e.key==='cart') updateHeaderCartCount(); });
  // Ensure the small cart link works consistently
  const anchor = document.querySelector('.actions a.btn.primary[href="GioHang.html"]');
  if(anchor){
    anchor.addEventListener('click', ()=>{ /* allow default navigation */ });
  }
}

document.addEventListener('DOMContentLoaded', initHeaderCart);
