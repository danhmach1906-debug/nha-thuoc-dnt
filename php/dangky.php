<?php
require_once 'ketnoi.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $ten   = trim($_POST['tennd'] ?? '');
  $sdt   = trim($_POST['sdt'] ?? '');
  $email = trim($_POST['email'] ?? '');
  $pass1 = trim($_POST['matkhau'] ?? '');
  $pass2 = trim($_POST['xacnhan'] ?? '');

  // kiểm tra đầu vào
  if ($ten==='' || $sdt==='' || $pass1==='' || $pass2==='') {
    echo "<script>alert('Vui lòng nhập đầy đủ thông tin!'); window.history.back();</script>";
    exit;
  }

  if ($pass1 !== $pass2) {
    echo "<script>alert('Mật khẩu xác nhận không khớp!'); window.history.back();</script>";
    exit;
  }

  // kiểm tra trùng email hoặc SDT
  $check = $conn->prepare("SELECT * FROM taikhoan WHERE Mail = ? OR SoDienThoai = ?");
  $check->bind_param("ss", $email, $sdt);
  $check->execute();
  $res = $check->get_result();
  if ($res->num_rows > 0) {
    echo "<script>alert('Email hoặc số điện thoại đã tồn tại!'); window.history.back();</script>";
    exit;
  }

  // lấy mã TK kế tiếp
  $max = $conn->query("SELECT MaTK FROM taikhoan ORDER BY MaTK DESC LIMIT 1");
  if ($row = $max->fetch_assoc()) {
    $nextNum = intval(substr($row['MaTK'], 2)) + 1;
  } else {
    $nextNum = 1;
  }
  $maTK = 'TK' . str_pad($nextNum, 2, '0', STR_PAD_LEFT);

  // mã hóa mật khẩu
  $matkhau = $pass1;

  // thêm dữ liệu
  $sql = "INSERT INTO taikhoan (MaTK, TenDangNhap, Mail, SoDienThoai, MatKhau, NgayDangKy, LoaiTaiKhoan)
          VALUES (?, ?, ?, ?, ?, CURDATE(), 'Khách hàng')";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("sssss", $maTK, $ten, $email, $sdt, $matkhau);

  if ($stmt->execute()) {
    echo "<script>alert('Đăng ký thành công! Mã tài khoản của bạn là $maTK'); window.location='DangNhap.html';</script>";
  } else {
    echo "<script>alert('Lỗi khi đăng ký: " . addslashes($conn->error) . "');</script>";
  }
}
?>
