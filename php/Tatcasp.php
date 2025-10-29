<?php
require_once 'ketnoi.php';
header('Content-Type: application/json; charset=UTF-8');

// Lấy tham số filter từ URL
$letter = $_GET['letter'] ?? '*';

try {
    // Nếu letter = '*', lấy tất cả sản phẩm
    if ($letter === '*') {
        $sql = "SELECT * FROM sanpham ORDER BY TenSP ASC";
        $stmt = $conn->prepare($sql);
    } else {
        // Filter theo chữ cái đầu của TenSP
        $sql = "SELECT * FROM sanpham WHERE TenSP LIKE ? ORDER BY TenSP ASC";
        $stmt = $conn->prepare($sql);
        $searchPattern = $letter . '%';
        $stmt->bind_param("s", $searchPattern);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $products,
        'count' => count($products),
        'letter' => $letter
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>