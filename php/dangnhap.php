<?php
session_start();
include 'ketnoi.php'; // Gọi file kết nối

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['SoDienThoai'] ?? '');
    $password = trim($_POST['MatKhau'] ?? '');

    if (empty($username) || empty($password)) {
        echo "<script>alert('Vui lòng nhập đầy đủ thông tin'); history.back();</script>";
        exit;
    }

    // Chuẩn bị câu truy vấn
    $stmt = $conn->prepare("SELECT * FROM taikhoan WHERE SoDienThoai = ? OR Mail = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    // Kiểm tra thông tin đăng nhập
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // So sánh mật khẩu (ở đây bạn chưa mã hoá nên dùng so sánh trực tiếp)
        if ($password === $user['MatKhau']) {
            // ---- Đăng nhập thành công ----
            $_SESSION['user_id'] = $user['MaTK'];
            $_SESSION['username'] = $user['TenDangNhap'];
            $_SESSION['role'] = $user['LoaiTaiKhoan'];

            $role = strtolower(trim($user['LoaiTaiKhoan']));
            if ($role === 'quản trị') {
                header("Location: ../Admin.html");
            } elseif ($role === 'nhân viên') {
                header("Location: ../NhanVien.html");
            } else {
                header("Location: ../GiaoDien.html");
            }
            exit;
        } else {
            // ---- Sai mật khẩu ----
            echo "<script>alert('Sai mật khẩu!'); window.location.href='../dangnhap.html';</script>";
            exit;
        }

    } else {
        // ---- Không tìm thấy tài khoản ----
        echo "<script>alert('Tài khoản không tồn tại!'); window.location.href='../dangnhap.html';</script>";
        exit;
    }
} // ← thiếu ngoặc này trong code gốc của bạn
?>
