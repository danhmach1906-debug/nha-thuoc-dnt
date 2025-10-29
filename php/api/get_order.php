<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
// Avoid HTML error output breaking JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

function ensureSchema($conn){
  $conn->query("CREATE TABLE IF NOT EXISTS hoadon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_address VARCHAR(500) NOT NULL,
    customer_note VARCHAR(1000) NULL,
    payment_method VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    subtotal INT NOT NULL DEFAULT 0,
    discount INT NOT NULL DEFAULT 0,
    shipping INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    coupon VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $conn->query("CREATE TABLE IF NOT EXISTS hoadon_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id VARCHAR(64) NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NULL,
    price INT NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_hoadon_items_order FOREIGN KEY(order_id) REFERENCES hoadon(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

ensureSchema($conn);

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$code = isset($_GET['code']) ? trim($_GET['code']) : '';

if ($id <= 0 && $code===''){
  echo json_encode(['success'=>false,'message'=>'Thiếu id hoặc code'], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($id > 0){
  $stmt = $conn->prepare("SELECT * FROM hoadon WHERE id=? LIMIT 1");
  $stmt->bind_param('i', $id);
} else {
  $stmt = $conn->prepare("SELECT * FROM hoadon WHERE code=? LIMIT 1");
  $stmt->bind_param('s', $code);
}

if(!$stmt->execute()){
  echo json_encode(['success'=>false,'message'=>'Lỗi truy vấn: '.$stmt->error], JSON_UNESCAPED_UNICODE);
  exit;
}
$res = $stmt->get_result();
$order = $res->fetch_assoc();
$stmt->close();

if(!$order){
  echo json_encode(['success'=>false,'message'=>'Không tìm thấy đơn hàng'], JSON_UNESCAPED_UNICODE);
  exit;
}

$orderId = (int)$order['id'];
$itStmt = $conn->prepare("SELECT oi.product_id, oi.name, oi.unit, oi.price, oi.qty, sp.Hinhanh AS image FROM hoadon_items oi LEFT JOIN sanpham sp ON sp.MaSP = oi.product_id WHERE oi.order_id=?");
$itStmt->bind_param('i', $orderId);
$itStmt->execute();
$itRes = $itStmt->get_result();
$items = [];
while($row = $itRes->fetch_assoc()){
  $items[] = $row;
}
$itStmt->close();

$out = [
  'id' => (int)$order['id'],
  'code' => $order['code'],
  'status' => $order['status'],
  'created_at' => $order['created_at'],
  'payment' => $order['payment_method'],
  'customer' => [
    'name' => $order['customer_name'],
    'phone'=> $order['customer_phone'],
    'address'=>$order['customer_address'],
    'note'   =>$order['customer_note'],
  ],
  'pricing' => [
    'subtotal' => (int)$order['subtotal'],
    'discount' => (int)$order['discount'],
    'shipping' => (int)$order['shipping'],
    'total'    => (int)$order['total'],
    'coupon'   => $order['coupon']
  ],
  'items' => $items
];

echo json_encode(['success'=>true,'data'=>$out], JSON_UNESCAPED_UNICODE);

$conn->close();
