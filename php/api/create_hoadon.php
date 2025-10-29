<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
  $input = file_get_contents('php://input');
  $data = json_decode($input, true);
  if (!$data) { echo json_encode(['success'=>false,'message'=>'Dữ liệu không hợp lệ'], JSON_UNESCAPED_UNICODE); exit; }

  $customer = $data['customer'] ?? [];
  $payment  = trim($data['payment'] ?? '');
  $orderObj = $data['order'] ?? [];
  $items    = $data['items'] ?? ($orderObj['items'] ?? []);

  if (!is_array($items) || !count($items)) { echo json_encode(['success'=>false,'message'=>'Không có sản phẩm'], JSON_UNESCAPED_UNICODE); exit; }

  function mapPay($code){ $c=strtoupper(trim((string)$code)); if($c==='COD') return 'Tiền mặt'; if($c==='BANK') return 'Chuyển khoản'; if($c==='WALLET') return 'Ví Momo'; return $code?:'Khác'; }
  function hasCol($conn,$table,$col){
    $table=$conn->real_escape_string($table); $col=$conn->real_escape_string($col);
    $sql="SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='$table' AND COLUMN_NAME='$col'";
    $rs=$conn->query($sql); if(!$rs) return false; $r=$rs->fetch_assoc(); return intval($r['c']??0)>0;
  }

  if (!hasCol($conn,'hoadon','MaHD')){
    echo json_encode(['success'=>false,'message'=>'Bảng hoadon không có cấu trúc MaHD (MaHD, NgayLap, MaSP, TongTien, SoLuong, HinhThucThanhToan, TrangThai)'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $today = date('Y-m-d');
  $payText = mapPay($payment);
  $maxQ = $conn->query("SELECT MAX(CAST(SUBSTRING(MaHD,3) AS UNSIGNED)) AS maxnum FROM hoadon");
  $row = $maxQ ? $maxQ->fetch_assoc() : null; $base = intval($row['maxnum'] ?? 0);

  $ins = $conn->prepare("INSERT INTO hoadon (MaHD, NgayLap, MaSP, TongTien, SoLuong, HinhThucThanhToan, TrangThai) VALUES (?,?,?,?,?,?,?)");
  if(!$ins){ echo json_encode(['success'=>false,'message'=>'Lỗi chuẩn bị câu lệnh: '.$conn->error], JSON_UNESCAPED_UNICODE); exit; }

  // helper: resolve MaSP
  $resolveMaSP = function($idVal, $nameVal) use ($conn){
    $idVal = trim((string)$idVal);
    if($idVal !== ''){
      $stmt = $conn->prepare("SELECT MaSP FROM sanpham WHERE MaSP=? LIMIT 1");
      $stmt->bind_param('s', $idVal); $stmt->execute(); $r=$stmt->get_result();
      if($r && $r->fetch_assoc()){ $stmt->close(); return $idVal; }
      $stmt->close();
    }
    $nameVal = trim((string)$nameVal);
    if($nameVal !== ''){
      // 1) Case-insensitive equality
      $stmt = $conn->prepare("SELECT MaSP FROM sanpham WHERE LOWER(TRIM(TenSP)) = LOWER(TRIM(?)) LIMIT 1");
      $stmt->bind_param('s', $nameVal); $stmt->execute(); $r=$stmt->get_result();
      if($r && ($row=$r->fetch_assoc())){ $stmt->close(); return (string)$row['MaSP']; }
      $stmt->close();
      // 2) Fallback: LIKE contains
      $like = "%".$nameVal."%";
      $stmt = $conn->prepare("SELECT MaSP FROM sanpham WHERE TenSP LIKE ? LIMIT 1");
      $stmt->bind_param('s', $like); $stmt->execute(); $r=$stmt->get_result();
      if($r && ($row=$r->fetch_assoc())){ $stmt->close(); return (string)$row['MaSP']; }
      $stmt->close();
    }
    return '';
  };

  $codes=[]; $sum=0; $inserted=0;
  foreach($items as $it){
    $maspRaw = (string)($it['id'] ?? $it['product_id'] ?? '');
    $masp = $resolveMaSP($maspRaw, $it['name'] ?? '');
    if($masp==='') continue; // skip invalid -> tránh lỗi FK
    $inserted++;
    $num = $base + $inserted; // dùng số thứ tự liên tục cho các dòng hợp lệ
    $ma = 'HD' . str_pad((string)$num, 3, '0', STR_PAD_LEFT);
    $qty = max(1, intval($it['qty'] ?? 1));
    $price = (float)($it['price'] ?? 0); $money = $price*$qty; $sum += $money;
    $status = 'Đang xử lý';
    $ins->bind_param('sssdiss', $ma, $today, $masp, $money, $qty, $payText, $status);
    $ins->execute();
    $codes[] = $ma;
  }
  $ins->close();

  if ($inserted === 0){
    echo json_encode(['success'=>false,'message'=>'Không có sản phẩm hợp lệ để lưu (không tìm thấy MaSP trong bảng sanpham)'], JSON_UNESCAPED_UNICODE); exit;
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
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Lỗi máy chủ: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
  if(isset($conn) && $conn) { $conn->close(); }
}
