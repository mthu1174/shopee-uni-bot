const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("🚀 Đang khởi động con bot quét đa danh mục Shopee Uni...");
    
    // 1. Danh sách các danh mục bạn muốn quét (Có thể thêm bớt ở đây)
    const categories = [
        { id: '1006', name: 'Vận hành' },
        { id: '1726', name: 'Cập nhật mới nhất' }
    ];

    // 2. Kết nối Google Sheet bằng Service Account
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; 

    // 3. Khởi tạo trình duyệt Playwright (Giả lập trình duyệt thật)
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let totalNewPosts = 0;

    // 4. Bắt đầu vòng lặp quét từng danh mục
    for (const cat of categories) {
        console.log(`--- Đang quét: ${cat.name} (ID: ${cat.id}) ---`);
        
        try {
            await page.goto(`https://banhang.shopee.vn/edu/category?sub_cat_id=${cat.id}`, { 
                waitUntil: 'networkidle', 
                timeout: 60000 
            });
            
            // Đợi 5 giây để nội dung danh sách (ul > li) load xong hoàn toàn
            await page.waitForSelector('section.category-main div ul li', { timeout: 15000 });
            await page.waitForTimeout(5000); 

            // Trích xuất dữ liệu dựa trên tọa độ (Selector) bạn đã soi
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

            console.log(`> Tìm thấy ${articles.length} bài viết trong mục ${cat.name}.`);

            // Đọc lại Sheet để kiểm tra trùng lặp
            const rows = await sheet.getRows();
            const existingIds = rows.map(r => r.toObject()['ID Bài viết']);

            for (const art of articles) {
                // Kiểm tra ID để không bị ghi đè bài cũ
                if (art.id && !existingIds.includes(art.id)) {
                    await sheet.addRow({
                        'ID Bài viết': art.id,
                        'Danh mục': cat.name,
                        'Tiêu đề': art.title,
                        'Đường dẫn': art.link,
                        'Ngày đăng': art.publishedDate
                    });
                    console.log(`✅ Đã thêm: ${art.title}`);
                    totalNewPosts++;
                }
            }
        } catch (e) {
            console.error(`❌ Lỗi khi quét danh mục ${cat.name}:`, e.message);
        }
    }

    console.log(`\n🎉 Hoàn thành! Đã cập nhật tổng cộng ${totalNewPosts} bài mới.`);
    await browser.close();
}

run().catch(error => {
    console.error("💥 Lỗi hệ thống:", error);
    process.exit(1);
});
