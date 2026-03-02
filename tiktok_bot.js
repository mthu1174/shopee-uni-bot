const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('ID_FILE_GOOGLE_SHEET_CỦA_MAI_THU', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['TikTok'];

    // --- CHỖ ĐỂ MAI THU ĐIỀN CONTENT ID ---
    const collections = [
        { id: "4227429090887426", chuDe: "Tài chính", danhMuc: "Phí của nhà bán hàng" },
        // Sau này có Content ID khác về Vận hành hay Logistics thì Mai Thu thêm dòng ở dưới nhé
    ];

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const rows = await sheet.getRows();
    const existingIds = rows.map(row => row.get('Knowledge_ID'));

    for (const col of collections) {
        console.log(`--- Đang quét Content ID: ${col.id} (${col.danhMuc}) ---`);
        
        // API chuyên dụng để lấy danh sách bài viết TRONG một Content ID
        const url = `https://seller-vn.tiktok.com/university/api/knowledge/get_knowledge_list_by_content_id`;
        
        try {
            const response = await axios.get(url, {
                params: {
                    content_id: col.id,
                    region: "VN"
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://seller-vn.tiktok.com/university/home"
                }
            });

            if (response.data && response.data.data && response.data.data.list) {
                const items = response.data.data.list;

                for (const item of items) {
                    const kId = item.knowledge_id.toString();
                    
                    const createDate = new Date(item.create_time).toLocaleDateString('vi-VN');
                    const modifyDate = new Date(item.modify_time).toLocaleDateString('vi-VN');

                    if (!existingIds.includes(kId)) {
                        await sheet.addRow({
                            'Knowledge_ID': kId,
                            'Tên bài': item.title,
                            'Ngày tạo': createDate,
                            'Ngày chỉnh sửa': modifyDate,
                            'Ngày giờ quét': now,
                            'Chủ đề': col.chuDe,
                            'Danh mục': col.danhMuc,
                            'Tóm tắt': item.description || "Không có tóm tắt",
                            'Link': `https://seller-vn.tiktok.com/university/essay?knowledge_id=${kId}`
                        });
                        console.log(`✅ Đã thêm bài: ${item.title}`);
                    } else {
                        console.log(`⏭️ Đã có: ${item.title}`);
                    }
                }
            } else {
                console.log(`⚠️ Không tìm thấy bài viết nào trong Content ID: ${col.id}`);
            }
        } catch (error) {
            console.error(`❌ Lỗi khi quét Content ID ${col.id}:`, error.message);
        }
    }
}

runTikTokBot().catch(console.error);
