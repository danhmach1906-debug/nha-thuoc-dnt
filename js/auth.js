/**
 * Authentication handler cho trang đăng nhập
 * Nhà thuốc DNT
 */

const API_URL = 'php/api/';

// Xử lý form đăng nhập
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    showError('Vui lòng nhập đầy đủ thông tin');
    return;
  }
  
  // Show loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Đang đăng nhập...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(API_URL + 'login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Đăng nhập thành công
      showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        window.location.href = result.data.redirect;
      }, 1000);
    } else {
      // Đăng nhập thất bại
      showError(result.message || 'Đăng nhập thất bại');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Lỗi kết nối. Vui lòng thử lại.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Xử lý form đăng ký
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fullname = document.getElementById('fullname').value.trim();
  const email = document.getElementById('reg_email').value.trim();
  const password = document.getElementById('reg_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  
  if (!fullname || !email || !password || !confirmPassword) {
    showError('Vui lòng nhập đầy đủ thông tin');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Mật khẩu xác nhận không khớp');
    return;
  }
  
  if (password.length < 6) {
    showError('Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }
  
  // Show loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Đang đăng ký...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(API_URL + 'register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: fullname,
        email: email,
        password: password,
        role: 'Khách hàng'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => {
        window.location.href = 'dangnhap.html';
      }, 1500);
    } else {
      showError(result.message || 'Đăng ký thất bại');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Register error:', error);
    showError('Lỗi kết nối. Vui lòng thử lại.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Hiển thị thông báo lỗi
function showError(message) {
  // Tạo hoặc cập nhật thông báo lỗi
  let errorDiv = document.getElementById('error-message');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee;
      color: #c00;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
  }
  
  errorDiv.textContent = '❌ ' + message;
  errorDiv.style.background = '#fee2e2';
  errorDiv.style.color = '#dc2626';
  
  setTimeout(() => {
    errorDiv.remove();
  }, 4000);
}

// Hiển thị thông báo thành công
function showSuccess(message) {
  let successDiv = document.getElementById('error-message');
  
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.id = 'error-message';
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(successDiv);
  }
  
  successDiv.textContent = '✅ ' + message;
  successDiv.style.background = '#dcfce7';
  successDiv.style.color = '#16a34a';
  
  setTimeout(() => {
    successDiv.remove();
  }, 4000);
}

// CSS Animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
