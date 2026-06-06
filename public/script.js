const socket = io();
let currentUser = null; 
let cart = [];
let dbProducts = [];
let myMessages = [];
let chatReceiverPhone = ""; 
let chatReceiverName = "";

window.onload = async function() {
    try {
        const response = await fetch('/api/products');
        dbProducts = await response.json();
        renderProducts(dbProducts);
    } catch (error) { console.error("Lỗi:", error); }
    
    const savedUser = localStorage.getItem("ufm_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setupUserInterface();
    }
};

// ---------------- TÀI KHOẢN ---------------- //
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
    if (data.success) toggleAuth('login');
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
    socket.emit('user_login', currentUser.phone); 
    fetchMyMessages(); 
}

function handleLogout() {
    localStorage.removeItem("ufm_user");
    currentUser = null;
    location.reload(); 
}

// ---------------- SẢN PHẨM & TÌM KIẾM ---------------- //
function renderProducts(productsToRender) {
    const grids = {
        'tai-lieu': document.getElementById("tai-lieu-grid"),
        'tro': document.getElementById("tro-grid"),
        'viec-lam': document.getElementById("viec-lam-grid")
    };

    Object.values(grids).forEach(g => { if(g) g.innerHTML = ""; });

    if (productsToRender.length === 0) {
        document.getElementById("tai-lieu-grid").innerHTML = "<p style='color: #888; grid-column: 1/-1;'>Chưa có sản phẩm nào. Hãy là người đầu tiên đăng bán!</p>";
        return;
    }

    productsToRender.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        const descText = p.description ? `<p style="font-size: 12px; color: #444; margin: 0 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">📝 <i>${p.description}</i></p>` : '';
        const imgUrl = p.image || 'https://via.placeholder.com/400x300?text=Chua+co+hinh+anh';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">👤 Người bán: <b>${p.sellerName}</b></p>
            ${descText}
            <div class="price" style="color: #ee4d2d; font-weight: bold; font-size: 18px; margin-bottom: 10px;">${parseInt(p.price).toLocaleString()}đ</div>
            <button onclick="addToCart(${p.id})">Thêm vào giỏ</button>
        `;
        if (grids[p.category]) grids[p.category].appendChild(card);
    });
}

function filterCategory(category, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');

    if (category === 'all') renderProducts(dbProducts);
    else renderProducts(dbProducts.filter(p => p.category === category));
}

function handleSearch() {
    const keyword = document.getElementById("search-input").value.toLowerCase().trim();
    if (!keyword) {
        renderProducts(dbProducts);
        return;
    }
    const filtered = dbProducts.filter(p => p.name.toLowerCase().includes(keyword) || (p.description && p.description.toLowerCase().includes(keyword)));
    renderProducts(filtered);
    if(filtered.length === 0) alert("Không tìm thấy sản phẩm nào!");
}

function openPostModal() {
    if (!currentUser) return alert("⚠️ Vui lòng đăng nhập để đăng bán!");
    document.getElementById('post-modal').style.display = 'flex';
}

async function submitProduct() {
    const name = document.getElementById("post-name").value.trim();
    const price = document.getElementById("post-price").value.trim();
    const description = document.getElementById("post-description").value.trim();
    const category = document.getElementById("post-category").value;
    const image = document.getElementById("post-image").value.trim();

    if (!name || !price) return alert("Vui lòng nhập đủ Tên và Giá!");

    try {
        const res = await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, description, category, image, sellerName: currentUser.name, sellerPhone: currentUser.phone })
        });
        const result = await res.json();
        if (result.success) {
            alert(result.message);
            document.getElementById("post-modal").style.display = "none";
            document.getElementById("post-name").value = "";
            document.getElementById("post-price").value = "";
            document.getElementById("post-description").value = "";
            document.getElementById("post-image").value = "";
        }
    } catch (error) { console.error(error); }
}

socket.on("new_product_added", (newProduct) => {
    dbProducts.push(newProduct);
    renderProducts(dbProducts); 
});

// ---------------- GIỎ HÀNG ---------------- //
function addToCart(id) {
    if (!currentUser) return alert("Vui lòng đăng nhập để mua hàng!");
    
    const product = dbProducts.find(p => p.id === id);
    if (product.sellerPhone === currentUser.phone) return alert("Bạn không thể tự mua hàng của chính mình!");
    
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
}

function updateCartUI() {
    const cartItems = document.getElementById("cart-items");
    cartItems.innerHTML = "";
    let total = 0; let count = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `<p style="color: #999; font-size: 14px; margin: 0;">Chưa có sản phẩm nào.</p>`;
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;
            cartItems.innerHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #ddd;">
                    <div style="flex: 1; padding-right: 10px; font-size: 13px;">
                        <strong>${item.name}</strong>
                        <div style="color: #666;">${parseInt(item.price).toLocaleString()}đ</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <button onclick="changeQuantity(${item.id}, -1)" style="padding: 2px 6px;">-</button>
                        <span style="font-weight:bold; min-width: 20px; text-align:center;">${item.quantity}</span>
                        <button onclick="changeQuantity(${item.id}, 1)" style="padding: 2px 6px;">+</button>
                        <button onclick="removeFromCart(${item.id})" style="color: #ff4d4f; border:none; background:none; cursor:pointer;">❌</button>
                    </div>
                </li>`;
        });
    }
    document.getElementById("cart-count").innerText = count;
    document.getElementById("total-price").innerText = total.toLocaleString() + "đ";
}

