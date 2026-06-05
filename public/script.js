const socket = io();
let currentUsername = "";
let cart = [];
let dbProducts = []; // Dữ liệu sẽ được lấy từ Server API

// Hàm chạy ngay khi mở trang web
window.onload = async function() {
    // 1. Lấy dữ liệu sản phẩm thực tế từ Backend
    try {
        const response = await fetch('/api/products');
        dbProducts = await response.json();
        renderProducts();
    } catch (error) {
        console.error("Không thể lấy dữ liệu sản phẩm từ server:", error);
    }
    
    // 2. Kiểm tra xem máy đã lưu tên từ trước chưa
    const savedName = localStorage.getItem("ufm_username");
    if (savedName) {
        currentUsername = savedName;
        document.getElementById("user-display").innerText = "🙋 Xin chào: " + currentUsername;
        document.getElementById("login-modal").style.display = "none"; // Ẩn bảng đăng nhập
    }
};

// Hàm đổ sản phẩm ra giao diện theo từng danh mục
// Hàm đổ sản phẩm ra giao diện (Có hỗ trợ tìm kiếm)
function renderProducts(productsToRender = dbProducts) {
    const taiLieuGrid = document.getElementById("tai-lieu-grid");
    const troGrid = document.getElementById("tro-grid");
    const viecLamGrid = document.getElementById("viec-lam-grid");

    // Xóa nội dung cũ trước khi render
    if(taiLieuGrid) taiLieuGrid.innerHTML = "";
    if(troGrid) troGrid.innerHTML = "";
    if(viecLamGrid) viecLamGrid.innerHTML = "";

    // Nếu không có sản phẩm nào khớp
    if (productsToRender.length === 0) {
        if(taiLieuGrid) taiLieuGrid.innerHTML = "<p style='color: #888;'>Không tìm thấy sản phẩm phù hợp.</p>";
        return;
    }

    productsToRender.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <div class="price">${p.price.toLocaleString()}đ</div>
            <button onclick="addToCart(${p.id})">Thêm vào đơn</button>
        `;

        if (p.category === 'tai-lieu' && taiLieuGrid) taiLieuGrid.appendChild(card);
        else if (p.category === 'tro' && troGrid) troGrid.appendChild(card);
        else if (p.category === 'viec-lam' && viecLamGrid) viecLamGrid.appendChild(card);
    });
}
// HÀM TÌM KIẾM SẢN PHẨM (MỚI)
function handleSearch() {
    // 1. Lấy từ khóa khách hàng nhập vào (chuyển thành chữ thường để dễ so sánh)
    const keyword = document.getElementById("search-input").value.toLowerCase().trim();

    // 2. Nếu khách xóa trắng ô tìm kiếm rồi ấn Enter -> Hiện lại tất cả
    if (!keyword) {
        renderProducts(dbProducts);
        return;
    }

    // 3. Lọc ra những sản phẩm có chứa từ khóa trong tên
    const filteredProducts = dbProducts.filter(p => 
        p.name.toLowerCase().includes(keyword)
    );

    // 4. In kết quả đã lọc ra màn hình
    renderProducts(filteredProducts);

    // 5. Chuyển tab về "Tất cả" để khách hàng thấy được toàn bộ kết quả vừa tìm
    const tabTatCa = document.querySelector('.tab-btn'); // Lấy nút tab đầu tiên (Tất cả)
    filterCategory('all', tabTatCa);
}
// Xử lý đăng nhập nhập tên
function handleLogin() {
    const nameInput = document.getElementById("username-input").value.trim();
    if (!nameInput) {
        alert("Vui lòng nhập tên của bạn để tiếp tục!");
        return;
    }
    currentUsername = nameInput;
    localStorage.setItem("ufm_username", currentUsername);
    document.getElementById("user-display").innerText = "🙋 Xin chào: " + currentUsername;
    document.getElementById("login-modal").style.display = "none";
}

// Xử lý đăng xuất / Đổi tên tài khoản khác
function handleLogout() {
    localStorage.removeItem("ufm_username");
    location.reload();
}

// Thêm vào giỏ hàng
function addToCart(id) {
    const product = dbProducts.find(p => p.id === id);
    const exist = cart.find(item => item.id === id);
    if (exist) {
        exist.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
}

// Hàm thay đổi số lượng (+/-) trực tiếp trong giỏ hàng
function changeQuantity(id, amount) {
    const item = cart.find(p => p.id === id);
    if (!item) return;

    item.quantity += amount;
    
    // Nếu số lượng giảm xuống 0, tự động xóa khỏi giỏ
    if (item.quantity <= 0) {
        removeFromCart(id);
        return;
    }
    updateCartUI();
}

// Hàm xóa sản phẩm khỏi giỏ hàng
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

// Cập nhật giao diện giỏ hàng
function updateCartUI() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const totalPrice = document.getElementById("total-price");
    
    cartItems.innerHTML = "";
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `<p style="color: #999; font-size: 14px; margin: 0;">Chưa có sản phẩm nào được chọn.</p>`;
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;
            
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "8px 0";
            li.style.borderBottom = "1px dashed #ddd";

            li.innerHTML = `
                <div style="flex: 1; padding-right: 10px; font-size: 13px;">
                    <strong>${item.name}</strong>
                    <div style="color: #666;">${item.price.toLocaleString()}đ</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <button onclick="changeQuantity(${item.id}, -1)" style="padding: 2px 6px; cursor:pointer;">-</button>
                    <span style="font-weight:bold; min-width: 20px; text-align:center;">${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)" style="padding: 2px 6px; cursor:pointer;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="margin-left: 8px; background: none; border: none; color: #ff4d4f; cursor: pointer; font-size: 12px;">❌ Xóa</button>
                </div>
            `;
            cartItems.appendChild(li);
        });
    }

    cartCount.innerText = count;
    totalPrice.innerText = total.toLocaleString() + "đ";
}

// Gửi thông tin đơn hàng định mua vào ô chat riêng tư
function sendCartToChat() {
    if (cart.length === 0) {
        alert("Giỏ hàng của bạn đang trống!");
        return;
    }
    let orderText = "Chào Shop, mình muốn trao đổi về mục này:\n";
    let total = 0;
    cart.forEach(item => {
        orderText += `- ${item.name} (SL: ${item.quantity})\n`;
        total += item.price * item.quantity;
    });
    orderText += `💰 Tổng tiền ước tính: ${total.toLocaleString()}đ`;
    
    // Đẩy text đơn hàng vào ô input chat để khách bấm gửi
    document.getElementById("chat-input").value = orderText;
    alert("Đã tạo mẫu tin nhắn thương lượng! Hãy bấm nút 'Gửi' ở khung chat.");
}

// Gửi tin nhắn qua Socket.io
function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    // Gửi tin nhắn lên server Node.js kèm theo tên người gửi
    socket.emit("send_message", {
        sender: currentUsername,
        text: text
    });
    input.value = ""; // Xóa trống ô nhập
}

// Nhận tin nhắn từ Server và hiển thị lên màn hình chat
socket.on("receive_message", (data) => {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    
    // Tách biệt màu sắc hiển thị giữa khách và chủ shop
    if (data.sender.toLowerCase() === "chủ shop" || data.sender.toLowerCase() === "admin") {
        msgDiv.className = "message shop-message";
        msgDiv.innerHTML = `<span class="shop-badge">👉 [CHỦ SHOP]</span><strong>${data.sender}:</strong> <span class="msg-text">${data.text}</span>`;
    } else {
        msgDiv.className = "message customer-message";
        msgDiv.innerHTML = `<strong>👤 ${data.sender}:</strong> <span class="msg-text">${data.text}</span>`;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Cuộn tin nhắn mới lên
});

// HÀM LỌC SẢN PHẨM THEO DANH MỤC
function filterCategory(category, element) {
    // 1. Đổi hiệu ứng màu sắc "Active" cho nút được bấm
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');

    // 2. Lấy tất cả các khối danh mục trên màn hình
    const taiLieuSec = document.getElementById('tai-lieu-section');
    const troSec = document.getElementById('tro-section');
    const viecLamSec = document.getElementById('viec-lam-section');

    // Nếu không tìm thấy phần tử thì bỏ qua để tránh lỗi
    if (!taiLieuSec || !troSec || !viecLamSec) return;

    // 3. Xử lý ẩn hiện dựa theo Tab được click
    if (category === 'all') {
        taiLieuSec.style.display = 'block';
        troSec.style.display = 'block';
        viecLamSec.style.display = 'block';
    } else {
        // Ẩn tất cả đi trước
        taiLieuSec.style.display = 'none';
        troSec.style.display = 'none';
        viecLamSec.style.display = 'none';

        // Chỉ hiện khối được chọn
        if (category === 'tai-lieu') taiLieuSec.style.display = 'block';
        if (category === 'tro') troSec.style.display = 'block';
        if (category === 'viec-lam') viecLamSec.style.display = 'block';
    }
}
// ====================================================================
// TÍNH NĂNG ĐĂNG BÁN SẢN PHẨM & REAL-TIME
// ====================================================================

// Hàm gửi thông tin sản phẩm lên Server
async function submitProduct() {
    const name = document.getElementById("post-name").value.trim();
    const price = document.getElementById("post-price").value.trim();
    const category = document.getElementById("post-category").value;
    const image = document.getElementById("post-image").value.trim();

    if (!name || !price) {
        alert("Vui lòng nhập đầy đủ tên và giá sản phẩm!");
        return;
    }

    // Gửi data lên API vừa tạo
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price, category, image })
        });

        const result = await response.json();
        if (result.success) {
            alert(result.message);
            // Ẩn bảng và xóa trắng form
            document.getElementById("post-modal").style.display = "none";
            document.getElementById("post-name").value = "";
            document.getElementById("post-price").value = "";
            document.getElementById("post-image").value = "";
        }
    } catch (error) {
        alert("Có lỗi xảy ra khi đăng bán!");
        console.error(error);
    }
}

// Lắng nghe khi có người khác vừa đăng sản phẩm mới
socket.on("new_product_added", (newProduct) => {
    // 1. Thêm sản phẩm mới vào danh sách hiện tại của máy mình
    dbProducts.push(newProduct);
    
    // 2. Vẽ lại toàn bộ giao diện sản phẩm
    renderProducts();

    // (Tùy chọn) Hiện thông báo nhỏ góc màn hình giống Shopee
    console.log(`🎉 Có sản phẩm mới được đăng: ${newProduct.name}`);
});