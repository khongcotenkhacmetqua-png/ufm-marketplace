const express = require('express');
const app = express();
// Khởi tạo server HTTP tích hợp Socket.IO
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
// Cho phép Server đọc dữ liệu JSON khách hàng gửi lên
app.use(express.json());

// API Nhận sản phẩm đăng bán từ người dùng
app.post('/api/products', (req, res) => {
    const { name, price, category, image } = req.body;
    
    // Tạo sản phẩm mới với ID tự động tăng
    const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        category: category,
        name: name,
        price: parseInt(price),
        image: image || 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=400' // Ảnh mặc định nếu không có
    };

    // Lưu vào mảng dữ liệu của Server
    products.push(newProduct);

    // BÁO CÁO THỜI GIAN THỰC: Bắn thông báo cho tất cả khách hàng đang mở web
    io.emit('new_product_added', newProduct);

    // Trả lời lại người đăng bán là thành công
    res.json({ success: true, message: 'Đăng sản phẩm thành công!' });
});
// BỘ DỮ LIỆU SẢN PHẨM (ĐÃ SỬA: Thêm 'category' và đủ 3 danh mục)
const products = [
    // 1. Tài liệu sách vở
    { id: 1, category: 'tai-lieu', name: '[UFM] Đề Cương Ôn Thi Nguyên Lý Kế Toán', price: 35000, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400' },
    { id: 2, category: 'tai-lieu', name: '[UFM] Tóm Tắt Lý Thuyết Kinh Tế Vi Mô', price: 25000, image: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400' },
    { id: 3, category: 'tai-lieu', name: '[UFM] Slide Bài Giảng Marketing Căn Bản', price: 30000, image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400' },
    
    // 2. Trọ sinh viên
    { id: 4, category: 'tro', name: 'Tìm Nam Ở Ghép - Phòng Trọ Gần Trường (Q.7)', price: 1200000, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400' },
    { id: 5, category: 'tro', name: 'Phòng Trọ Máy Lạnh Giá Rẻ Kế Bên Cơ Sở UFM', price: 2500000, image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400' },
    
    // 3. Việc làm
    { id: 6, category: 'viec-lam', name: '[Tuyển Dụng] Phục Vụ Quán Cà Phê Gần Trường (25k/h)', price: 25000, image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400' },
    { id: 7, category: 'viec-lam', name: '[Tìm Việc] Nhận Gia Sư Toán Lý Cho Học Sinh Cấp 2', price: 150000, image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400' }
];

app.get('/api/products', (req, res) => {
    res.json(products);
});

// Lắng nghe các kết nối Chat nhắn tin
io.on('connection', (socket) => {
    console.log('Có người vừa kết nối vào phòng chat');

    // Khi nhận được tin nhắn từ một ai đó
    socket.on('send_message', (data) => {
        // data bao gồm: { sender: "Tên người gửi", text: "Nội dung tin nhắn" }
        io.emit('receive_message', data); // Phát tin nhắn này đến TẤT CẢ mọi người đang mở web
    });

    socket.on('disconnect', () => {
        console.log('Một người dùng đã rời phòng chat');
    });
});

// LƯU Ý: Đổi từ app.listen thành http.listen để chạy được tính năng chat
http.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});