<?php
include 'ketnoi.php';
header('Content-Type: application/json; charset=utf-8');
mysqli_set_charset($conn, 'utf8mb4');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        $type = $_GET['type'] ?? 'Nhân viên';
        $stmt = $conn->prepare("SELECT * FROM taikhoan WHERE LoaiTaiKhoan = ?");
        $stmt->bind_param("s", $type);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        break;

    case 'add':
        $input = json_decode(file_get_contents("php://input"), true);
        if (!$input) {
            echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO taikhoan (MaTK, TenDangNhap, SoDienThoai, Mail, MatKhau, NgayDangKy, LoaiTaiKhoan)
                                VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssss",
            $input['maTK'],
            $input['tenDangNhap'],
            $input['soDienThoai'],
            $input['mail'],
            $input['matKhau'],
            $input['ngayDangKy'],
            $input['loaiTaiKhoan']
        );

        echo json_encode(['success' => $stmt->execute(), 'message' => $stmt->error]);
        break;

    case 'update':
        $input = json_decode(file_get_contents("php://input"), true);
        if (!$input || empty($input['maTK'])) {
            echo json_encode(['success' => false, 'message' => 'Thiếu mã tài khoản']);
            exit;
        }

        // Always bind fixed placeholders. If matKhau rỗng -> giữ nguyên bằng COALESCE(NULLIF(?, ''), MatKhau)
        $sql = "UPDATE taikhoan
                   SET TenDangNhap=?, SoDienThoai=?, Mail=?, NgayDangKy=?,
                       MatKhau = COALESCE(NULLIF(?, ''), MatKhau)
                 WHERE MaTK=?";
        $stmt = $conn->prepare($sql);
        $ten = $input['tenDangNhap'] ?? '';
        $sdt = $input['soDienThoai'] ?? '';
        $mail= $input['mail'] ?? '';
        $ngay= $input['ngayDangKy'] ?? '';
        $mk  = $input['matKhau'] ?? '';
        $ma  = $input['maTK'];
        $stmt->bind_param("ssssss", $ten, $sdt, $mail, $ngay, $mk, $ma);

        echo json_encode(['success' => $stmt->execute(), 'message' => $stmt->error]);
        break;

    case 'delete':
        $input = json_decode(file_get_contents("php://input"), true);
        if (!$input || empty($input['maTK'])) {
            echo json_encode(['success' => false, 'message' => 'Thiếu mã tài khoản']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM taikhoan WHERE MaTK = ?");
        $stmt->bind_param("s", $input['maTK']);

        echo json_encode(['success' => $stmt->execute(), 'message' => $stmt->error]);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Hành động không hợp lệ']);
}
?>
