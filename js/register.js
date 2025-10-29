const $ = s => document.querySelector(s);
const showErr = (name, msg) => { const el = document.querySelector(`[data-err-for="${name}"]`); if(el) el.textContent = msg || ""; };
const clearErrs = () => document.querySelectorAll('.err').forEach(e => e.textContent = "");

function validate() {
  clearErrs();
  const fullname = $('#fullname').value.trim();
  const phone = $('#phone').value.trim();
  const email = $('#email').value.trim();
  const pass = $('#password').value;
  const confirm = $('#confirm').value;

  let ok = true;

  if (!fullname) { showErr('fullname', 'Vui lòng nhập họ tên'); ok = false; }
  if (!phone) { showErr('phone', 'Vui lòng nhập số điện thoại'); ok = false; }
  else if (!/^(0|\+84)(\d{9})$/.test(phone.replace(/\s/g,''))) { showErr('phone', 'Số điện thoại không hợp lệ'); ok = false; }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('email', 'Email không hợp lệ'); ok = false; }

  if (!pass || pass.length < 6) { showErr('password', 'Mật khẩu tối thiểu 6 ký tự'); ok = false; }
  if (confirm !== pass) { showErr('confirm', 'Mật khẩu xác nhận không khớp'); ok = false; }

  return ok;
}

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const payload = {
    fullname: $('#fullname').value.trim(),
    phone: $('#phone').value.trim(),
    email: $('#email').value.trim(),
    password: $('#password').value
  };

  const btn = e.submitter || e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    const res = await fetch('php/api/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      alert('Đăng ký thành công! Mã tài khoản của bạn là: ' + result.maTK + '\nMời bạn đăng nhập.');
      window.location.href = 'dangnhap.html';
      return; // Dừng xử lý và chuyển trang
    } else {
      // hiển thị lỗi server trả về (nếu có field nào cụ thể thì bạn map vào showErr)
      alert('Đăng ký thất bại!\n' + (result.message || 'Vui lòng thử lại.'));
    }
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối server. Kiểm tra XAMPP/API.');
  } finally {
    btn.disabled = false;
  }
});
