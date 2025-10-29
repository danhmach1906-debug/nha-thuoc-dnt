<?php
require_once 'ketnoi.php';
header('Content-Type: application/json; charset=UTF-8');

$type   = $_GET['type'] ?? '';
$action = $_GET['action'] ?? 'fetch';
$search = $_GET['search'] ?? '';

if (!$type) {
  echo json_encode(['status'=>'error','msg'=>'Thiếu type']);
  exit;
}

switch ($type) {
  case 'sanpham':   $table = 'sanpham';   $key = 'MaSP'; break;
  case 'hoadon':    $table = 'hoadon';    $key = 'MaHD'; break;
  case 'khuyenmai': $table = 'khuyenmai'; $key = 'MaKM'; break;
  case 'nhanvien':  $table = 'taikhoan';  $key = 'MaNV'; break;
  default:
    echo json_encode(['status'=>'error','msg'=>'Loại bảng không hợp lệ']); exit;
}

/* ========== FETCH ========== */
if ($action === 'fetch') {
  $sql = "SELECT * FROM $table";
  
  // Add search condition if search term is provided
  if ($search !== '') {
    $search = $conn->real_escape_string($search);
    if ($type === 'nhanvien') {
      $sql .= " WHERE MaNV LIKE '%$search%' OR HoTen LIKE '%$search%' OR Email LIKE '%$search%' OR ChucVu LIKE '%$search%'";
    } else {
      $sql .= " WHERE $key LIKE '%$search%' OR TenSP LIKE '%$search%'";
    }
  }
  
  $res = $conn->query($sql);
  $rows = [];
  while ($r = $res->fetch_assoc()) {
    // Hide password hash for security
    if (isset($r['MatKhau'])) {
      unset($r['MatKhau']);
    }
    $rows[] = $r;
  }
  echo json_encode(['status'=>'ok','data'=>$rows]);
}

/* ========== ADD ========== */
elseif ($action === 'add') {
  $data = json_decode(file_get_contents('php://input'), true);
  
  if ($type === 'nhanvien') {
    // Use raw password
    $hashed_password = $data['MatKhau'];
    
    $stmt = $conn->prepare(
      "INSERT INTO taikhoan(MaNV, HoTen, Email, MatKhau, ChucVu, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("ssssss",
      $data['MaNV'],
      $data['HoTen'],
      $data['Email'],
      $hashed_password,
      $data['ChucVu'],
      $data['TrangThai']
    );
  }
  // ... (keep existing product, invoice, promotion code)
  else if ($type === 'sanpham') {
    $stmt = $conn->prepare(
      "INSERT INTO sanpham(MaSP, TenSP, DonGia, DonViTinh, MaLoai, TenNCC, HanSuDung, Hinhanh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("ssdsssss",
      $data['MaSP'], $data['TenSP'], $data['DonGia'],
      $data['DonViTinh'], $data['MaLoai'],
      $data['TenNCC'], $data['HanSuDung'], $data['Hinhanh']
    );
  }
  elseif ($type === 'hoadon') {
    $stmt = $conn->prepare(
      "INSERT INTO hoadon(MaHD, NgayLap, MaSP, TongTien, SoLuong, HinhThucThanhToan, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("sssdiss",
      $data['MaHD'], $data['NgayLap'], $data['MaSP'],
      $data['TongTien'], $data['SoLuong'],
      $data['HinhThucThanhToan'], $data['TrangThai']
    );
  }
  elseif ($type === 'khuyenmai') {
    $stmt = $conn->prepare(
      "INSERT INTO khuyenmai(MaKM, TenCTKM, NgayBatDau, NgayKetThuc, PhanTramGiam)
       VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("ssssi",
      $data['MaKM'], $data['TenCTKM'],
      $data['NgayBatDau'], $data['NgayKetThuc'], $data['PhanTramGiam']
    );
  }

  $ok = $stmt->execute();
  echo json_encode(['status'=>$ok?'ok':'error','msg'=>$conn->error]);
}

/* ========== UPDATE ========== */
elseif ($action === 'update') {
  $data = json_decode(file_get_contents('php://input'), true);
  $id = $conn->real_escape_string($data[$key]);
  $sets = [];
  
  foreach ($data as $k => $v) {
    if ($k === $key) continue;
    
    // Special handling for password - only update if provided
    if ($k === 'MatKhau' && $v === '') {
      continue;
    }
    
    if ($k === 'MatKhau') {
      // Use raw password
      $v = $v;
    }
    
    $sets[] = "$k='" . $conn->real_escape_string($v) . "'";
  }
  
  if (!empty($sets)) {
    $sql = "UPDATE $table SET " . implode(", ", $sets) . " WHERE $key='$id'";
    $ok = $conn->query($sql);
    echo json_encode(['status'=>$ok?'ok':'error','msg'=>$conn->error]);
  } else {
    echo json_encode(['status'=>'ok','msg'=>'No changes detected']);
  }
}

/* ========== DELETE ========== */
elseif ($action === 'delete') {
  $id = $_GET['id'] ?? '';
  
  // Prevent deleting the last admin account
  if ($type === 'nhanvien') {
    $checkAdmin = $conn->query("SELECT COUNT(*) as adminCount FROM taikhoan WHERE ChucVu = 'admin'");
    $adminCount = $checkAdmin->fetch_assoc()['adminCount'];
    
    $isAdmin = $conn->query("SELECT ChucVu FROM taikhoan WHERE $key='" . $conn->real_escape_string($id) . "'")->fetch_assoc()['ChucVu'] === 'admin';
    
    if ($isAdmin && $adminCount <= 1) {
      echo json_encode(['status'=>'error','msg'=>'Không thể xóa tài khoản admin cuối cùng']);
      exit;
    }
  }
  
  $ok = $conn->query("DELETE FROM $table WHERE $key='" . $conn->real_escape_string($id) . "'");
  echo json_encode(['status'=>$ok?'ok':'error','msg'=>$conn->error]);
}

$conn->close();
?>
