const adminInfo = document.querySelector('.admin-info');
adminInfo.addEventListener('click', () => adminInfo.classList.toggle('active'));
window.addEventListener('click', e => {
  if (!adminInfo.contains(e.target)) adminInfo.classList.remove('active');
});

let currentAccountType = 'nhanvien';

// Apply session username to header and fix logout link
async function applyAdminSessionUI(){
  try{
    const res = await fetch('php/session.php', { cache: 'no-store' });
    const sess = await res.json();
    const nameSpan = document.querySelector('.admin-info > span');
    const ddLinks  = document.querySelectorAll('.admin-dropdown a');
    if (sess && sess.logged_in){
      const displayName = sess.full_name || sess.username || 'Admin';
      if (nameSpan) nameSpan.textContent = `Xin chào, ${displayName} 👋`;
    }
    // set logout link to php/logout.php (last link)
    if (ddLinks && ddLinks.length){
      const logoutA = ddLinks[ddLinks.length-1];
      logoutA.setAttribute('href','php/logout.php');
    }
  }catch(e){ /* ignore */ }
}

function renderPage(type) {
  currentAccountType = type;
  const content = document.getElementById('mainContent');

  const tableHeader = type === 'nhanvien'
    ? `<tr><th>Mã NV</th><th>Tên</th><th>SĐT</th><th>Email</th><th>Ngày vào làm</th><th>Mật khẩu</th></tr>`
    : `<tr><th>Mã KH</th><th>Tên</th><th>SĐT</th><th>Email</th><th>Ngày đăng ký</th><th>Mật khẩu</th></tr>`;

  const toolbarButtons = type === 'khachhang'
    ? `<button class="delete-btn">Xóa</button>`
    : `<button class="add-btn">Thêm</button>
       <button class="edit-btn">Sửa</button>
       <button class="delete-btn">Xóa</button>`;

  content.innerHTML = `
    <h2>Quản lý ${type === 'nhanvien' ? 'nhân viên' : 'khách hàng'}</h2>
    <div class="toolbar">
      <input type="text" id="searchBox" placeholder="🔍 Tìm kiếm...">
      ${toolbarButtons}
    </div>
    <table id="dataTable"><thead>${tableHeader}</thead><tbody></tbody></table>
    <div class="form-add" id="formAdd"></div>
    <div class="action-buttons">
      <button class="confirm-btn" id="confirmBtn">✅ Xác nhận</button>
      <button class="cancel-btn" id="cancelBtn">❌ Huỷ</button>
    </div>
  `;

  // Fail-safe: nếu là khách hàng, đảm bảo không còn nút Thêm/Sửa
  if (type === 'khachhang') {
    content.querySelector('.add-btn')?.remove();
    content.querySelector('.edit-btn')?.remove();
  }

  // Đặt class để CSS có thể ẩn các phần tử khi chỉ xem
  if (type === 'khachhang') content.classList.add('view-only');
  else content.classList.remove('view-only');

  const table = content.querySelector("#dataTable");
  const formAdd = document.getElementById("formAdd");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const actionButtons = content.querySelector(".action-buttons");
  const searchBox = document.getElementById("searchBox");

  let mode = "";
  let backupData = "";
  let editingRowId = null;

  // Load dữ liệu từ database
  loadAccounts(type);

  // search
  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    for (let r of table.tBodies[0].rows) {
      r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
    }
  });

  // ADD
  const addBtn = content.querySelector(".add-btn");
  addBtn && (addBtn.onclick = () => {
    mode = "add";
    actionButtons.style.display = "flex";
    formAdd.style.display = "block";
    backupData = table.tBodies[0].innerHTML;

    formAdd.innerHTML = (type === "nhanvien"
      ? `<input id="inputMaTK" placeholder="Mã TK (VD: TK06)"><input id="inputTen" placeholder="Tên đăng nhập"><input id="inputSDT" placeholder="SĐT"><input id="inputEmail" placeholder="Email"><input id="inputNgay" type="date"><input id="inputMK" type="password" placeholder="Mật khẩu">`
      : `<input id="inputMaTK" placeholder="Mã TK (VD: TK06)"><input id="inputTen" placeholder="Tên đăng nhập"><input id="inputSDT" placeholder="SĐT"><input id="inputEmail" placeholder="Email"><input id="inputNgay" type="date"><input id="inputMK" type="password" placeholder="Mật khẩu">`);
  });

  // EDIT
  const editBtn = content.querySelector(".edit-btn");
  editBtn && (editBtn.onclick = () => {
    mode = "edit";
    actionButtons.style.display = "flex";
    backupData = table.tBodies[0].innerHTML;

    table.onclick = (e) => {
      if (mode !== "edit") return;
      const td = e.target;
      if (td.tagName !== "TD") return;
      const tr = td.parentElement;
      editingRowId = tr.dataset.maTK;
      
      const oldText = td.textContent.trim();
      td.innerHTML = `<input type="text" value="${oldText === '******' ? '' : oldText}" style="width:100%;box-sizing:border-box;">`;
      td.querySelector("input").focus();
    };
  });

  // DELETE
  content.querySelector(".delete-btn").onclick = () => {
    mode = "delete";
    actionButtons.style.display = "flex";
    backupData = table.tBodies[0].innerHTML;

    table.onclick = (e) => {
      if (mode !== "delete") return;
      const tr = e.target.closest("tr");
      if (!tr) return;
      tr.classList.toggle("selected");
    };
  };

  // Confirm
  confirmBtn.onclick = async () => {
    if (mode === "add") {
      await handleAdd(type, formAdd);
    } else if (mode === "edit") {
      await handleEdit(table, editingRowId);
    } else if (mode === "delete") {
      await handleDelete(table);
    }
    resetState();
  };

  // Cancel
  cancelBtn.onclick = () => {
    if (backupData) table.tBodies[0].innerHTML = backupData;
    resetState();
  };

  function resetState() {
    mode = "";
    formAdd.style.display = "none";
    actionButtons.style.display = "none";
    table.onclick = null;
    editingRowId = null;
  }
}

// Load danh sách tài khoản từ database
async function loadAccounts(type) {
  try {
    const loaiTaiKhoan = type === 'nhanvien' ? 'Nhân viên' : 'Khách hàng';
    const response = await fetch(`php/admin.php?action=list&type=${encodeURIComponent(loaiTaiKhoan)}`);
    const result = await response.json();

    if (result.success) {
      const table = document.querySelector("#dataTable tbody");
      table.innerHTML = '';

      result.data.forEach(account => {
        const row = document.createElement('tr');
        row.dataset.maTK = account.MaTK;
        const showPwd = (type === 'nhanvien');
        const pwdCell = showPwd ? (account.MatKhau || '-') : '******';
        row.innerHTML = `
          <td>${account.MaTK}</td>
          <td>${account.TenDangNhap}</td>
          <td>${account.SoDienThoai || '-'}</td>
          <td>${account.Mail || '-'}</td>
          <td>${account.NgayDangKy || '-'}</td>
          <td>${pwdCell}</td>
        `;
        table.appendChild(row);
      });
    } else {
      alert('Lỗi khi tải dữ liệu: ' + result.message);
    }
  } catch (error) {
    console.error('Lỗi:', error);
    alert('Không thể kết nối đến server');
  }
}

// Xử lý thêm tài khoản mới
async function handleAdd(type, formAdd) {
  const inputs = formAdd.querySelectorAll("input");
  const maTK = inputs[0].value.trim();
  const tenDangNhap = inputs[1].value.trim();
  const soDienThoai = inputs[2].value.trim();
  const mail = inputs[3].value.trim();
  const ngayDangKy = inputs[4].value;
  const matKhau = inputs[5].value.trim();

  if (!maTK || !tenDangNhap || !matKhau || !ngayDangKy) {
    alert('Vui lòng điền đầy đủ thông tin bắt buộc (Mã TK, Tên, Mật khẩu, Ngày)');
    return;
  }

  const loaiTaiKhoan = type === 'nhanvien' ? 'Nhân viên' : 'Khách hàng';

  try {
    const response = await fetch('php/admin.php?action=add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maTK,
        tenDangNhap,
        mail,
        soDienThoai,
        matKhau,
        ngayDangKy,
        loaiTaiKhoan
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('Thêm tài khoản thành công!');
      loadAccounts(type);
    } else {
      alert('Lỗi: ' + result.message);
    }
  } catch (error) {
    console.error('Lỗi:', error);
    alert('Không thể kết nối đến server');
  }
}

