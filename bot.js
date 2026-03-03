const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("🚀 Khởi động bot Shopee Uni (Bản Map Chủ đề & Danh mục)...");
    
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();

    // 1. Đọc cấu hình từ tab Setup_Shopee
    const setupSheet = doc.sheetsByTitle['Setup_Shopee'];
    const setupRows = await setupSheet.getRows();
    
    const collections = setupRows.map(row => ({
        chuDe: row.get('Chủ đề'),
        danhMuc: row.get('Danh mục'),
        id: row.get('ID_Mục')
    })).filter(item => item.id);

    if (collections.length === 0) {
        console.log("⚠️ Tab Setup_Shopee trống!");
        return;
    }

    const dataSheet = doc.sheetsByIndex[0]; // Tab chứa kết quả cuối cùng

    // 2. Mở trình duyệt
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let totalNew = 0;
    const nowTimestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    for (const col of collections) {
        console.log(`\n🔍 Đang quét: ${col.chuDe} > ${col.danhMuc} (ID: ${col.id})`);
        
        try {
            await page.goto(`https://banhang.shopee.vn/edu/category?sub_cat_id=${col.id}`, { 
                waitUntil: 'networkidle', 
                timeout: 60000 
            });
            
            await page.waitForSelector('section.category-main div ul li', { timeout: 15000 });
            await page.waitForTimeout(2000); 

            const articles = await page.evaluate(() => {
                const items = document.querySelectorAll('section.category-main div ul li');
                return Array.from(items).map(el => {
                    const linkTag = el.querySelector('a');
                    const titleTag = el.querySelector('.article-title');
                    const dateTag = el.querySelector('.bottom-time');
                    
                    return {
                        title: titleTag ? titleTag.innerText.trim() : '',
                        link: linkTag ? linkTag.href : '',
                        id: linkTag ? linkTag.href.split('/').pop() : '',
                        publishedDate: dateTag ? dateTag.innerText.trim() : ''
                    };
                }).filter(item => item.title !== '');
            });

            const rows = await dataSheet.getRows();
            const existingIds = rows.map(r => r.get('ID Bài viết'));

            for (const art of articles) {
                if (art.id && !existingIds.includes(art.id)) {
                    await dataSheet.addRow({
                        'ID Bài viết': art.id,
                        'Chủ đề': col.chuDe,      // Cột tự ghi từ Setup
                        'Danh mục': col.danhMuc,    // Cột tự ghi từ Setup
                        'Tiêu đề': art.title,
                        'Đường dẫn': art.link,
                        'Ngày đăng': art.publishedDate,
                        'Giờ quét': nowTimestamp
                    });
                    console.log(`✅ Lưu bài: ${art.title}`);
                    totalNew++;
                }
            }
        } catch (e) {
            console.error(`❌ Lỗi mục ${col.danhMuc}:`, e.message);
        }
    }

    console.log(`\n🏁 Xong rồi Mai Thu! Tổng thêm mới: ${totalNew} bài.`);
    await browser.close();
}

run().catch(console.error);
