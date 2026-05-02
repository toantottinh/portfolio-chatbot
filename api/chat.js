// Đây là hàm xử lý chính của Backend (Serverless)
module.exports = async function handler(req, res) {
    // 1. Chỉ chấp nhận các yêu cầu (request) dạng POST từ Frontend gửi lên
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
    }

    // 2. Lấy câu hỏi do Frontend gửi lên (nằm trong body của request)
    const { text: userText, history } = req.body;

    // 3. LẤY API KEY BÍ MẬT
    // process.env là nơi an toàn chứa các biến môi trường. 
    // Hacker không thể F12 để xem được biến này!
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Báo động: Chưa cấu hình API Key trên Server!' });
    }

    // 4. Chuẩn bị System Prompt (Bộ não của AI)
    // Cập nhật tính cách mới: Trợ lý học tập cá nhân độc quyền của Toàn
    const systemPrompt = `Bạn là trợ lý học tập cá nhân độc quyền của Nguyễn Hiếu Toàn (sinh viên năm nhất ngành CNTT, trường Đại học Thái Bình Dương, sinh 8/5/2007). Mục tiêu nghề nghiệp của Toàn là Backend Developer và Data Engineer (tập trung vào Python, SQL). Mục tiêu ngoại ngữ là TOEIC 700+. Nguyên tắc trả lời của bạn: 1. Ngắn gọn, đi thẳng vào vấn đề theo tư duy logic của hệ thống. Không lan man. 2. Xưng hô là "mình" và gọi người dùng là "Bạn". 3. BẮT BUỘC: Khi giải thích các khái niệm IT, hãy cung cấp kèm theo từ vựng tiếng Anh chuyên ngành để Toàn luyện thi TOEIC. 4. Các sở thích cá nhân: đá bóng, chơi game, đạp xe, ca hát, xem phim. 5. Ngoại hình: cao 1m75, cân nặng: 63, rất đẹp trai.6. Ước mơ: Trở thành đại gia có nhiều em ghệ theo đuổi.`;

    // 5. Backend đứng ra gọi API của Google thay cho Frontend
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: systemPrompt
                    }]
                },
                contents: history
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Kiểm tra nếu là lỗi 429 (Too Many Requests) hoặc lỗi liên quan đến Quota
            if (response.status === 429 || (data.error && data.error.message.includes("quota"))) {
                throw new Error("AI đang nhận quá nhiều tin nhắn (Vượt giới hạn miễn phí). Toàn đợi khoảng 30 giây rồi gửi lại nha!");
            }
            
            // Bắt các lỗi khác
            throw new Error(data.error?.message || "Lỗi kết nối từ Google");
        }

        // Bóc tách lấy câu trả lời
        const aiReply = data.candidates[0].content.parts[0].text;

        // 6. Trả câu trả lời (dạng JSON) về lại cho Frontend
        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error("Lỗi Server:", error);
        // Trả về đúng message lỗi đã catch ở trên để Frontend hiển thị cho người dùng
        return res.status(500).json({ error: error.message || 'Máy chủ AI đang bận, vui lòng thử lại sau.' });
    }
}