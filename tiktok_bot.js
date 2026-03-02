const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

async function runTikTokBot() {
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Mai Thu nhớ dán đúng ID Google Sheet của bạn vào đây nha
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
        
        // Đây là cái URL "khủng" mình bê nguyên từ fetch của bạn vào
        const url = `https://seller-vn.tiktok.com/api/v1/seller/learning_center/contents/list`;
        
        try {
            const response = await axios.get(url, {
                params: {
                    "content_id": col.id,
                    "page": "1",
                    "limit": "12",
                    "locale": "vi-VN",
                    "language": "vi",
                    "region": "VN",
                    "aid": "4068",
                    "app_name": "i18n_ecom_shop",
                    "device_id": "0",
                    "fp": "verify_mm8p5yr2_c1Q4i7cp_nYO5_4042_9PH9_WAKFsS5lSd40",
                    "device_platform": "web",
                    "cookie_enabled": "true",
                    "screen_width": "1536",
                    "screen_height": "864",
                    "browser_language": "en-US",
                    "browser_platform": "Win32",
                    "browser_name": "Mozilla",
                    "browser_version": "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
                    "browser_online": "true",
                    "timezone_name": "Asia/Bangkok",
                    "msToken": "KgGULhMaok4BFDmcH0OW81SP3B_CnZuNQv0EwBDlvsa_glkS31YFC7y1nbxH74NHUfeAem6nQhYUD9mw-huj8dPu_0cy7P4IRIwHe06ER-El-u5hWYbpGVU-CvtGCnx0UQNuyiab",
                    "X-Bogus": "DFSzswVLxGGAN9GDCi4QFcVRr3NG",
                    "_signature": "_02B4Z6wo00001jPPB9AAAIDD.d-RwausWT4zzwNAAOVk38"
                },
                headers: {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "cookie": "ATLAS_LANG=vi-VN; _ga=GA1.1.452522107.1761536184; _tt_enable_cookie=1; d_ticket_tiktokseller=09a072fc41d73fa9e0b7866467c99ca87765d; d_ticket_ads=e5adfa048ab6139790641d7fd7c27a6e7765d; odin_tt=743860a810e13704a67bc2dfb5e18a47d30a83e2e28f9b692671f6c6e3ef5230633e6bfef6950e93b12c8dd637a1694b4236eac8462d143ce97e33a1dfb04664; sid_guard_tiktokseller=5fda68d71ef7be5b75bdb4dbc66e2a6a%7C1761536396%7C259198%7CThu%2C+30-Oct-2025+03%3A39%3A54+GMT; user_oec_info=0a5314597c3aebcf76f3bad25bab5e7fe89a8dad6b6941e602272525e76c8afc938b522eea2b202c22a5a185128f70125e0868d877144475d4ab2e668fc4f76fab5a0ccb0ae405a381c74d66af5276316d371845ba1a490a3c000000000000000000004fa40edb9c1f8619cade639659c8eae5c7a08812adf5e19100f5042f0cd696899056a1d4a1b03879c079590c4954dbfe0a1c10b1f5ff0d1886d2f6f20d220104f77afbb5; i18next=vi-VN; ttcsid=1763970753170::FFF3cmn1tvv3S2lA2bhu.2.1763970760574.0; ttcsid_CMSS13RC77U1PJEFQUB0=1763970753168::xx0_t4rGSkMiS4aDJ-Wj.2.1763970760574.0; _ga_BZBQ2QHQSP=GS2.1.s1763970751$o2$g1$t1763970796$j15$l0$h1624050589; _ttp=36C3IqqNanddHNCbWmxeWQc7fNF; passport_csrf_token=b8b92fb4cdcf9fb65d151669feb03a4b; passport_csrf_token_default=b8b92fb4cdcf9fb65d151669feb03a4b; tt_chain_token=Bg7ERgO+HFGacOM/Z7KlDg==; _m4b_theme_=new; s_v_web_id=verify_mm8p5yr2_c1Q4i7cp_nYO5_4042_9PH9_WAKFsS5lSd40; ttwid=1%7CiQj3pBEpaFOLHxcp6c0DAu4PL3SCn3pXSbzI3gWfq7M%7C1772437720%7Cf12a772fc763ebc7d9a8ffaa80d75c188b8b287824302c3a08b9383a584da680; msToken=KgGULhMaok4BFDmcH0OW81SP3B_CnZuNQv0EwBDlvsa_glkS31YFC7y1nbxH74NHUfeAem6nQhYUD9mw-huj8dPu_0cy7P4IRIwHe06ER-El-u5hWYbpGVU-CvtGCnx0UQNuyiab",
                    "referer": `https://seller-vn.tiktok.com/university/home?identity=1&content_id=${col.id}&role=seller&menu=feature`
                }
            });

            if (response.data && response.data.code === 0 && response.data.data.learning_info) {
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
                        console.log(`✅ Thành công! Đã thêm bài: ${item.name}`);
                    } else {
                        console.log(`⏭️ Bài đã có trong Sheet: ${item.name}`);
                    }
                }
            } else {
                console.log("❌ Phản hồi không có dữ liệu bài viết:", JSON.stringify(response.data));
            }
        } catch (error) {
            console.error(`❌ Lỗi API TikTok:`, error.message);
        }
    }
}

runTikTokBot().catch(console.error);
