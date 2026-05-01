let chatHistory = [];
document.addEventListener('DOMContentLoaded', function () {
    // Lấy các phần tử (elements) từ HTML thông qua ID
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    if (!toggleBtn || !chatbotContainer || !chatInput || !sendBtn || !chatHistory) {
        console.error('Không tìm thấy một hoặc nhiều phần tử HTML cần thiết cho chatbot.');
        return;
    }

    toggleBtn.addEventListener('click', function () {
        chatbotContainer.classList.toggle('show-chat');

        if (chatbotContainer.classList.contains('show-chat')) {
            toggleBtn.innerText = '❌ Đóng Chat';
        } else {
            toggleBtn.innerText = '💬 Hỏi AI về Toàn';
        }
    });

    async function sendMessage() {
        const userText = chatInput.value.trim();
        if (userText === '') return;

        const userMsgElement = document.createElement('div');
        userMsgElement.classList.add('chat-message', 'user-message');
        userMsgElement.innerHTML = `<strong>Bạn:</strong> ${userText}`;
        chatHistory.appendChild(userMsgElement);

        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;

        const aiMsgElement = document.createElement('div');
        aiMsgElement.classList.add('chat-message', 'ai-message');
        aiMsgElement.innerHTML = `<strong>AI:</strong> Đang suy nghĩ...`;
        chatHistory.appendChild(aiMsgElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            chatHistory.push({
                role: "user",
                parts: [{ text: userText }]
            });
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: userText,
                    history: chatHistory
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

            if (!response.ok) {
                const message = data?.error || data?.message || response.statusText || 'Lỗi Server nội bộ';
                throw new Error(message);
            }

            const replyText = data?.reply || 'Không nhận được phản hồi từ server.';
            chatHistory.push({
                role: "model",
                parts: [{ text: replyText }]
            });
            aiMsgElement.innerHTML = `<strong>AI:</strong> ${replyText.replace(/\n/g, '<br>')}`;
        } catch (error) {
            console.error('Chi tiết lỗi code:', error);
            aiMsgElement.innerHTML = `<strong>Lỗi:</strong> ${error.message || 'Đã xảy ra lỗi khi gửi tin nhắn.'}`;
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
}); 