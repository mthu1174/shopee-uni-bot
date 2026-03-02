const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    // 1. Cấu hình xác thực
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 2. Mở file Google Sheet (Thay ID file của bạn vào đây)
    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['TikTok']; 

    // 3. Gọi API TikTok Academy để lấy bài mới
    const url = "https://seller-vn.tiktok.com/university/api/knowledge/get_knowledge_list";
    
    const response = await axios.get(url, {
        params: {
            page_size: 10,
            page_number: 1,
            region: "VN"
        },
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://seller-vn.tiktok.com/university/home",
            "Accept": "application/json"
        }
    });

    // Thêm dòng kiểm tra này để nếu lỗi mình biết ngay tại sao
    if (!response.data || !response.data.data) {
        console.error("❌ Không lấy được dữ liệu từ TikTok. Phản hồi:", JSON.stringify(response.data));
        return;
    }

    const items = response.data.data.list;

    // Lấy danh sách ID đã có để check trùng
    const rows = await sheet.getRows();
    const existingIds = rows.map(row => row.get('Knowledge_ID'));

    const today = new Date().toISOString().split('T')[0]; // Định dạng yyyy-mm-dd

    for (const item of items) {
        const kId = item.knowledge_id.toString();
        if (!existingIds.includes(kId)) {
            await sheet.addRow({
                'Knowledge_ID': kId,
                'Tieu_de': item.title,
                'Link': `https://seller-vn.tiktok.com/university/essay?knowledge_id=${kId}`,
                'Gio_quet': today
            });
            console.log(`✅ Đã thêm bài TikTok: ${item.title}`);
        } else {
            console.log(`⏭️ Đã có bài: ${item.title}`);
        }
    }
}

runTikTokBot().catch(console.error);
