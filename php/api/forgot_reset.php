<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../ketnoi.php';

try {
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $otp = isset($input['otp']) ? trim($input['otp']) : '';
  $new = isset($input['new_password']) ? trim($input['new_password']) : '';
  $phone = isset($input['phone']) ? trim($input['phone']) : '';
  $email = isset($input['email']) ? trim($input['email']) : '';

  if ($otp === '' || $new === '' || ($phone === '' && $email === '')) {
    echo json_encode(['success' => false, 'message' => 'Thiếu dữ liệu']);
    exit;
  }

  $identifier = $phone !== '' ? $phone : $email;
  $bucket = $_SESSION['pwd_reset'][$identifier] ?? null;
  if (!$bucket) {
    echo json_encode(['success' => false, 'message' => 'OTP không tồn tại hoặc đã hết hạn']);
    exit;
  }
  if (time() > ($bucket['expires'] ?? 0)) {
    unset($_SESSION['pwd_reset'][$identifier]);
    echo json_encode(['success' => false, 'message' => 'OTP đã hết hạn']);
    exit;
  }
  if ($bucket['otp'] !== $otp) {
    echo json_encode(['success' => false, 'message' => 'OTP không đúng']);
    exit;
  }

  $maTK = $bucket['maTK'] ?? '';
  if ($maTK === '') {
    echo json_encode(['success' => false, 'message' => 'Thiếu tài khoản']);
    exit;
  }

  // Cập nhật mật khẩu mới (plain theo cấu trúc hiện tại)
  $stmt = $conn->prepare('UPDATE taikhoan SET MatKhau=? WHERE MaTK=?');
  $stmt->bind_param('ss', $new, $maTK);
  if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Lỗi SQL: ' . $stmt->error]);
    exit;
  }

  // Xóa OTP đã dùng
  unset($_SESSION['pwd_reset'][$identifier]);

  echo json_encode(['success' => true]);
} catch (Throwable $e) {
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
