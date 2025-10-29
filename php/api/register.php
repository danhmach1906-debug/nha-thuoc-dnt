<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';

// Đọc dữ liệu JSON từ request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Kiểm tra dữ liệu đầu vào
if (!$data || !isset($data['fullname']) || !isset($data['phone']) || !isset($data['password'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Thiếu thông tin bắt buộc!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$ten = trim($data['fullname']);
$sdt = trim($data['phone']);
$email = trim($data['email'] ?? '');
$pass = trim($data['password']);

// Kiểm tra đầu vào
if (empty($ten) || empty($sdt) || empty($pass)) {
    echo json_encode([
        'success' => false,
        'message' => 'Vui lòng nhập đầy đủ thông tin!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kiểm tra độ dài mật khẩu
if (strlen($pass) < 6) {
    echo json_encode([
        'success' => false,
        'message' => 'Mật khẩu phải có ít nhất 6 ký tự!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kiểm tra trùng email hoặc SDT
$check = $conn->prepare("SELECT * FROM taikhoan WHERE SoDienThoai = ? OR (Mail = ? AND Mail != '')");
$check->bind_param("ss", $sdt, $email);
$check->execute();
$res = $check->get_result();

if ($res->num_rows > 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Số điện thoại hoặc email đã được đăng ký!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lấy mã TK kế tiếp
$max = $conn->query("SELECT MaTK FROM taikhoan ORDER BY MaTK DESC LIMIT 1");
if ($row = $max->fetch_assoc()) {
    $nextNum = intval(substr($row['MaTK'], 2)) + 1;
} else {
    $nextNum = 1;
}
$maTK = 'TK' . str_pad($nextNum, 2, '0', STR_PAD_LEFT);

// Mã hóa mật khẩu
$matkhau = $pass;

// Thêm dữ liệu với vai trò "Khách hàng"
$sql = "INSERT INTO taikhoan (MaTK, TenDangNhap, Mail, SoDienThoai, MatKhau, NgayDangKy, LoaiTaiKhoan)
        VALUES (?, ?, ?, ?, ?, CURDATE(), 'Khách hàng')";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $maTK, $ten, $email, $sdt, $matkhau);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Đăng ký thành công!',
        'maTK' => $maTK
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi khi đăng ký: ' . $conn->error
    ], JSON_UNESCAPED_UNICODE);
}

$stmt->close();
$conn->close();
?>
