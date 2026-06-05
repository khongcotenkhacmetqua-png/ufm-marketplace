const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json()); // Để đọc dữ liệu sản phẩm người dùng gửi lên

// DỮ LIỆU SẢN PHẨM MẶC ĐỊNH (Bổ sung thêm trường 'seller')
const products = [
    { id: 1, category: 'tai-lieu', name: '[UFM] Đề Cương Nguyên Lý Kế Toán', price: 35000, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', seller: 'Admin (MSSV: 00000000)' },
    { id: 2, category: 'tai-lieu', name: '[UFM] Triết học Mác - Lênin', price: 25000, image: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400', seller: 'Admin (MSSV: 00000000)' },
    { id: 3, category: 'tro', name: 'Tìm Nam Ở Ghép Gần Trường', price: 1200000, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400', seller: 'Admin (MSSV: 00000000)' }
];

app.get('/api/products', (req, res) => {
    res.json(products);
});

// API Nhận sản phẩm từ sinh viên khác đăng lên
app.post('/api/products', (req, res) => {
    const { name, price, category, image, seller } = req.body;
    
    const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        category, name, price: parseInt(price), image, seller
    };

    products.push(newProduct);
    io.emit('new_product_added', newProduct); // Báo cho mọi người có hàng mới
    res.json({ success: true, message: 'Đăng sản phẩm thành công!' });
});

// HỆ THỐNG SOCKET.IO (XỬ LÝ CHAT 1-1)
io.on('connection', (socket) => {
    
    // 1. Khi người dùng đăng nhập, đưa họ vào 1 phòng mang tên họ
    socket.on('user_login', (username) => {
        socket.join(username);
        console.log(`[+] ${username} đã online`);
    });

    // 2. Lắng nghe tin nhắn riêng tư
    socket.on('send_private_message', (data) => {
        // data bao gồm: { sender, receiver, text }
        
        // Gửi tin nhắn đến đúng phòng của người bán (receiver)
        io.to(data.receiver).emit('receive_message', data);
        
        // Gửi ngược lại cho chính người mua để họ thấy tin nhắn mình vừa nhắn
        // (Nếu họ tự chat với chính mình thì không cần gửi lại 2 lần)
        if (data.sender !== data.receiver) {
            io.to(data.sender).emit('receive_message', data);
        }
    });
});

http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});