const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth); 
    await doc.loadInfo();
    
    const setupSheet = doc.sheetsByTitle['TikTok Setup'];
    const dataSheet = doc.sheetsByTitle['TikTok'];

    // 1. Đọc dữ liệu từ file Setup
    const setupRows = await setupSheet.getRows();
    const collections = setupRows.map(row => ({
        menu: row.get('Menu'),
        chuDe: row.get('Chủ đề'),
        danhMuc: row.get('Danh mục'),
        id: row.get('Content_ID')
    })).filter(item => item.id); // Loại bỏ dòng trống

    if (collections.length === 0) {
        console.log("⚠️ Không tìm thấy cấu hình nào trong tab Setup.");
        return;
    }

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const existingRows = await dataSheet.getRows();
    const existingIds = existingRows.map(row => row.get('Knowledge_ID'));

    // 2. Lặp qua từng mục trong Setup để quét
    for (const col of collections) {
        console.log(`--- Đang quét: ${col.danhMuc} (Menu: ${col.menu}) ---`);
        
        const url = `https://seller-vn.tiktok.com/api/v1/seller/learning_center/contents/list`;
        
        try {
            const response = await axios.get(url, {
                params: {
                    "content_id": col.id,
                    "page": "1",
                    "limit": "20",
                    "locale": "vi-VN",
                    "language": "vi",
                    "region": "VN",
                    "aid": "4068",
                    "app_name": "i18n_ecom_shop",
                    "fp": "verify_mm8p5yr2_c1Q4i7cp_nYO5_4042_9PH9_WAKFsS5lSd40",
                    "device_platform": "web",
                    "timezone_name": "Asia/Bangkok",
                    "msToken": "KgGULhMaok4BFDmcH0OW81SP3B_CnZuNQv0EwBDlvsa_glkS31YFC7y1nbxH74NHUfeAem6nQhYUD9mw-huj8dPu_0cy7P4IRIwHe06ER-El-u5hWYbpGVU-CvtGCnx0UQNuyiab",
                    "X-Bogus": "DFSzswVLxGGAN9GDCi4QFcVRr3NG",
                    "_signature": "_02B4Z6wo00001jPPB9AAAIDD.d-RwausWT4zzwNAAOVk38"
                },
                headers: {
                    "accept": "*/*",
                    "accept-language": "vi-VN,vi;q=0.9",
                    "cookie": "ATLAS_LANG=vi-VN; msToken=KgGULhMaok4BFDmcH0OW81SP3B_CnZuNQv0EwBDlvsa_glkS31YFC7y1nbxH74NHUfeAem6nQhYUD9mw-huj8dPu_0cy7P4IRIwHe06ER-El-u5hWYbpGVU-CvtGCnx0UQNuyiab",
                    "referer": `https://seller-vn.tiktok.com/university/home?identity=1&content_id=${col.id}&role=seller&menu=${col.menu}`
                }
            });

            if (response.data && response.data.code === 0 && response.data.data.learning_info) {
                const items = response.data.data.learning_info;
                for (const item of items) {
                    const kId = item.learning_id.toString();
                    
                    if (!existingIds.includes(kId)) {
                        await dataSheet.addRow({
                            'Knowledge_ID': kId,
                            'Tên bài': item.name,
                            'Ngày tạo': new Date(item.create_time).toLocaleDateString('vi-VN'),
                            'Ngày chỉnh sửa': new Date(item.modify_time).toLocaleDateString('vi-VN'),
                            'Ngày giờ quét': now,
                            'Menu': col.menu,
                            'Chủ đề': col.chuDe,
                            'Danh mục': col.danhMuc,
                            'Tóm tắt': item.description || "Không có tóm tắt",
                            'Link': `https://seller-vn.tiktok.com/university/essay?knowledge_id=${kId}`
                        });
                        console.log(`✅ Đã lưu: ${item.name}`);
                    }
                }
            } else {
                console.log(`⚠️ Lỗi dữ liệu ID ${col.id}: ${response.data.message}`);
            }
        } catch (error) {
            console.error(`❌ Lỗi API khi quét ID ${col.id}:`, error.message);
        }
    }
}

runTikTokBot().catch(console.error);
