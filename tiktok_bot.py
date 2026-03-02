import requests
import json
import gspread
import os
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# 1. Kết nối Google Sheet (Dùng chung Secret cũ của bạn)
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
# GitHub sẽ tự nạp file credentials.json từ Secret GOOGLE_CREDS bạn đã cài
creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
client = gspread.authorize(creds)

# 2. Mở Sheet TikTok (Mai Thu nhớ tạo thêm 1 Tab tên là 'TikTok' trong file Google Sheet cũ nhé)
spreadsheet = client.open("Article") 
sheet = spreadsheet.worksheet("TikTok")

def crawl_tiktok():
    # API lấy danh sách bài viết mới nhất từ TikTok Academy
    url = "https://seller-vn.tiktok.com/university/api/knowledge/get_knowledge_list"
    params = {
        "page_size": 10,
        "page_number": 1,
        "region": "VN"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    response = requests.get(url, params=params, headers=headers)
    data = response.json()
    
    if data.get('code') == 0:
        items = data['data']['list']
        existing_ids = sheet.col_values(1) # Lấy cột Knowledge_ID để check trùng
        
        current_date = datetime.now().strftime('%Y-%m-%d') # Định dạng yyyy-MM-dd cho PA dễ đọc
        
        for item in items:
            k_id = str(item['knowledge_id'])
            title = item['title']
            link = f"https://seller-vn.tiktok.com/university/essay?knowledge_id={k_id}"
            
            if k_id not in existing_ids:
                # Ghi vào Google Sheet: ID, Tiêu đề, Link, Ngày quét
                sheet.append_row([k_id, title, link, current_date])
                print(f"✅ Đã thêm TikTok: {title}")
            else:
                print(f"⏭️ Đã có: {title}")

if __name__ == "__main__":
    crawl_tiktok()
