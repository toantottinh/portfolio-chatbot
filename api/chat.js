// Đây là hàm xử lý chính của Backend (Serverless)
module.exports = async function handler(req, res) {
    // 1. Chỉ chấp nhận các yêu cầu (request) dạng POST từ Frontend gửi lên
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
    }

    // 2. Lấy câu hỏi do Frontend gửi lên (nằm trong body của request)
    const userText = req.body.text; 

    // 3. LẤY API KEY BÍ MẬT
    // process.env là nơi an toàn chứa các biến môi trường. 
    // Hacker không thể F12 để xem được biến này!
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Báo động: Chưa cấu hình API Key trên Server!' });
    }

    // 4. Chuẩn bị System Prompt (Bộ não của AI)
    const systemPrompt = `Bạn là trợ lý ảo của Nguyễn Hiếu Toàn, một sinh viên năm nhất ngành CNTT định hướng Backend và Data Engineering. 
    Nhiệm vụ của bạn là trả lời ngắn gọn, lịch sự các câu hỏi của nhà tuyển dụng về Toàn.
    Thông tin của Toàn:
    - Kỹ năng: Python, C, MySQL, JavaScript cơ bản, thao tác tốt trên Linux (WSL).
    - Dự án: Web App Học Từ Vựng (có dùng API), Portfolio cá nhân.
    - Tính cách: Thích đào sâu logic hệ thống, chịu khó tìm hiểu tận gốc rễ vấn đề.
    Nếu được hỏi những thứ ngoài lề không liên quan đến Toàn, hãy từ chối khéo léo.
    
    Câu hỏi của nhà tuyển dụng: ${userText}`;

    // 5. Backend đứng ra gọi API của Google thay cho Frontend
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error.message || "Lỗi kết nối từ Google");
        }

        // Bóc tách lấy câu trả lời
        const aiReply = data.candidates[0].content.parts[0].text;

        // 6. Trả câu trả lời (dạng JSON) về lại cho Frontend
        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error("Lỗi Server:", error);
        return res.status(500).json({ error: 'Máy chủ AI đang bận, vui lòng thử lại sau.' });
    }
}