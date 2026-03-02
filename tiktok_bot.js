const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // NHỚ THAY ID SHEET CỦA BẠN VÀO ĐÂY NHA Mai Thu
    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth); 
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['TikTok'];

    const collections = [
        { id: "4227429090887426", chuDe: "Tài chính", danhMuc: "Phí của nhà bán hàng" }
    ];

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const rows = await sheet.getRows();
    const existingIds = rows.map(row => row.get('Knowledge_ID'));

    for (const col of collections) {
        console.log(`--- Đang quét Content ID: ${col.id} ---`);
        
        // URL mới Mai Thu vừa tìm thấy nè
        const url = `https://seller-vn.tiktok.com/api/v1/seller/learning_center/contents/list`;
        
        try {
            const response = await axios.get(url, {
                params: {
                    content_id: col.id,
                    page: 1,
                    limit: 20,
                    region: "VN",
                    locale: "vi-VN"
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://seller-vn.tiktok.com/university/home"
                }
            });

            // TikTok trả về data trong learning_info (như cái JSON bạn gửi lúc sáng)
            if (response.data && response.data.data && response.data.data.learning_info) {
                const items = response.data.data.learning_info;

                for (const item of items) {
                    const kId = item.learning_id.toString();
                    
                    const createDate = new Date(item.create_time).toLocaleDateString('vi-VN');
                    const modifyDate = new Date(item.modify_time).toLocaleDateString('vi-VN');

                    if (!existingIds.includes(kId)) {
                        await sheet.addRow({
                            'Knowledge_ID': kId,
                            'Tên bài': item.name,
                            'Ngày tạo': createDate,
                            'Ngày chỉnh sửa': modifyDate,
                            'Ngày giờ quét': now,
                            'Chủ đề': col.chuDe,
                            'Danh mục': col.danhMuc,
                            'Tóm tắt': item.description || "Không có tóm tắt",
                            'Link': `https://seller-vn.tiktok.com/university/essay?knowledge_id=${kId}`
                        });
                        console.log(`✅ Thêm bài: ${item.name}`);
                    } else {
                        console.log(`⏭️ Đã có: ${item.name}`);
                    }
                }
            } else {
                console.log(`⚠️ Không lấy được list bài. Kiểm tra lại API: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.error(`❌ Lỗi API:`, error.message);
        }
    }
}

runTikTokBot().catch(console.error);
