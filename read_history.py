import os
import re
from collections import Counter
from supabase import create_client, Client # Import the Supabase client (Khởi tạo client kết nối)

# 1. Configuration (Cấu hình)
# Retrieve environment variables (Lấy biến môi trường)
# Mẹo: Hãy đổi os.environ.get thành chuỗi string chứa URL/KEY thật của bạn.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "ĐIỀN_URL_CỦA_BẠN_VÀO_ĐÂY")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "ĐIỀN_KEY_CỦA_BẠN_VÀO_ĐÂY")

if SUPABASE_URL == "ĐIỀN_URL_CỦA_BẠN_VÀO_ĐÂY":
    print("Warning: Please configure SUPABASE_URL and SUPABASE_KEY (Vui lòng cấu hình URL và KEY).")
    exit()

try:
    # 2. Initialize connection (Khởi tạo kết nối)
    # Authenticate (xác thực) with Supabase using your credentials
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 3. Fetch data (Lấy dữ liệu)
    # .select("*") means extract all columns (Lấy tất cả các cột) từ bảng 'messages'
    response = supabase.table('messages').select("*").execute()
    messages_data = response.data

    # 4. Analyze data (Phân tích dữ liệu)
    total_user_messages = len(messages_data)
    all_topics = []

    # Iterate (lặp qua) các bản ghi để gom nhóm từ vựng
    for row in messages_data:
        user_msg = row.get('user_message', '')
        ai_msg = row.get('ai_message', '')
        
        # Combine messages (Kết hợp văn bản) để tìm chủ đề
        full_text = f"{user_msg} {ai_msg}".lower()
        
        # Extract (Trích xuất) bằng Regex: Chỉ lấy các từ không dấu (a-z) có chiều dài từ 4 ký tự.
        # Việc này giúp loại bỏ đa số tiếng Việt, giữ lại các thuật ngữ IT tiếng Anh như 'python', 'backend'
        words = re.findall(r'\b[a-z]{4,}\b', full_text)
        all_topics.extend(words)

    # 5. Output statistics (Xuất thống kê)
    print("="*50)
    print("📊 THỐNG KÊ LỊCH SỬ CHAT TỪ SUPABASE")
    print("="*50)
    print(f"👤 Tổng số câu Toàn đã chat: {total_user_messages} câu")
    
    # Count frequencies (Đếm tần suất xuất hiện) của từng chủ đề
    word_counts = Counter(all_topics)
    
    # Get the top 5 most common topics (Lấy 5 chủ đề phổ biến nhất)
    top_topics = word_counts.most_common(5)
    
    print("\n🏷️  Các chủ đề / thuật ngữ IT được chat nhiều nhất:")
    for word, count in top_topics:
        print(f"   - {word.capitalize()}: {count} lần")

except Exception as e:
    # Handle exceptions (Xử lý các lỗi) trong quá trình kết nối Database
    print(f"An error occurred (Đã xảy ra lỗi kết nối): {e}")