// ===== Helpers
const $ = (s) => document.querySelector(s);
const show = (id) => { $('#step1').classList.remove('active'); $('#step2').classList.remove('active'); $(id).classList.add('active'); };

// Toggle nhóm input theo kênh
const channelRadios = document.querySelectorAll('input[name="otpChannel"]');
const phoneGroup = $('#phoneGroup');
const emailGroup = $('#emailGroup');

channelRadios.forEach(r => {
  r.addEventListener('change', () => {
    const val = document.querySelector('input[name="otpChannel"]:checked').value;
    if (val === 'phone') {
      phoneGroup.classList.remove('hide');
      emailGroup.classList.add('hide');
    } else {
      emailGroup.classList.remove('hide');
      phoneGroup.classList.add('hide');
    }
  });
});

// Cooldown resend
let cooldownTimer = null;
let cooldownLeft = 0;
function startCooldown(sec = 60) {
  cooldownLeft = sec;
  const btn = $('#fpResend'), timer = $('#fpTimer');
  btn.classList.add('cooldown');
  timer.textContent = `(${cooldownLeft}s)`;
  cooldownTimer = setInterval(() => {
    cooldownLeft--;
    timer.textContent = `(${cooldownLeft}s)`;
    if (cooldownLeft <= 0) clearCooldown();
  }, 1000);
}
function clearCooldown() {
  const btn = $('#fpResend'), timer = $('#fpTimer');
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
  btn?.classList.remove('cooldown');
  if (timer) timer.textContent = '';
}

// Cache định danh user để resend/reset
let cache = { type: 'phone', value: '' };

// Validate cơ bản
const isValidPhoneVN = (v) => /^(0|\+84)\d{9,10}$/.test(v.replace(/\s+/g, ''));
const isValidEmail   = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ===== STEP 1: Submit (phone/email) -> send OTP
$('#forgotStep1Form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.querySelector('input[name="otpChannel"]:checked').value;

  let payload = {};
  if (type === 'phone') {
    const phone = ($('#fpPhone').value || '').trim();
    if (!phone) return alert('Vui lòng nhập số điện thoại');
    if (!isValidPhoneVN(phone)) return alert('Số điện thoại không hợp lệ (VD 098..., hoặc +84...)');
    payload.phone = phone;
    cache = { type: 'phone', value: phone };
  } else {
    const email = ($('#fpEmail').value || '').trim();
    if (!email) return alert('Vui lòng nhập email');
    if (!isValidEmail(email)) return alert('Email không hợp lệ');
    payload.email = email;
    cache = { type: 'email', value: email };
  }

  try {
    const res = await fetch('php/api/forgot_request.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) // server nhận phone OR email
    });
    const data = await res.json();

    if (data.success) {
      show('#step2');
      startCooldown(60);
      alert('Đã gửi OTP. Vui lòng kiểm tra ' + (cache.type === 'phone' ? 'tin nhắn' : 'email') + '!');
    } else {
      alert(data.message || 'Không gửi được OTP');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối server. Vui lòng kiểm tra XAMPP!');
  }
});

// ===== Resend OTP (theo cache.type)
$('#fpResend')?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!cache.value) return alert('Thiếu thông tin. Quay lại bước trước.');
  if (cooldownLeft > 0) return; // đang cooldown

  const payload = cache.type === 'phone' ? { phone: cache.value } : { email: cache.value };

  try {
    const res = await fetch('php/api/forgot_request.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      startCooldown(60);
      alert('Đã gửi lại OTP.');
    } else {
      alert(data.message || 'Không gửi được OTP');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối server.');
  }
});

// ===== STEP 2: Submit OTP + new password
$('#forgotStep2Form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const otp = ($('#fpOtp').value || '').trim();
  const pass1 = $('#fpNewPass').value;
  const pass2 = $('#fpNewPass2').value;

  if (otp.length !== 6) return alert('OTP phải 6 ký tự số.');
  if (pass1 !== pass2) return alert('Mật khẩu không khớp!');
  if (pass1.length < 6) return alert('Mật khẩu tối thiểu 6 ký tự!');

  const payload = {
    otp,
    new_password: pass1,
    ...(cache.type === 'phone' ? { phone: cache.value } : { email: cache.value })
  };

  try {
    const res = await fetch('php/api/forgot_reset.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      alert('Đặt lại mật khẩu thành công! Mời bạn đăng nhập.');
      window.location.href = 'dangnhap.html';
    } else {
      alert(data.message || 'Không đặt lại được mật khẩu');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối server.');
  }
});
