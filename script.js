// Sự kiện 'DOMContentLoaded' đảm bảo toàn bộ mã HTML đã được tải xong trước khi chạy JavaScript.
document.addEventListener('DOMContentLoaded', function () {
    // Mảng lưu trữ lịch sử trò chuyện để gửi kèm lên server, giúp AI nhớ được ngữ cảnh câu hỏi trước đó.
    let messageHistory = [];
    
    // Lấy các phần tử (elements) từ giao diện HTML thông qua ID để thao tác
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn'); // Lấy nút Xóa trò chuyện
    const chatHistory = document.getElementById('chat-history');

    // Bỏ clearBtn ra khỏi điều kiện bắt buộc để tránh sập code nếu bạn lỡ quên chưa save file HTML
    if (!toggleBtn || !chatbotContainer || !chatInput || !sendBtn || !chatHistory) {
        console.error('Không tìm thấy một hoặc nhiều phần tử HTML cần thiết cho chatbot.');
        return;
    }

    // Hàm giúp chống XSS (Cross-Site Scripting). 
    // Nếu người dùng nhập mã độc (VD: <script>alert(1)</script>), hàm này sẽ biến các dấu <, > thành text bình thường.
    function escapeHTML(str) {
        if (!str) return ''; // Ngăn lỗi nếu biến str bị rỗng hoặc undefined
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 1) KIỂM TRA VÀ TẢI LỊCH SỬ TỪ LOCAL STORAGE KHI LOAD TRANG
    let savedHistory = null;
    try {
        savedHistory = localStorage.getItem('chatHistory');
    } catch (e) {
        console.warn('Cảnh báo: Trình duyệt chặn localStorage, bỏ qua tính năng lưu lịch sử.');
    }

    if (savedHistory) {
        try {
            messageHistory = JSON.parse(savedHistory);
            chatHistory.innerHTML = ''; // Xóa câu chào mặc định ban đầu để in lại toàn bộ lịch sử
            messageHistory.forEach(msg => {
                const msgElement = document.createElement('div');
                msgElement.classList.add('chat-message');
                if (msg.role === 'user') {
                    msgElement.classList.add('user-message');
                    msgElement.innerHTML = `<strong>Bạn:</strong> ${escapeHTML(msg.parts[0].text)}`;
                } else if (msg.role === 'model') {
                    msgElement.classList.add('ai-message');
                    msgElement.innerHTML = `<strong>AI:</strong> ${escapeHTML(msg.parts[0].text).replace(/\n/g, '<br>')}`;
                }
                chatHistory.appendChild(msgElement);
            });
            chatHistory.scrollTop = chatHistory.scrollHeight; // Cuộn ngay xuống cuối tin nhắn
        } catch (error) {
            console.error('Lỗi khi parse lịch sử chat:', error);
            messageHistory = [];
        }
    }

    // Lắng nghe sự kiện click vào nút "Hỏi AI về Toàn" để bật/tắt khung chat
    toggleBtn.addEventListener('click', function () {
        chatbotContainer.classList.toggle('show-chat');

        if (chatbotContainer.classList.contains('show-chat')) {
            toggleBtn.innerText = '❌ Đóng Chat';
        } else {
            toggleBtn.innerText = '💬 Hỏi AI về Toàn';
        }
    });

    // Hàm xử lý logic chính khi người dùng gửi tin nhắn
    async function sendMessage() {
        const userText = chatInput.value.trim();
        if (userText === '') return; // Không làm gì nếu người dùng chỉ nhập khoảng trắng

        // TỐI ƯU 1: Vô hiệu hóa input và nút gửi khi đang chờ AI phản hồi để tránh người dùng click spam liên tục
        chatInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.innerText = 'Đang gửi...';

        // Tạo thẻ div chứa tin nhắn của người dùng và hiển thị lên giao diện
        const userMsgElement = document.createElement('div');
        userMsgElement.classList.add('chat-message', 'user-message');
        // TỐI ƯU 2: Sử dụng escapeHTML để làm sạch dữ liệu đầu vào
        userMsgElement.innerHTML = `<strong>Bạn:</strong> ${escapeHTML(userText)}`;
        chatHistory.appendChild(userMsgElement);

        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Tạo thẻ div cho AI và hiển thị hiệu ứng "Đang gõ chữ..." (typing indicator)
        const aiMsgElement = document.createElement('div');
        aiMsgElement.classList.add('chat-message', 'ai-message');
        aiMsgElement.innerHTML = `<strong>AI:</strong> <div class="typing-indicator"><span></span><span></span><span></span></div>`;
        chatHistory.appendChild(aiMsgElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Bắt đầu gửi dữ liệu lên Backend xử lý
        try {
            // Cập nhật lịch sử chat với câu hỏi mới của người dùng
            messageHistory.push({
                role: "user",
                parts: [{ text: userText }]
            });
            // 2) Lưu đè mảng mới vào localStorage sau khi User gửi tin nhắn (bọc try-catch chống lỗi)
            try { localStorage.setItem('chatHistory', JSON.stringify(messageHistory)); } catch (e) {}
            
            // Gọi API nội bộ của chúng ta (file /api/chat.js)
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: userText,
                    history: messageHistory
                })
            }); 

            const text = await response.text();     
            let data = {};
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.warn('Không thể parse JSON từ response:', text, parseError);
                }
            }

            // Kiểm tra xem server có trả về lỗi không (HTTP status khác 2xx)
            if (!response.ok) {
                let errorMsg = 'Lỗi Server nội bộ';
                if (data && data.error) {
                    errorMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
                } else if (data && data.message) {
                    errorMsg = data.message;
                } else {
                    errorMsg = response.statusText;
                }
                throw new Error(errorMsg);
            }

            // Lấy câu trả lời thành công từ server
            const replyText = data?.reply || 'Không nhận được phản hồi từ server.';
            
            // Cập nhật câu trả lời của AI vào lịch sử chat
            messageHistory.push({
                role: "model",
                parts: [{ text: replyText }]
            });
            // 2) Lưu đè mảng mới vào localStorage sau khi AI trả lời
            try { localStorage.setItem('chatHistory', JSON.stringify(messageHistory)); } catch (e) {}
            
            // Hiển thị câu trả lời lên giao diện, thay thế hiệu ứng "đang gõ..."
            // Đồng thời dùng escapeHTML và chuyển ký tự xuống dòng (\n) thành thẻ <br> của HTML
            aiMsgElement.innerHTML = `<strong>AI:</strong> ${escapeHTML(replyText).replace(/\n/g, '<br>')}`;
        } catch (error) {
            console.error('Chi tiết lỗi code:', error);
            aiMsgElement.innerHTML = `<strong>Lỗi:</strong> ${error.message || 'Đã xảy ra lỗi khi gửi tin nhắn.'}`;
        } finally {
            // TỐI ƯU 3: Khối finally luôn được chạy cuối cùng dù khối 'try' thành công hay nhảy vào 'catch' (bị lỗi)
            // Chức năng: Bật lại input và nút gửi cho người dùng chat tiếp
            chatInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerText = 'Gửi';
            chatInput.focus(); // Tự động đưa con trỏ chuột quay lại ô nhập liệu
        }

        // Luôn cuộn xuống dòng tin nhắn mới nhất
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Gắn sự kiện click cho nút Gửi
    sendBtn.addEventListener('click', sendMessage);
    
    // Gắn sự kiện nhấn phím Enter khi đang nhập text
    chatInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Lắng nghe sự kiện click cho nút Xóa trò chuyện
    // Kiểm tra nếu nút này thực sự tồn tại trong HTML thì mới gắn sự kiện
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            try { localStorage.removeItem('chatHistory'); } catch (e) {} // 1) Xóa khỏi bộ nhớ
            messageHistory = [];                    // 2) Reset mảng
            
            // 3) Khôi phục HTML
            chatHistory.innerHTML = '<p><strong>AI:</strong> Chào bạn, tôi có thể cung cấp thêm thông tin gì về định hướng Backend và các kỹ năng của Toàn?</p>';
        });
    }
});