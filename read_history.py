import json # Import the built-in module to parse (phân tích cú pháp) JSON data

# Define the file path (đường dẫn tệp)
file_path = 'LichSuChat_Toan.json'

try:
    # Open the file in read mode ('r'). 
    # The 'with' statement ensures the file is closed automatically to prevent memory leaks (rò rỉ bộ nhớ).
    # We use encoding='utf-8' to handle (xử lý) Vietnamese characters properly.
    with open(file_path, 'r', encoding='utf-8') as file:
        
        # Deserialize (chuyển đổi/giải mã ngược) the JSON document into a Python object (list of dictionaries)
        chat_history = json.load(file)
        
        # Iterate (lặp qua) through each message item in the array
        for message in chat_history:
            
            # Retrieve (truy xuất/lấy ra) the sender's role. It is either 'user' or 'model'.
            role = message.get("role", "Unknown")
            
            # Assign (gán) a more readable name based on the role
            sender = "Bạn" if role == "user" else "AI"
            
            # Access the nested structure (cấu trúc lồng nhau) to extract (trích xuất) the text content
            text_content = message["parts"][0]["text"]
            
            # Output (xuất ra) the formatted result to the console (bảng điều khiển)
            print(f"{sender}: {text_content}\n" + "-"*40)
            
except FileNotFoundError:
    # Handle the exception (xử lý ngoại lệ) if the file is missing
    print(f"Error: The file '{file_path}' was not found in the current directory.")