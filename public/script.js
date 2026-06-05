const socket = io();
let currentUsername = "";
let cart = [];
let dbProducts = [];
let chatReceiver = ""; // Biến vô cùng quan trọng: Nhớ xem mình đang chat với AI

window.onload = async function() {
    try {
        const response = await fetch('/api/products');
        dbProducts = await response.json();
        renderProducts();
    } catch (error) {
        console.error("Lỗi:", error);
    }
    
    const savedName = localStorage.getItem("ufm_username");
    if (savedName) {
        currentUsername = savedName;
        document.getElementById("user-display").innerText = "🙋 " + currentUsername;
        document.getElementById("login-modal").style.display = "none";
        
        // Báo cho Server biết mình vừa online để Server tạo phòng chat riêng
        socket.emit('user_login', currentUsername);
    }
};

function handleLogin() {
    const nameInput = document.getElementById("username-input").value.trim();
    const mssvInput = document.getElementById("mssv-input").value.trim();

    if (!nameInput || !mssvInput) {
        alert("Vui lòng nhập Tên và MSSV!");
        return;
    }

    currentUsername = `${nameInput} (MSSV: ${mssvInput})`;
    localStorage.setItem("ufm_username", currentUsername);
    document.getElementById("user-display").innerText = "🙋 " + currentUsername;
    document.getElementById("login-modal").style.display = "none";

    // Báo cho Server biết mình vừa online
    socket.emit('user_login', currentUsername);
}

function handleLogout() {
    localStorage.removeItem("ufm_username");
    location.reload();
}

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
        // Bổ sung dòng hiển thị tên người bán (p.seller)
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">👤 Bán bởi: <b>${p.seller}</b></p>
            <div class="price">${p.price.toLocaleString()}đ</div>
            <button onclick="addToCart(${p.id})">Thêm vào đơn</button>
        `;

        if (p.category === 'tai-lieu' && taiLieuGrid) taiLieuGrid.appendChild(card);
        else if (p.category === 'tro' && troGrid) troGrid.appendChild(card);
        else if (p.category === 'viec-lam' && viecLamGrid) viecLamGrid.appendChild(card);
    });
}

// ---------------- CÁC HÀM GIỎ HÀNG ---------------- //
function addToCart(id) {
    const product = dbProducts.find(p => p.id === id);
    // Để đơn giản cho MVP: Ép người mua chỉ được mua của 1 người cùng lúc để chat không bị loạn
    if (cart.length > 0 && cart[0].seller !== product.seller) {
        alert("⚠️ Bạn đang có sản phẩm của người khác trong giỏ. Vui lòng thanh toán hoặc xóa giỏ hàng trước khi mua của người mới!");
        return;
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
    // Nếu xóa hết giỏ hàng thì reset người nhận chat
    if(cart.length === 0) {
        chatReceiver = "";
        document.querySelector('.chat-container div').innerText = "💬 Khung Chat Riêng Tư";
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

// ---------------- CHAT & KẾT NỐI ---------------- //
function sendCartToChat() {
    if (cart.length === 0) {
        alert("Giỏ hàng đang trống!"); return;
    }
    
    // KHÓA MỤC TIÊU: Lấy tên người bán từ món hàng đầu tiên trong giỏ
    chatReceiver = cart[0].seller;
    
    // Đổi tiêu đề khung chat để khách biết mình đang chat với ai
    document.querySelector('.chat-container div').innerHTML = `💬 Đang chat với: <b>${chatReceiver}</b>`;

    let orderText = `Chào bạn, mình muốn trao đổi về đơn hàng này:\n`;
    let total = 0;
    cart.forEach(item => {
        orderText += `- ${item.name} (SL: ${item.quantity})\n`;
        total += item.price * item.quantity;
    });
    orderText += `💰 Tổng: ${total.toLocaleString()}đ`;
    
    document.getElementById("chat-input").value = orderText;
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    if (!chatReceiver) {
        alert("Bạn phải thêm hàng vào giỏ và bấm 'Gửi đơn vào khung chat' để xác định người bán trước khi nhắn tin!");
        return;
    }

    // Gửi tin nhắn có ĐỊA CHỈ NHẬN CỤ THỂ
    socket.emit("send_private_message", {
        sender: currentUsername,
        receiver: chatReceiver,
        text: text
    });
    input.value = ""; 
}

socket.on("receive_message", (data) => {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    
    // Nếu tin nhắn gửi đến là của người khác gửi cho mình, tự động đổi khung chat sang tên họ
    if(data.sender !== currentUsername) {
        chatReceiver = data.sender;
        document.querySelector('.chat-container div').innerHTML = `💬 Đang chat với: <b>${chatReceiver}</b>`;
    }

    // Phân biệt màu sắc: Tin của mình màu cam, tin của khách màu xám
    if (data.sender === currentUsername) {
        msgDiv.className = "message shop-message";
        msgDiv.innerHTML = `<strong>Mình:</strong> <span class="msg-text">${data.text}</span>`;
    } else {
        msgDiv.className = "message customer-message";
        msgDiv.innerHTML = `<strong>👤 ${data.sender}:</strong> <span class="msg-text">${data.text}</span>`;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// ---------------- TÍNH NĂNG ĐĂNG BÁN ---------------- //
async function submitProduct() {
    const name = document.getElementById("post-name").value.trim();
    const price = document.getElementById("post-price").value.trim();
    const category = document.getElementById("post-category").value;
    const image = document.getElementById("post-image").value.trim();

    if (!name || !price) { alert("Nhập đủ tên và giá!"); return; }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // CỰC KỲ QUAN TRỌNG: Gửi kèm currentUsername làm 'seller'
            body: JSON.stringify({ name, price, category, image, seller: currentUsername })
        });

        const result = await response.json();
        if (result.success) {
            alert(result.message);
            document.getElementById("post-modal").style.display = "none";
            document.getElementById("post-name").value = "";
            document.getElementById("post-price").value = "";
        }
    } catch (error) { console.error(error); }
}

socket.on("new_product_added", (newProduct) => {
    dbProducts.push(newProduct);
    renderProducts();
});

function filterCategory(category, element) { /* ... giữ nguyên code cũ ... */ }
function handleSearch() { /* ... giữ nguyên code cũ ... */ }