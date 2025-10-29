<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../ketnoi.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);

function hasColumn($conn, $table, $column){
  $table = $conn->real_escape_string($table);
  $column = $conn->real_escape_string($column);
  $sql = "SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='$table' AND COLUMN_NAME='$column'";
  $rs = $conn->query($sql);
  if(!$rs) return false; $row = $rs->fetch_assoc(); return intval($row['c']??0) > 0;
}

$bindParams = function(mysqli_stmt $stmt, string $types, array $values){
  $params = [$types];
  foreach($values as $k=>$v){ $params[] = &$values[$k]; }
  return call_user_func_array([$stmt, 'bind_param'], $params);
};

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
$code = isset($data['code']) ? trim($data['code']) : '';
$codes = isset($data['codes']) && is_array($data['codes']) ? array_filter(array_map('strval',$data['codes'])) : [];
$doDelete = !empty($data['delete']);

if ($id <= 0 && $code === '' && empty($codes)){
  echo json_encode(['success'=>false,'message'=>'Thiếu tham số: id/code/codes'], JSON_UNESCAPED_UNICODE); exit;
}

$hasStatus = hasColumn($conn,'hoadon','status');
$hasCode   = hasColumn($conn,'hoadon','code');
$hasTrang  = hasColumn($conn,'hoadon','TrangThai');
$hasMaHD   = hasColumn($conn,'hoadon','MaHD');

