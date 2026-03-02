const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    // 1. Cấu hình xác thực Google Sheet
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['TikTok'];

    // 2. Danh sách các Danh mục lớn (Bạn thêm ID vào đây)
    const categories = [
        { name: "Tài chính", id: "2968734088120080" }, // ID ví dụ từ link bạn gửi
        // { name: "Vận hành", id: "ID_KHÁC" },
    ];

    for (const cat of categories) {
        console.log(`--- Đang quét danh mục: ${cat.name} ---`);
        
        const url = `https://seller-vn.tiktok.com/university/api/knowledge/get_knowledge_list`;
        
        try {
            const response = await axios.get(url, {
                params: {
                    page_size: 20,
                    page_number: 1,
                    region: "VN",
                    category_id: cat.id
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                }
            });

            if (response.data && response.data.data) {
                const items = response.data.data.list;
                const rows = await sheet.getRows();
                const existingIds = rows.map(row => row.get('Knowledge_ID'));

                // Lấy thời gian hiện tại lúc quét (Giờ Việt Nam)
                const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

                for (const item of items) {
                    const kId = item.knowledge_id.toString();
                    
                    // Chuyển đổi Timestamp sang Ngày/Tháng/Năm
                    const createDate = new Date(item.create_time).toLocaleDateString('vi-VN');
                    const modifyDate = new Date(item.modify_time).toLocaleDateString('vi-VN');

                    if (!existingIds.includes(kId)) {
                        await sheet.addRow({
                            'Knowledge_ID': kId,
                            'Tên bài': item.title,
                            'Ngày tạo': createDate,
                            'Ngày chỉnh sửa': modifyDate,
                            'Ngày giờ quét': now,          // <-- Cột mới thêm đây nè!
                            'Chủ đề': cat.name,
                            'Danh mục': "Phí của Nhà Bán Hàng", 
                            'Tóm tắt': item.description,
                            'Link': `https://seller-vn.tiktok.com/university/essay?knowledge_id=${kId}`
                        });
                        console.log(`✅ Đã lưu bài: ${item.title}`);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi mục ${cat.name}:`, error.message);
        }
    }
}

runTikTokBot().catch(console.error);
