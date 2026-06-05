const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// DATABASE TẠM THỜI
let users = []; // Lưu tài khoản: { phone, password, name }

const products = [
    { id: 1, category: 'tai-lieu', name: '[UFM] Đề Cương Nguyên Lý Kế Toán', price: 35000, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', sellerName: 'Admin', sellerPhone: '0123456789' },
    { id: 2, category: 'tai-lieu', name: '[UFM] Triết học Mác - Lênin', price: 25000, image: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400', sellerName: 'Admin', sellerPhone: '0123456789' },
    { id: 3, category: 'tro', name: 'Tìm Nam Ở Ghép Gần Trường', price: 1200000, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400', sellerName: 'Admin', sellerPhone: '0123456789' }
];

// ---------------- API TÀI KHOẢN ---------------- //
// 1. Đăng ký
app.post('/api/register', (req, res) => {
    const { phone, password, name } = req.body;
    const exists = users.find(u => u.phone === phone);
    
    if (exists) {
        return res.json({ success: false, message: 'Số điện thoại này đã được đăng ký!' });
    }
    
    users.push({ phone, password, name });
    res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
});

// 2. Đăng nhập
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { phone: user.phone, name: user.name } });
    } else {
        res.json({ success: false, message: 'Sai số điện thoại hoặc mật khẩu!' });
    }
});

// ---------------- API SẢN PHẨM ---------------- //
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.post('/api/products', (req, res) => {
    const { name, price, category, image, sellerName, sellerPhone } = req.body;
    const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        category, name, price: parseInt(price), image, sellerName, sellerPhone
    };
    products.push(newProduct);
    io.emit('new_product_added', newProduct);
    res.json({ success: true, message: 'Đăng sản phẩm thành công!' });
});

// ---------------- HỆ THỐNG CHAT (Dùng SĐT làm ID) ---------------- //
io.on('connection', (socket) => {
    // Đưa user vào phòng bảo mật dựa trên SĐT của họ
    socket.on('user_login', (phone) => {
        socket.join(phone);
        console.log(`[+] SĐT ${phone} đã online`);
    });

    socket.on('send_private_message', (data) => {
        // data gồm: { senderPhone, senderName, receiverPhone, text }
        
        // Gửi cho người bán
        io.to(data.receiverPhone).emit('receive_message', data);
        
        // Gửi ngược lại cho chính người mua để hiển thị lên màn hình
        if (data.senderPhone !== data.receiverPhone) {
            io.to(data.senderPhone).emit('receive_message', data);
        }
    });
});

http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});