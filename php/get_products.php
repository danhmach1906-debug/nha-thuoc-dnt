<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'ketnoi.php';

// Bật error reporting cho debug (xóa dòng này khi production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Không hiển thị lỗi trực tiếp, chỉ log

// Lấy tham số letter từ query string
$letter = isset($_GET['letter']) ? trim($_GET['letter']) : '*';

try {
    if ($letter === '*') {
        // Lấy tất cả sản phẩm
        $sql = "SELECT MaSP, TenSP, DonGia, DonViTinh, MaLoai, TenNCC, HanSuDung, Hinhanh 
                FROM sanpham 
                ORDER BY TenSP ASC";
        $stmt = $conn->prepare($sql);
    } else {
        // Lọc sản phẩm theo chữ cái đầu
        $letter = strtoupper($letter);
        
        // Map chữ cái với các biến thể có dấu tiếng Việt
        $letterPatterns = [
            'A' => ['A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
            'E' => ['E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ', 'Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'],
            'I' => ['I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị'],
            'O' => ['O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
            'U' => ['U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ', 'Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'],
            'Y' => ['Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ'],
            'D' => ['D', 'Đ']
        ];
        
        // Lấy danh sách các ký tự cần tìm
        $searchLetters = isset($letterPatterns[$letter]) ? $letterPatterns[$letter] : [$letter];
        
        // Tạo placeholders cho IN clause
        $placeholders = implode(',', array_fill(0, count($searchLetters), '?'));
        
        $sql = "SELECT MaSP, TenSP, DonGia, DonViTinh, MaLoai, TenNCC, HanSuDung, Hinhanh 
                FROM sanpham 
                WHERE UPPER(LEFT(TenSP, 1)) IN ($placeholders)
                ORDER BY TenSP ASC";
        
        $stmt = $conn->prepare($sql);
        
        // Bind parameters dynamically
        $types = str_repeat('s', count($searchLetters));
        $stmt->bind_param($types, ...$searchLetters);
    }
    
    if (!$stmt->execute()) {
        throw new Exception('Lỗi SQL: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        throw new Exception('Không thể lấy kết quả: ' . $conn->error);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Format ngày hạn sử dụng
        if ($row['HanSuDung']) {
            $date = new DateTime($row['HanSuDung']);
            $row['HanSuDung'] = $date->format('d/m/Y');
        }
        $products[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $products,
        'count' => count($products),
        'letter' => $letter
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Lỗi khi lấy dữ liệu: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
