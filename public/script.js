const socket = io();
let currentUser = null; // Sẽ chứa: { phone, name }
let cart = [];
let dbProducts = [];
let chatReceiverPhone = ""; 
let chatReceiverName = "";

window.onload = async function() {
    try {
        const response = await fetch('/api/products');
        dbProducts = await response.json();
        renderProducts();
    } catch (error) { console.error(error); }
    
    // Kiểm tra phiên đăng nhập
    const savedUser = localStorage.getItem("ufm_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupUserInterface();
    }
};

// ---------------- HỆ THỐNG TÀI KHOẢN ---------------- //
function toggleAuth(type) {
    document.getElementById('login-section').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('register-section').style.display = type === 'register' ? 'block' : 'none';
}

async function handleRegister() {
    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (!name || !phone || !password) return alert("Vui lòng nhập đủ thông tin!");

    const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    alert(data.message);
    if (data.success) toggleAuth('login'); // Chuyển qua tab đăng nhập
}

async function handleLogin() {
    const phone = document.getElementById("login-phone").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!phone || !password) return alert("Vui lòng nhập SĐT và Mật khẩu!");

    const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    
    if (data.success) {
        currentUser = data.user;
        localStorage.setItem("ufm_user", JSON.stringify(currentUser));
        setupUserInterface();
    } else {
        alert(data.message);
    }
}

function setupUserInterface() {
    document.getElementById("user-display").innerText = "🙋 " + currentUser.name;
    document.getElementById("auth-modal").style.display = "none";
    socket.emit('user_login', currentUser.phone); // Đăng ký sđt với Server để nhận tin nhắn
    
    // TẢI LỊCH SỬ TIN NHẮN KHI VỪA ĐĂNG NHẬP
    fetchMyMessages();
}

function handleLogout() {
    localStorage.removeItem("ufm_user");
    location.reload();
}

