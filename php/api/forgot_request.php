<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../ketnoi.php';

try {
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $phone = isset($input['phone']) ? trim($input['phone']) : '';
  $email = isset($input['email']) ? trim($input['email']) : '';

  if ($phone === '' && $email === '') {
    echo json_encode(['success' => false, 'message' => 'Thiếu số điện thoại hoặc email']);
    exit;
  }

  if ($phone !== '') {
    $stmt = $conn->prepare('SELECT MaTK, SoDienThoai FROM taikhoan WHERE SoDienThoai = ? LIMIT 1');
    $stmt->bind_param('s', $phone);
    $identifier = $phone;
  } else {
    $stmt = $conn->prepare('SELECT MaTK, Mail FROM taikhoan WHERE Mail = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $identifier = $email;
  }

  if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Lỗi SQL: ' . $stmt->error]);
    exit;
  }
  $res = $stmt->get_result();
  if ($res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Không tìm thấy tài khoản']);
    exit;
  }
  $row = $res->fetch_assoc();
  $maTK = $row['MaTK'];

  $otp = strval(random_int(100000, 999999));
  $expires = time() + 300; // 5 phút

  if (!isset($_SESSION['pwd_reset'])) $_SESSION['pwd_reset'] = [];
  $_SESSION['pwd_reset'][$identifier] = [
    'otp' => $otp,
    'expires' => $expires,
    'maTK' => $maTK,
  ];

  // TODO: Gửi OTP qua SMS/Email. Dev mode: trả về otp để test nhanh.
  echo json_encode([
    'success' => true,
    'message' => 'Đã tạo OTP. Vui lòng kiểm tra kênh nhận.',
    'otp_preview' => $otp,
    'expire_in' => 300
  ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