// ---------------- HỘP THƯ CHAT ĐA LUỒNG ---------------- //
async function fetchMyMessages() {
    if (!currentUser) return;
    const res = await fetch('/api/messages/' + currentUser.phone);
    myMessages = await res.json();
    renderChatContacts();
}

function renderChatContacts() {
    const contactMap = {};
    myMessages.forEach(msg => {
        if (msg.senderPhone !== currentUser.phone) contactMap[msg.senderPhone] = msg.senderName;
        if (msg.receiverPhone !== currentUser.phone) contactMap[msg.receiverPhone] = msg.receiverName;
    });

    const listUI = document.getElementById("chat-contact-list");
    listUI.innerHTML = "";
    
    if (Object.keys(contactMap).length === 0) {
        listUI.innerHTML = `<p style="font-size: 11px; color: #888; text-align: center; margin-top: 10px;">Chưa có hộp thoại</p>`;
        return;
    }

    for (const [phone, name] of Object.entries(contactMap)) {
        // Đánh dấu đậm cho người đang được chọn chat
        const isActive = phone === chatReceiverPhone ? "active" : "";
        listUI.innerHTML += `
            <div class="contact-item ${isActive}" onclick="openChatHistory('${phone}', '${name}')">
                👤 ${name}
            </div>`;
    }
}

function openChatHistory(phone, name) {
    chatReceiverPhone = phone;
    chatReceiverName = name;
    document.getElementById("chat-header-name").innerText = `Với: ${name}`;
    
    // Vẽ lại danh sách bên trái để highlight ô vừa chọn
    renderChatContacts();

    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = ""; 
    
    const history = myMessages.filter(m => 
        (m.senderPhone === currentUser.phone && m.receiverPhone === phone) ||
        (m.senderPhone === phone && m.receiverPhone === currentUser.phone)
    );

    history.forEach(data => appendMessageToUI(data));
}

function appendMessageToUI(data) {
    if(data.text.trim() === "") return; // Ẩn tin nhắn kích hoạt ảo
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message " + (data.senderPhone === currentUser.phone ? "shop-message" : "customer-message");
    msgDiv.innerHTML = `${data.text}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendCartToChat() {
    if (cart.length === 0) return alert("Giỏ hàng đang trống!");
    
    chatReceiverPhone = cart[0].sellerPhone;
    chatReceiverName = cart[0].sellerName;
    
    // Gửi 1 tin nhắn ảo để ép người bán này hiện ra cột danh sách bên trái
    if (!myMessages.find(m => m.senderPhone === chatReceiverPhone || m.receiverPhone === chatReceiverPhone)) {
        myMessages.push({ senderPhone: currentUser.phone, senderName: currentUser.name, receiverPhone: chatReceiverPhone, receiverName: chatReceiverName, text: "" });
    }
    
    openChatHistory(chatReceiverPhone, chatReceiverName);

    let orderText = `Chào bạn, mình quan tâm đơn hàng này:\n`;
    cart.forEach(item => { orderText += `- ${item.name} (SL: ${item.quantity})\n`; });
    document.getElementById("chat-input").value = orderText;
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !chatReceiverPhone) return;

    socket.emit("send_private_message", {
        senderPhone: currentUser.phone,
        senderName: currentUser.name,
        receiverPhone: chatReceiverPhone,
        receiverName: chatReceiverName,
        text: text
    });
    input.value = ""; 
}

socket.on("receive_message", (data) => {
    myMessages.push(data); 
    renderChatContacts();
    if ((data.senderPhone === chatReceiverPhone && data.receiverPhone === currentUser.phone) || (data.senderPhone === currentUser.phone && data.receiverPhone === chatReceiverPhone)) {
        appendMessageToUI(data);
    }
});