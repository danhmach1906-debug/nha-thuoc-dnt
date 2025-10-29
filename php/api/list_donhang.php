<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);

try{
  $uid = $_SESSION['user_id'] ?? null; // MaTK
  if (!$uid){ echo json_encode(['success'=>false,'message'=>'Vui lòng đăng nhập để xem đơn hàng'], JSON_UNESCAPED_UNICODE); exit; }

  // Check table exists
  $rs = $conn->query("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='donhang'");
  $row = $rs? $rs->fetch_assoc(): null; if (!$row || intval($row['c']??0)===0){ echo json_encode(['success'=>false,'message'=>'Bảng donhang không tồn tại'], JSON_UNESCAPED_UNICODE); exit; }

  // Get columns
  $colsRes = $conn->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='donhang'");
  $cols = [];
  while($r = $colsRes->fetch_assoc()){ $cols[$r['COLUMN_NAME']] = true; }

  $pick = function(array $cands) use ($cols){ foreach($cands as $c){ if(isset($cols[$c])) return $c; } return null; };

  $codeCol   = $pick(['MaDH','MaDonHang','MaHD','code']);
  $dateCol   = $pick(['NgayLap','NgayDat','created_at','CreatedAt','ThoiGian','NgayTao']);
  $totalCol  = $pick(['TongTien','total','Total','GrandTotal']);
  $statusCol = $pick(['TrangThai','status','TinhTrang']);
  $payCol    = $pick(['HinhThucThanhToan','payment_method','PhuongThuc','ThanhToan']);
  $userCol   = $pick(['MaTK','MaKhachHang','MaKH','UserId']);
  $phoneCol  = $pick(['SoDienThoai','SDT','Phone']);

  // Build SELECT list
  $select = [];
  $select[] = $codeCol   ? ("`$codeCol` AS code")     : "NULL AS code";
  $select[] = $dateCol   ? ("`$dateCol` AS date")     : "NULL AS date";
  $select[] = $totalCol  ? ("`$totalCol` AS total")   : "NULL AS total";
  $select[] = $statusCol ? ("`$statusCol` AS status") : "NULL AS status";
  $select[] = $payCol    ? ("`$payCol` AS payment")   : "NULL AS payment";

  $where = '';
  $types = '';
  $params= [];

  if ($userCol){
    $where = " WHERE `$userCol` = ?"; $types = 's'; $params[] = $uid;
  } elseif ($phoneCol){
    // Try map via phone in taikhoan
    $stmt = $conn->prepare("SELECT SoDienThoai FROM taikhoan WHERE MaTK=? LIMIT 1");
    $stmt->bind_param('s', $uid); $stmt->execute(); $r = $stmt->get_result()->fetch_assoc(); $stmt->close();
    $phone = $r['SoDienThoai'] ?? '';
    if ($phone !== ''){ $where = " WHERE `$phoneCol` = ?"; $types='s'; $params[]=$phone; }
    else { echo json_encode(['success'=>true,'data'=>[]], JSON_UNESCAPED_UNICODE); exit; }
  } else {
    echo json_encode(['success'=>true,'data'=>[]], JSON_UNESCAPED_UNICODE); exit;
  }

  $orderBy = $dateCol ? ("`$dateCol` DESC") : ($codeCol ? ("`$codeCol` DESC") : '1');
  $sql = "SELECT ".implode(',', $select)." FROM donhang $where ORDER BY $orderBy LIMIT 100";
  $stmt = $conn->prepare($sql);
  if ($types) { $stmt->bind_param($types, ...$params); }
  $stmt->execute();
  $res = $stmt->get_result();
  $out=[]; while($row=$res->fetch_assoc()){
    // normalize
    $row['total'] = is_null($row['total'])? null : (float)$row['total'];
    $out[] = $row;
  }
  $stmt->close();

  echo json_encode(['success'=>true,'data'=>$out], JSON_UNESCAPED_UNICODE);
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Lỗi: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
  if(isset($conn)&&$conn) $conn->close();
}
