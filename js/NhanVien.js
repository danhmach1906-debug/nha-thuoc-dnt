const empInfo = document.querySelector('.employee-info');
empInfo.addEventListener('click', () => empInfo.classList.toggle('active'));
window.addEventListener('click', e => { if (!empInfo.contains(e.target)) empInfo.classList.remove('active'); });

async function applyEmployeeSessionUI(){
  try{
    const res = await fetch('php/session.php', { cache: 'no-store' });
    const sess = await res.json();
    const nameSpan = document.querySelector('.employee-info > span');
    const ddLinks  = document.querySelectorAll('.employee-dropdown a');
    if (sess && sess.logged_in){
      const displayName = sess.full_name || sess.username || 'Nhân viên';
      if (nameSpan) nameSpan.textContent = `Xin chào, ${displayName} 👋`;
    }
    if (ddLinks && ddLinks.length){
      const logoutA = ddLinks[ddLinks.length-1];
      logoutA.setAttribute('href','php/logout.php');
    }
  }catch(e){}
}

function renderPage(type) {
  const content = document.getElementById('mainContent');

  let headers = "", sample = "";
  if (type === "sanpham") {
    headers = "<tr><th>Mã SP</th><th>Tên SP</th><th>Đơn giá</th><th>Đơn Vị Tính</th><th>Mã loại</th><th>Tên nhà cung cấp</th><th>Hạn sử dụng</th><th>Hình ảnh</th></tr>";
    sample = "<tr><td>SP001</td><td>Paracetamol</td><td>15000</td><td>Thuốc giảm đau</td><td>Viên</td><td>L01</td></tr>";
  } else if (type === "hoadon") {
    headers = "<tr><th>Mã HĐ</th><th>Ngày lập</th><th>Mã SP</th><th>Tổng tiền</th><th>Số lượng</th><th>Hình thức TT</th><th>Trạng thái TT</th></tr>";
    sample = "<tr><td>HD001</td><td>2024-10-01</td><td>SP001</td><td>350000</td><td>5</td><td>Tiền mặt</td><td>Đã thanh toán</td></tr>";
  } else {
    headers = "<tr><th>Mã KM</th><th>Tên chương trình</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Giảm (%)</th></tr>";
    sample = "<tr><td>KM001</td><td>Giảm giá hè</td><td>2024-06-01</td><td>2024-06-30</td><td>20%</td></tr>";
  }

  content.innerHTML = `
    <h2>Quản lý ${type === 'sanpham' ? 'sản phẩm' : type === 'hoadon' ? 'hoá đơn' : 'khuyến mãi'}</h2>
    <div class="toolbar">
      <input type="text" id="searchBox" placeholder="🔍 Tìm kiếm...">
      <button class="add-btn">Thêm</button>
      <button class="edit-btn">Sửa</button>
      <button class="delete-btn">Xóa</button>
    </div>
    <table id="dataTable"><thead>${headers}</thead><tbody></tbody></table>
    <div class="form-add" id="formAdd"></div>
    <div class="action-buttons" id="actionButtons">
      <button class="confirm-btn" id="confirmBtn">✅ Xác nhận</button>
      <button class="cancel-btn" id="cancelBtn">❌ Huỷ</button>
    </div>
  `;
loadData(type);
  const table = content.querySelector("#dataTable");
  const formAdd = document.getElementById("formAdd");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const actionButtons = document.getElementById("actionButtons");
  const searchBox = document.getElementById("searchBox");

  let mode = "";
  let backupData = "";

  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    for (let r of table.tBodies[0].rows)
      r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
  });

  // ADD
  content.querySelector(".add-btn").onclick = () => {
    mode = "add";
    actionButtons.style.display = "flex";
    formAdd.style.display = "block";
    backupData = table.tBodies[0].innerHTML;

    if (type === "sanpham")
      formAdd.innerHTML = `<input placeholder="Mã SP"><input placeholder="Tên SP"><input placeholder="Đơn giá"><input placeholder="Đơn vị tính"><input placeholder="Mã loại"><input placeholder="Tên nhà cung cấp"><input placeholder="Hạn Sử dụng"><input placeholder="Hình ảnh">`;
    else if (type === "hoadon")
      formAdd.innerHTML = `<input placeholder="Mã HĐ"><input type="date"><input placeholder="Mã SP"><input placeholder="Tổng tiền"><input placeholder="Số lượng"><input placeholder="Hình thức TT"><input placeholder="Trạng thái TT">`;
    else
      formAdd.innerHTML = `<input placeholder="Mã KM"><input placeholder="Tên CT"><input type="date"><input type="date"><input placeholder="Giảm (%)">`;
  };

  // EDIT
  content.querySelector(".edit-btn").onclick = () => {
    mode = "edit";
    actionButtons.style.display = "flex";
    backupData = table.tBodies[0].innerHTML;

    table.onclick = (e) => {
      if (mode !== "edit") return;
      const td = e.target;
      if (td.tagName !== "TD") return;
      const oldText = (td.getAttribute('data-value') || td.textContent).trim();
      td.innerHTML = `<input type="text" value="${oldText}" style="width:100%;box-sizing:border-box;">`;
      td.querySelector("input").focus();
    };
  };

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

  confirmBtn.onclick = () => {
    if (mode === "add") {
  const inputs = [...formAdd.querySelectorAll("input")];
  const payload = {};

  // ánh xạ theo loại bảng
  if (type === "sanpham") {
    [payload.MaSP, payload.TenSP, payload.DonGia, payload.DonViTinh, payload.MaLoai, payload.TenNCC, payload.HanSuDung, payload.Hinhanh] = inputs.map(i => i.value);
  } else if (type === "hoadon") {
    [payload.MaHD, payload.NgayLap, payload.MaSP, payload.TongTien, payload.SoLuong, payload.HinhThucThanhToan, payload.TrangThai] = inputs.map(i => i.value);
  } else {
    [payload.MaKM, payload.TenCTKM, payload.NgayBatDau, payload.NgayKetThuc, payload.PhanTramGiam] = inputs.map(i => i.value);
  }

  fetch(`php/nhanvien.php?type=${type}&action=add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(r => r.json()).then(j => {
    if (j.status === "ok") loadData(type);
    else alert("Lỗi thêm: " + j.msg);
  });
} else if (mode === "edit") {
  const editedCells = table.querySelectorAll("td input");
  if (editedCells.length === 0) {
    alert("Không có ô nào được chỉnh.");
    reset();
    return;
  }

  const tr = editedCells[0].closest("tr");
  const cells = [...tr.children].map(td => {
    const inp = td.querySelector('input');
    if (inp) return inp.value.trim();
    const imgVal = td.querySelector('.img-path');
    if (imgVal) return imgVal.textContent.trim();
    return (td.getAttribute('data-value') || td.textContent).trim();
  });
  const payload = {};

  if (type === "sanpham") {
    [payload.MaSP, payload.TenSP, payload.DonGia, payload.DonViTinh, payload.MaLoai, payload.TenNCC, payload.HanSuDung, payload.Hinhanh] = cells;
  } else if (type === "hoadon") {
    [payload.MaHD, payload.NgayLap, payload.MaSP, payload.TongTien, payload.SoLuong, payload.HinhThucThanhToan, payload.TrangThai] = cells;
  } else {
    [payload.MaKM, payload.TenCTKM, payload.NgayBatDau, payload.NgayKetThuc, payload.PhanTramGiam] = cells;
  }

  fetch(`php/nhanvien.php?type=${type}&action=update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(j => {
      if (j.status === "ok") loadData(type);
      else alert("Lỗi sửa: " + j.msg);
    });

  reset();
} else if (mode === "delete") {
  const rows = table.querySelectorAll("tr.selected");
  Promise.all(
  [...rows].map(r => {
    const id = r.children[0].textContent.trim();
    return fetch(`php/nhanvien.php?type=${type}&action=delete&id=${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.status !== "ok") alert("Lỗi xóa: " + j.msg);
      });
  })
).then(() => loadData(type));
}

    reset();
  };

  cancelBtn.onclick = () => {
    if (backupData) table.tBodies[0].innerHTML = backupData;
    reset();
  };

  function reset() {
    mode = "";
    actionButtons.style.display = "none";
    formAdd.style.display = "none";
    table.onclick = null;
  }
}

const menuItems = document.querySelectorAll(".menu li");
menuItems.forEach(li => {
  li.addEventListener("click", () => {
    menuItems.forEach(i => i.classList.remove("active"));
    li.classList.add("active");
    renderPage(li.dataset.page);
  });
});
async function loadData(type) {
  try {
    const res = await fetch(`php/nhanvien.php?type=${type}&action=fetch`);
    const json = await res.json();
    if (json.status !== "ok") {
      alert("Không load được dữ liệu: " + json.msg);
      return;
    }

    const table = document.querySelector("#dataTable tbody");
    table.innerHTML = "";
    const headerThs = Array.from(document.querySelectorAll('#dataTable thead th'));
    const headerImgColIndex = headerThs.findIndex(th => (th.textContent || '').trim().toLowerCase().includes('hình ảnh'));
    json.data.forEach(row => {
      const tr = document.createElement("tr");
      if (type === "sanpham" || (row && Object.prototype.hasOwnProperty.call(row, 'Hinhanh'))) {
        // Render theo cột xác định, hiển thị ảnh cho cột Hình ảnh
        const cells = [];
        cells.push(`<td>${row.MaSP ?? row.MaHD ?? row.MaKM ?? ""}</td>`);
        cells.push(`<td>${row.TenSP ?? row.TenCTKM ?? ""}</td>`);
        cells.push(`<td>${row.DonGia ?? row.TongTien ?? row.PhanTramGiam ?? ""}</td>`);
        cells.push(`<td>${row.DonViTinh ?? row.SoLuong ?? ""}</td>`);
        cells.push(`<td>${row.MaLoai ?? row.HinhThucThanhToan ?? ""}</td>`);
        cells.push(`<td>${row.TenNCC ?? row.TrangThai ?? ""}</td>`);
        cells.push(`<td>${row.HanSuDung ?? row.NgayBatDau ?? ""}</td>`);
        const imgPath = row.Hinhanh ?? "";
        const normalized = imgPath ? String(imgPath).trim().replace(/\\\\/g,'/') : "";
        const resolved = normalized && (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('/')) ? normalized : (normalized ? `./${normalized}` : "");
        const imgHtml = imgPath
          ? `<img src="${resolved}" alt="${row.TenSP ?? "Hình ảnh"}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #eee;">`
          : "";
        // Thêm span ẩn để giữ giá trị chuỗi cho logic Edit hiện tại
        cells.push(`<td>${imgHtml}<span class="img-path" style="display:none">${imgPath}</span></td>`);
        tr.innerHTML = cells.join("");
      } else {
        // Mặc định: hiển thị các giá trị như cũ
        tr.innerHTML = Object.entries(row)
          .map(([k,v]) => {
            if (String(k).toLowerCase() === 'hinhanh') {
              const raw = String(v||'').trim();
              if (!raw) return `<td></td>`;
              const normalized = raw.replace(/\\/g,'/');
              const resolved = (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('/')) ? normalized : `./${normalized}`;
              return `<td><img src="${resolved}" alt="Hình ảnh" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #eee;"><span class=\"img-path\" style=\"display:none\">${raw}</span></td>`;
            }
            return `<td>${v}</td>`;
          })
          .join("");
      }
      // Chuyển cột Hình ảnh thành <img> trước khi append
      const tdImg = headerImgColIndex >= 0 ? tr.children[headerImgColIndex] : null;
      if (tdImg) {
        const raw = (tdImg.textContent || '').trim();
        if (raw && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(raw)) {
          const normalized = raw.replace(/\\/g,'/');
          const resolved = (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('/')) ? normalized : `./${normalized}`;
          tdImg.innerHTML = `<img src="${resolved}" alt="Hình ảnh" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #eee;">` +
                            `<span class=\"img-path\" style=\"display:none\">${raw}</span>`;
        }
      }
      table.appendChild(tr);
    });
    // Hậu xử lý: tìm cột tiêu đề "Hình ảnh" và chuyển ô tương ứng thành <img>
    const ths = Array.from(document.querySelectorAll('#dataTable thead th'));
    const imgColIndex = ths.findIndex(th => (th.textContent || '').trim().toLowerCase().includes('hình ảnh'));
    document.querySelectorAll('#dataTable tbody tr').forEach(tr => {
      const tds = tr.children;
      const td = imgColIndex >= 0 ? tds[imgColIndex] : tr.lastElementChild;
      if (!td) return;
      const path = (td.textContent || '').trim();
      if (!path) return;
      const isImgPath = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
      if (!isImgPath) return;
      const normalized = path.replace(/\\/g,'/');
      const resolved = (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('/')) ? normalized : `./${normalized}`;
      td.innerHTML = `<img src="${resolved}" alt="Hình ảnh" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #eee;">` +
                     `<span class="img-path" style="display:none">${path}</span>`;
    });
    document.querySelectorAll('#dataTable tbody td').forEach(td => {
      if (td.querySelector('img')) return;
      const path = (td.textContent || '').trim();
      if (!/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return;
      const normalized = path.replace(/\\/g,'/');
      const resolved = (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('/')) ? normalized : `./${normalized}`;
      td.innerHTML = `<img src="${resolved}" alt="Hình ảnh" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #eee;">` +
                     `<span class="img-path" style="display:none">${path}</span>`;
    });
  } catch (err) {
    console.error(err);
    alert("Lỗi khi tải dữ liệu từ nhanvien.php");
  }
}
applyEmployeeSessionUI();
renderPage("sanpham");
