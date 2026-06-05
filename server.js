const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// DATABASE TẠM THỜI
let users = []; // Lưu tài khoản: { phone, password, name }
let dbMessages = []; // LƯU TIN NHẮN TẠM THỜI

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
    
    users