// ---------------- GIAO DIỆN & SẢN PHẨM ---------------- //
function renderProducts(productsToRender = dbProducts) {
    const taiLieuGrid = document.getElementById("tai-lieu-grid");
    const troGrid = document.getElementById("tro-grid");
    const viecLamGrid = document.getElementById("viec-lam-grid");

    if(taiLieuGrid) taiLieuGrid.innerHTML = "";
    if(troGrid) troGrid.innerHTML = "";
    if(viecLamGrid) viecLamGrid.innerHTML = "";

    productsToRender.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">👤 Bán bởi: <b>${p.sellerName}</b></p>
            <div class="price">${p.price.toLocaleString()}đ</div>
            <button onclick="addToCart(${p.id})">Thêm vào đơn</button>
        `;
        if (p.category === 'tai-lieu' && taiLieuGrid) taiLieuGrid.appendChild(card);
        else if (p.category === 'tro' && troGrid) troGrid.appendChild(card);
        else if (p.category === 'viec-lam' && viecLamGrid) viecLamGrid.appendChild(card);
    });
}

// ---------------- GIỎ HÀNG ---------------- //
function addToCart(id) {
    if (!currentUser) return alert("Vui lòng đăng nhập để mua hàng!");
    
    const product = dbProducts.find(p => p.id === id);
    if (product.sellerPhone === currentUser.phone) {
        return alert("Bạn không thể tự mua hàng của chính mình!");
    }

    if (cart.length > 0 && cart[0].sellerPhone !== product.sellerPhone) {
        return alert("⚠️ Giỏ hàng chỉ chứa sản phẩm của 1 người bán cùng lúc để dễ chat!");
    }

    const exist = cart.find(item => item.id === id);
    if (exist) exist.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    updateCartUI();
}

function changeQuantity(id, amount) {
    const item = cart.find(p => p.id === id);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity <= 0) removeFromCart(id);
    else updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    if(cart.length === 0) {
        chatReceiverPhone = ""; chatReceiverName = "";
        document.getElementById('chat-header-name').innerText = "Chưa chọn người chat";
    }
}

function updateCartUI() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const totalPrice = document.getElementById("total-price");
    
    cartItems.innerHTML = "";
    let total = 0; let count = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `<p style="color: #999; font-size: 14px; margin: 0;">Chưa có sản phẩm nào.</p>`;
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;
            
            const li = document.createElement("li");
            li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";
            li.style.padding = "8px 0"; li.style.borderBottom = "1px dashed #ddd";
            li.innerHTML = `
                <div style="flex: 1; padding-right: 10px; font-size: 13px;">
                    <strong>${item.name}</strong>
                    <div style="color: #666;">${item.price.toLocaleString()}đ</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <button onclick="changeQuantity(${item.id}, -1)" style="padding: 2px 6px;">-</button>
                    <span style="font-weight:bold; min-width: 20px; text-align:center;">${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)" style="padding: 2px 6px;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="color: #ff4d4f; border:none; background:none; cursor:pointer;">❌</button>
                </div>
            `;
            cartItems.appendChild(li);
        });
    }
    cartCount.innerText = count;
    totalPrice.innerText = total.toLocaleString() + "đ";
}

// =================================================================
// HỆ THỐNG CHAT ĐA LUỒNG & LƯU LỊCH SỬ
// =================================================================
let myMessages = [];

// 1. Tải toàn bộ lịch sử từ Server
async function fetchMyMessages() {
    if (!currentUser) return;
    const res = await fetch('/api/messages/' + currentUser.phone);
    myMessages = await res.json();
    renderChatContacts();
}

// 2. Gom nhóm tin nhắn để tạo Danh sách hộp thoại
function renderChatContacts() {
    const contactMap = {};
    myMessages.forEach(msg => {
        if (msg.senderPhone !== currentUser.phone) {
            contactMap[msg.senderPhone] = msg.senderName;
        }
        if (msg.receiverPhone !== currentUser.phone) {
            contactMap[msg.receiverPhone] = msg.receiverName;
        }
    });

    const listUI = document.getElementById("chat-contact-list");
    if (!listUI) return;
    listUI.innerHTML = "";
    
    if (Object.keys(contactMap).length === 0) {
        listUI.innerHTML = `<p style="font-size: 11px; color: #888; text-align: center; margin-top: 10px;">Chưa có hộp thoại</p>`;
        return;
    }

    for (const [phone, name] of Object.entries(contactMap)) {
        listUI.innerHTML += `
            <div onclick="openChatHistory('${phone}', '${name}')" style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer; font-size: 12px; font-weight: bold; color: #333; transition: 0.2s;" onmouseover="this.style.background='#eee'" onmouseout="this.style.background='transparent'">
                👤 ${name}
            </div>`;
    }
}

// 3. Mở lịch sử chat với một người
function openChatHistory(phone, name) {
    chatReceiverPhone = phone;
    chatReceiverName = name;
    document.getElementById("chat-header-name").innerText = `Đang chat với: ${name}`;
    
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = ""; 
    
    const history = myMessages.filter(m => 
        (m.senderPhone === currentUser.phone && m.receiverPhone === phone) ||
        (m.senderPhone === phone && m.receiverPhone === currentUser.phone)
    );

    history.forEach(data => appendMessageToUI(data));
}

// 4. Vẽ tin nhắn lên màn hình
function appendMessageToUI(data) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    if (data.senderPhone === currentUser.phone) {
        msgDiv.className = "message shop-message";
        msgDiv.innerHTML = `<strong>Mình:</strong> <span class="msg-text">${data.text}</span>`;
    } else {
        msgDiv.className = "message customer-message";
        msgDiv.innerHTML = `<strong>${data.senderName}:</strong> <span class="msg-text">${data.text}</span>`;
    }
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 5. Gửi đơn hàng vào chat
function sendCartToChat() {
    if (cart.length === 0) return alert("Giỏ hàng đang trống!");
    
    chatReceiverPhone = cart[0].sellerPhone;
    chatReceiverName = cart[0].sellerName;
    
    // Ép hiện người bán lên cột danh sách bên trái nếu chưa từng chat
    if (!myMessages.find(m => m.senderPhone === chatReceiverPhone || m.receiverPhone === chatReceiverPhone)) {
        myMessages.push({ senderPhone: currentUser.phone, senderName: currentUser.name, receiverPhone: chatReceiverPhone, receiverName: chatReceiverName, text: "" });
        renderChatContacts();
    }
    
    openChatHistory(chatReceiverPhone, chatReceiverName);

    let orderText = `Chào bạn, mình muốn trao đổi về đơn hàng này:\n`;
    cart.forEach(item => { orderText += `- ${item.name} (SL: ${item.quantity})\n`; });
    document.getElementById("chat-input").value = orderText;
}

// 6. Gửi tin nhắn mới
function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !chatReceiverPhone) return;

    const newMsg = {
        senderPhone: currentUser.phone,
        senderName: