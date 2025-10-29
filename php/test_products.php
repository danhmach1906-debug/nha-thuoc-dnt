<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'ketnoi.php';

echo json_encode([
    'connection' => 'OK',
    'database' => $conn->server_info
], JSON_UNESCAPED_UNICODE);

// Test query
$result = $conn->query("SELECT COUNT(*) as total FROM sanpham");
if ($result) {
    $row = $result->fetch_assoc();
    echo json_encode([
        'status' => 'success',
        'total_products' => $row['total']
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => $conn->error
    ], JSON_UNESCAPED_UNICODE);
}
?>
