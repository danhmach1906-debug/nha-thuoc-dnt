<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);

function hasCol($conn,$table,$col){
  $table=$conn->real_escape_string($table); $col=$conn->real_escape_string($col);
  $sql="SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='$table' AND COLUMN_NAME='$col'";
  $rs=$conn->query($sql); if(!$rs) return false; $r=$rs->fetch_assoc(); return intval($r['c']??0)>0;
}

try{
  // Check table exists
  $rs = $conn->query("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='hoadon'");
  $row = $rs? $rs->fetch_assoc(): null; if (!$row || intval($row['c']??0)===0){ echo json_encode(['success'=>false,'message'=>'Bảng hoadon không tồn tại'], JSON_UNESCAPED_UNICODE); exit; }

  $out = [];
  if (hasCol($conn,'hoadon','MaHD')){
    // Legacy per-item schema: aggregate by MaHD
    $sql = "SELECT MaHD AS code, MAX(NgayLap) AS date, SUM(TongTien) AS total, MAX(HinhThucThanhToan) AS payment, MAX(TrangThai) AS status, COUNT(*) AS items
            FROM hoadon
            GROUP BY MaHD
            ORDER BY MAX(NgayLap) DESC
            LIMIT 200";
    $res = $conn->query($sql);
    while($r = $res->fetch_assoc()){
      $r['total'] = (float)$r['total'];
      $out[] = $r;
    }
  } else if (hasCol($conn,'hoadon','code')){
    // Modern header schema
    $dateCol = hasCol($conn,'hoadon','created_at') ? 'created_at' : (hasCol($conn,'hoadon','NgayLap')? 'NgayLap' : 'created_at');
    $payCol  = hasCol($conn,'hoadon','payment_method') ? 'payment_method' : (hasCol($conn,'hoadon','HinhThucThanhToan')? 'HinhThucThanhToan' : 'payment_method');
    $sql = "SELECT code, `$dateCol` AS date, total, `$payCol` AS payment, status FROM hoadon ORDER BY `$dateCol` DESC LIMIT 200";
    $res = $conn->query($sql);
    while($r = $res->fetch_assoc()){
      $r['total'] = (float)($r['total'] ?? 0);
      $out[] = $r;
    }
  } else {
    echo json_encode(['success'=>true,'data'=>[]], JSON_UNESCAPED_UNICODE); exit;
  }

  echo json_encode(['success'=>true,'data'=>$out], JSON_UNESCAPED_UNICODE);
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Lỗi: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
  if(isset($conn)&&$conn) $conn->close();
}