// Xử lý cập nhật tài khoản
async function handleEdit(table, maTK) {
  if (!maTK) {
    alert('Vui lòng chọn một dòng để sửa');
    return;
  }

  // Find row by dataset to avoid attribute-name mismatches (data-ma-t-k)
  const row = Array.from(table.querySelectorAll('tbody tr')).find(r => {
    const d = r.dataset || {};
    return d.maTK === maTK || r.getAttribute('data-ma-t-k') === maTK || r.getAttribute('data-ma-tk') === maTK;
  });
  if (!row){
    alert('Không tìm thấy dòng đang sửa. Vui lòng chọn lại.');
    return;
  }
  const cells = row.querySelectorAll('td');
  
  const updateData = {
    maTK: cells[0].textContent.trim(),
    tenDangNhap: cells[1].querySelector('input') ? cells[1].querySelector('input').value : cells[1].textContent.trim(),
    soDienThoai: cells[2].querySelector('input') ? cells[2].querySelector('input').value : cells[2].textContent.trim(),
    mail: cells[3].querySelector('input') ? cells[3].querySelector('input').value : cells[3].textContent.trim(),
    ngayDangKy: cells[4].querySelector('input') ? cells[4].querySelector('input').value : cells[4].textContent.trim(),
    matKhau: cells[5].querySelector('input') ? cells[5].querySelector('input').value : cells[5].textContent.trim()
  };

  // Nếu có thay đổi mật khẩu
  const passwordInput = cells[5].querySelector('input');
  if (passwordInput && passwordInput.value) {
    updateData.matKhau = passwordInput.value;
  } else {
    // Do not update password if user didn't edit it
    updateData.matKhau = '';
  }

  try {
    const response = await fetch('php/admin.php?action=update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      alert('Cập nhật thành công!');
      loadAccounts(currentAccountType);
    } else {
      alert('Lỗi: ' + result.message);
    }
  } catch (error) {
    console.error('Lỗi:', error);
    alert('Không thể kết nối đến server');
  }
}

// Xử lý xóa tài khoản
async function handleDelete(table) {
  const selectedRows = table.querySelectorAll("tr.selected");
  
  if (selectedRows.length === 0) {
    alert('Vui lòng chọn ít nhất một dòng để xóa');
    return;
  }

  if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedRows.length} tài khoản?`)) {
    return;
  }

  for (const row of selectedRows) {
    const maTK = row.dataset.maTK;

    try {
      const response = await fetch('php/admin.php?action=delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maTK })
      });

      const result = await response.json();

      if (!result.success) {
        alert('Lỗi khi xóa ' + maTK + ': ' + result.message);
      }
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Không thể kết nối đến server');
    }
  }

  alert('Xóa thành công!');
  loadAccounts(currentAccountType);
}

// menu switching
const menuItems = document.querySelectorAll(".menu li");
menuItems.forEach(li => {
  li.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    li.classList.add('active');
    renderPage(li.dataset.page);
  });
});

// initial load
renderPage('nhanvien');
applyAdminSessionUI();
