<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "nhathuocdnt01";

// Tạo kết nối
$conn = new mysqli($servername, $username, $password, $dbname);

// Kiểm tra kết nối
if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Thiết lập mã hóa UTF-8 để tránh lỗi tiếng Việt
$conn->set_charset("utf8mb4");
?>
