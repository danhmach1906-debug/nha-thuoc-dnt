<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
// Avoid HTML error output breaking JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
  echo json_encode(['success'=>false,'message'=>'Dữ liệu không hợp lệ'], JSON_UNESCAPED_UNICODE);
  exit;
}

$customer = isset($data['customer']) ? $data['customer'] : [];
$payment  = isset($data['payment']) ? trim($data['payment']) : '';
$orderObj = isset($data['order']) ? $data['order'] : [];
$items    = isset($data['items']) ? $data['items'] : (isset($orderObj['items']) ? $orderObj['items'] : []);
$pricing  = isset($data['pricing']) ? $data['pricing'] : [
  'subtotal' => isset($orderObj['subtotal']) ? (int)$orderObj['subtotal'] : 0,
  'discount' => isset($orderObj['discount']) ? (int)$orderObj['discount'] : 0,
  'shipping' => isset($orderObj['shipping']) ? (int)$orderObj['shipping'] : 0,
  'total'    => isset($orderObj['grand']) ? (int)$orderObj['grand'] : 0,
];
$coupon   = isset($data['coupon']) ? trim($data['coupon']) : (isset($orderObj['coupon']) ? trim($orderObj['coupon']) : null);

$name    = isset($customer['name']) ? trim($customer['name']) : '';
$phone   = isset($customer['phone']) ? trim($customer['phone']) : '';
$address = isset($customer['address']) ? trim($customer['address']) : '';
$note    = isset($customer['note']) ? trim($customer['note']) : '';

if ($name==='' || $phone==='' || $address==='' || !is_array($items) || count($items)===0) {
  echo json_encode(['success'=>false,'message'=>'Thiếu thông tin đơn hàng'], JSON_UNESCAPED_UNICODE);
  exit;
}