// If request asks to delete, perform hard delete first
if ($doDelete){
  // Prefer modern schema
  if ($id > 0 && $hasStatus){
    $stmt = $conn->prepare("DELETE FROM hoadon WHERE id=?");
    $stmt->bind_param('i', $id);
    if(!$stmt->execute()){ echo json_encode(['success'=>false,'message'=>'Lỗi xóa: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit; }
    $del = $stmt->affected_rows; $stmt->close();
    echo json_encode(['success'=> $del>0, 'message'=> $del>0?'Đã xóa hóa đơn':'Không tìm thấy hóa đơn', 'deleted'=>$del, 'mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit;
  }
  if ($code!=='') $codes[] = $code;
  $codes = array_values(array_unique($codes));
  if (!empty($codes)){
    if ($hasStatus && $hasCode){
      $place = implode(',', array_fill(0, count($codes), '?'));
      $sql = "DELETE FROM hoadon WHERE code IN ($place)";
      $stmt = $conn->prepare($sql);
      $types = str_repeat('s', count($codes));
      if(!$bindParams($stmt, $types, $codes)){
        echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
      }
      if(!$stmt->execute()){ echo json_encode(['success'=>false,'message'=>'Lỗi xóa: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit; }
      $del = $stmt->affected_rows; $stmt->close();
      if ($del>0){ echo json_encode(['success'=>true,'message'=>'Đã xóa hóa đơn','deleted'=>$del,'mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit; }
      // Fallback legacy by MaHD
      if ($hasTrang && $hasMaHD){
        $place = implode(',', array_fill(0, count($codes), '?'));
        $sql = "DELETE FROM hoadon WHERE MaHD IN ($place)";
        $stmt = $conn->prepare($sql);
        $types = str_repeat('s', count($codes));
        if(!$bindParams($stmt, $types, $codes)){
          echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
        }
        if(!$stmt->execute()){ echo json_encode(['success'=>false,'message'=>'Lỗi xóa: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit; }
        $del = $stmt->affected_rows; $stmt->close();
        echo json_encode(['success'=> $del>0, 'message'=> $del>0?'Đã xóa hóa đơn':'Không tìm thấy hóa đơn', 'deleted'=>$del,'mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit;
      }
      echo json_encode(['success'=>false,'message'=>'Không tìm thấy hóa đơn để xóa','mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit;
    } elseif ($hasTrang && $hasMaHD){
      $place = implode(',', array_fill(0, count($codes), '?'));
      $sql = "DELETE FROM hoadon WHERE MaHD IN ($place)";
      $stmt = $conn->prepare($sql);
      $types = str_repeat('s', count($codes));
      if(!$bindParams($stmt, $types, $codes)){
        echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
      }
      if(!$stmt->execute()){ echo json_encode(['success'=>false,'message'=>'Lỗi xóa: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit; }
      $del = $stmt->affected_rows; $stmt->close();
      echo json_encode(['success'=> $del>0, 'message'=> $del>0?'Đã xóa hóa đơn':'Không tìm thấy hóa đơn', 'deleted'=>$del,'mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit;
    }
  }
  echo json_encode(['success'=>false,'message'=>'Không có tham số để xóa','mode'=>'delete'], JSON_UNESCAPED_UNICODE); exit;
}

// If not deleting, fallback to cancel (update status)
if ($id > 0 && $hasStatus){
  $stmt = $conn->prepare("UPDATE hoadon SET status='canceled' WHERE id=?");
  $stmt->bind_param('i', $id);
  if(!$stmt->execute()){ echo json_encode(['success'=>false,'message'=>'Lỗi cập nhật: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit; }
  $aff = $stmt->affected_rows; $stmt->close();
  echo json_encode(['success'=> $aff>0, 'message'=> $aff>0?'Đã hủy đơn hàng':'Không tìm thấy đơn', 'status'=>'canceled'], JSON_UNESCAPED_UNICODE); exit;
}

// Build list of codes
if ($code!=='') $codes[] = $code;
$codes = array_values(array_unique($codes));

if (!empty($codes)){
  if ($hasStatus && $hasCode){
    // Modern schema: hoadon.code + hoadon.status
    $place = implode(',', array_fill(0, count($codes), '?'));
    $sql = "UPDATE hoadon SET status='canceled' WHERE code IN ($place)";
    $stmt = $conn->prepare($sql);
    $types = str_repeat('s', count($codes));
    if(!$bindParams($stmt, $types, $codes)){
      echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
    }
    // Execute and maybe fallback
    if(!$stmt->execute()){
      echo json_encode(['success'=>false,'message'=>'Lỗi cập nhật: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit;
    }
    $aff = $stmt->affected_rows; $stmt->close();
    if ($aff>0){ echo json_encode(['success'=>true,'message'=>'Đã hủy đơn hàng','status'=>'canceled','affected'=>$aff], JSON_UNESCAPED_UNICODE); exit; }
    // Fallback to legacy by MaHD if present
    if ($hasTrang && $hasMaHD){
      $place = implode(',', array_fill(0, count($codes), '?'));
      $sql = "UPDATE hoadon SET TrangThai='Đã hủy' WHERE MaHD IN ($place)";
      $stmt = $conn->prepare($sql);
      $types = str_repeat('s', count($codes));
      if(!$bindParams($stmt, $types, $codes)){
        echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
      }
      if(!$stmt->execute()){
        echo json_encode(['success'=>false,'message'=>'Lỗi cập nhật: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit;
      }
      $aff = $stmt->affected_rows; $stmt->close();
      if ($aff>0){ echo json_encode(['success'=>true,'message'=>'Đã hủy đơn hàng','status'=>'canceled','affected'=>$aff], JSON_UNESCAPED_UNICODE); exit; }
      echo json_encode(['success'=>false,'message'=>'Không tìm thấy hóa đơn để hủy'], JSON_UNESCAPED_UNICODE); exit;
    }
    echo json_encode(['success'=>false,'message'=>'Không tìm thấy hóa đơn để hủy'], JSON_UNESCAPED_UNICODE); exit;
  } elseif ($hasTrang && $hasMaHD){
    // Legacy schema: hoadon.MaHD + hoadon.TrangThai
    $place = implode(',', array_fill(0, count($codes), '?'));
    $sql = "UPDATE hoadon SET TrangThai='Đã hủy' WHERE MaHD IN ($place)";
    $stmt = $conn->prepare($sql);
    $types = str_repeat('s', count($codes));
    if(!$bindParams($stmt, $types, $codes)){
      echo json_encode(['success'=>false,'message'=>'Bind tham số thất bại'], JSON_UNESCAPED_UNICODE); exit;
    }
  } else {
    echo json_encode(['success'=>false,'message'=>'Cấu trúc bảng hoadon không phù hợp để hủy đơn'], JSON_UNESCAPED_UNICODE); exit;
  }

  if(!$stmt->execute()){
    echo json_encode(['success'=>false,'message'=>'Lỗi cập nhật: '.$stmt->error], JSON_UNESCAPED_UNICODE); exit;
  }
  $aff = $stmt->affected_rows; $stmt->close();
  if ($aff<=0){ echo json_encode(['success'=>false,'message'=>'Không tìm thấy hóa đơn để hủy'], JSON_UNESCAPED_UNICODE); exit; }
  echo json_encode(['success'=>true,'message'=>'Đã hủy đơn hàng','status'=>'canceled','affected'=>$aff], JSON_UNESCAPED_UNICODE); exit;
}

echo json_encode(['success'=>false,'message'=>'Không có tham số phù hợp để hủy'], JSON_UNESCAPED_UNICODE);
$conn->close();
