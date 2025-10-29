<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once 'ketnoi.php';

$logged_in = isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);

$response = [
  'logged_in' => $logged_in,
  'user_id'   => $logged_in ? $_SESSION['user_id'] : null,
  'username'  => $logged_in ? ($_SESSION['username'] ?? null) : null,
  'role'      => $logged_in ? ($_SESSION['role'] ?? null) : null,
  'full_name' => null,
];

if ($logged_in) {
  $uid = $_SESSION['user_id']; // MaTK theo dangnhap.php
  if ($stmt = $conn->prepare('SELECT TenDangNhap FROM taikhoan WHERE MaTK = ? LIMIT 1')) {
    $stmt->bind_param('s', $uid);
    if ($stmt->execute()) {
      $stmt->bind_result($ten);
      if ($stmt->fetch()) {
        $response['full_name'] = $ten; // dùng TenDangNhap làm tên hiển thị
      }
    }
    $stmt->close();
  }
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