function ensureSchema($conn){
  $sql1 = "CREATE TABLE IF NOT EXISTS hoadon (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
  $conn->query($sql1);

  $sql2 = "CREATE TABLE IF NOT EXISTS hoadon_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id VARCHAR(64) NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NULL,
    price INT NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_hoadon_items_order FOREIGN KEY(order_id) REFERENCES hoadon(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
  $conn->query($sql2);
}

// Utilities
function hasColumn($conn, $table, $column){
  $table = $conn->real_escape_string($table);
  $column = $conn->real_escape_string($column);
  $sql = "SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='$table' AND COLUMN_NAME='$column'";
  $rs = $conn->query($sql);
  if(!$rs) return false; $row = $rs->fetch_assoc(); return intval($row['c']??0) > 0;
}
function mapPaymentText($code){
  $c = strtoupper(trim((string)$code));
  if($c==='COD') return 'Tiền mặt';
  if($c==='BANK') return 'Chuyển khoản';
  if($c==='WALLET') return 'Ví Momo';
  return $code ?: 'Khác';
}

// LEGACY MODE: If hoadon has MaHD schema -> insert per item rows to that table
$legacyHoadon = hasColumn($conn, 'hoadon', 'MaHD');
if ($legacyHoadon){
  $today = date('Y-m-d');
  $payText = mapPaymentText($payment);
  $maxQ = $conn->query("SELECT MAX(CAST(SUBSTRING(MaHD,3) AS UNSIGNED)) AS maxnum FROM hoadon");
  $row = $maxQ ? $maxQ->fetch_assoc() : null; $base = intval($row['maxnum'] ?? 0);
  $ins = $conn->prepare("INSERT INTO hoadon (MaHD, NgayLap, MaSP, TongTien, SoLuong, HinhThucThanhToan, TrangThai) VALUES (?,?,?,?,?,?,?)");
  if(!$ins){ echo json_encode(['success'=>false,'message'=>'Lỗi chuẩn bị câu lệnh: '.$conn->error], JSON_UNESCAPED_UNICODE); exit; }

  $codes = []; $sum = 0; $idx = 0;
  foreach($items as $i){
    $idx++;
    $num = $base + $idx; // tiếp nối số lớn nhất hiện có
    $ma = 'HD' . str_pad((string)$num, 3, '0', STR_PAD_LEFT);
    $masp = (string)($i['id'] ?? $i['product_id'] ?? ''); if ($masp==='') continue;
    $qty = max(1, intval($i['qty'] ?? 1));
    $price = floatval($i['price'] ?? 0);
    $money = $price * $qty; $sum += $money;
    $status = 'Đang xử lý';

    // sssdiss: MaHD(s), NgayLap(s), MaSP(s), TongTien(d), SoLuong(i), HinhThucThanhToan(s), TrangThai(s)
    if(!$ins->bind_param('sssdiss', $ma, $today, $masp, $money, $qty, $payText, $status)){
      echo json_encode(['success'=>false,'message'=>'Lỗi bind dữ liệu: '.$ins->error], JSON_UNESCAPED_UNICODE); exit;
    }
    if(!$ins->execute()){
      echo json_encode(['success'=>false,'message'=>'Lỗi lưu hóa đơn: '.$ins->error], JSON_UNESCAPED_UNICODE); exit;
  foreach($items as $i){
    $n++; $num = $base + $n; $ma = 'HD' . str_pad((string)$num, 3, '0', STR_PAD_LEFT);
    $masp = $conn->real_escape_string((string)($i['id'] ?? $i['product_id'] ?? ''));
    if ($masp==='') continue;
    $qty = max(1, intval($i['qty'] ?? 1));
    $price = floatval($i['price'] ?? 0); $money = $price * $qty; $sum += $money;
    $status = $conn->real_escape_string('Đang xử lý');
    $payT = $conn->real_escape_string($payText);
    $date = $conn->real_escape_string($today);
    $sqlIns = "INSERT INTO hoadon (MaHD, NgayLap, MaSP, TongTien, SoLuong, HinhThucThanhToan, TrangThai) VALUES ('$ma', '$date', '$masp', $money, $qty, '$payT', '$status')";
    if(!$conn->query($sqlIns)){
      echo json_encode(['success'=>false,'message'=>'Lỗi lưu hoadon: '.$conn->error], JSON_UNESCAPED_UNICODE); exit;
    }
    $codes[] = $ma;
  }

  echo json_encode([
    'success'=>true,
    'message'=>'Tạo hóa đơn thành công',
    'data'=>[
      'id'=>null,
      'code'=>$codes[0] ?? null,
      'codes'=>$codes,
      'status'=>'pending',
      'created_at'=>$today,
      'payment'=>$payText,
      'pricing'=>[
        'subtotal'=>(int)$sum,
        'discount'=>0,
        'shipping'=>0,
        'total'=>(int)$sum,
        'coupon'=>null
      ]
    ]
  ], JSON_UNESCAPED_UNICODE);
  $conn->close();
  exit;
}

// Default: header/detail flow (our schema)
ensureSchema($conn);

$stmt = $conn->prepare("INSERT INTO hoadon (customer_name, customer_phone, customer_address, customer_note, payment_method, status, subtotal, discount, shipping, total, coupon) VALUES (?,?,?,?,?,'pending',?,?,?,?,?)");
$sub = (int)($pricing['subtotal'] ?? 0);
$dis = (int)($pricing['discount'] ?? 0);
$shi = (int)($pricing['shipping'] ?? 0);
$tot = (int)($pricing['total'] ?? max(0, $sub - $dis + $shi));
$stmt->bind_param('sssssiiiis', $name, $phone, $address, $note, $payment, $sub, $dis, $shi, $tot, $coupon);

if(!$stmt->execute()){
  echo json_encode(['success'=>false,'message'=>'Lỗi lưu đơn: '.$stmt->error], JSON_UNESCAPED_UNICODE);
  exit;
}
$orderId = $stmt->insert_id;
$stmt->close();

$code = 'HD' . str_pad((string)$orderId, 6, '0', STR_PAD_LEFT);
$u = $conn->prepare("UPDATE hoadon SET code=? WHERE id=?");
$u->bind_param('si', $code, $orderId);
$u->execute();
$u->close();

$it = $conn->prepare("INSERT INTO hoadon_items (order_id, product_id, name, unit, price, qty) VALUES (?,?,?,?,?,?)");
foreach($items as $i){
  $pid = isset($i['id']) ? (string)$i['id'] : null;
  $iname = isset($i['name']) ? (string)$i['name'] : '';
  $unit = isset($i['unit']) ? (string)$i['unit'] : null;
  $price = isset($i['price']) ? (int)$i['price'] : 0;
  $qty = isset($i['qty']) ? (int)$i['qty'] : 1;
  if($iname==='') continue;
  $it->bind_param('isssii', $orderId, $pid, $iname, $unit, $price, $qty);
  if(!$it->execute()){
    echo json_encode(['success'=>false,'message'=>'Lỗi lưu sản phẩm: '.$it->error], JSON_UNESCAPED_UNICODE);
    $it->close();
    exit;
  }
}
$it->close();

$createdAt = date('Y-m-d H:i:s');
$r = $conn->query("SELECT created_at FROM hoadon WHERE id=".(int)$orderId." LIMIT 1");
if($r && $row=$r->fetch_assoc()){ $createdAt = $row['created_at']; }

echo json_encode([
  'success'=>true,
  'message'=>'Tạo đơn hàng thành công',
  'data'=>[
    'id'=>$orderId,
    'code'=>$code,
    'status'=>'pending',
    'created_at'=>$createdAt,
    'payment'=>$payment,
    'customer'=>[
      'name'=>$name,
      'phone'=>$phone,
      'address'=>$address,
      'note'=>$note
    ],
    'pricing'=>[
      'subtotal'=>$sub,
      'discount'=>$dis,
      'shipping'=>$shi,
      'total'=>$tot,
      'coupon'=>$coupon
    ]
  ]
], JSON_UNESCAPED_UNICODE);

$conn->close();
