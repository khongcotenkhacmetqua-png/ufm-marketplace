const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// DATABASE LƯU TRỮ TẠM THỜI TRONG RAM
let users = []; 
let dbMessages = []; 
const products = []; // MỚI VÀO TRANG SẼ KHÔNG CÓ SẢN PHẨM NÀO HẾT

// ---------------- API TÀI KHOẢN ---------------- //
app.post('/api/register', (req, res) => {
    const { phone, password, name } = req.body;
    const exists = users.find(u => u.phone === phone);
    
    if (exists) {
        return res.json({ success: false, message: 'Số điện thoại này đã được đăng ký!' });
    }
    
    users.push({ phone, password, name });
    res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
});

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
    const { name, price, category, description, image, sellerName, sellerPhone } = req.body;
    const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        category, name, price: parseInt(price), description, image, sellerName, sellerPhone
    };
    products.push(newProduct);
    io.emit('new_product_added', newProduct); // Báo cho mọi người có hàng mới
    res.json({ success: true, message: 'Đăng sản phẩm thành công!' });
});

// ---------------- API TIN NHẮN ---------------- //
app.get('/api/messages/:phone', (req, res) => {
    const phone = req.params.phone;
    const myMsgs = dbMessages.filter(m => m.senderPhone === phone || m.receiverPhone === phone);
    res.json(myMsgs);
});

// ---------------- HỆ THỐNG SOCKET.IO (CHAT) ---------------- //
io.on('connection', (socket) => {
    socket.on('user_login', (phone) => {
        socket.join(phone);
    });

    socket.on('send_private_message', (data) => {
        dbMessages.push(data); // Lưu vào máy chủ
        io.to(data.receiverPhone).emit('receive_message', data); // Gửi người nhận
        if (data.senderPhone !== data.receiverPhone) {
            io.to(data.senderPhone).emit('receive_message', data); // Gửi lại người gửi
        }
    });
});

http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});