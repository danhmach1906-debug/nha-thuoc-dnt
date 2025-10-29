<?php
header('Content-Type: application/json; charset=utf-8');

try {
    require_once 'ketnoi.php';
    
    // Test 1: Connection
    if (!$conn) {
        die(json_encode(['error' => 'No connection'], JSON_UNESCAPED_UNICODE));
    }
    
    // Test 2: Simple query
    $sql = "SELECT MaSP, TenSP, DonGia FROM sanpham LIMIT 5";
    $result = $conn->query($sql);
    
    if (!$result) {
        die(json_encode(['error' => 'Query failed: ' . $conn->error], JSON_UNESCAPED_UNICODE));
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Connection OK',
        'count' => count($products),
        'sample' => $products
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
