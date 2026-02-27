const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("🚀 Khởi động bot quét Shopee Uni (Phiên bản chuyên nghiệp)...");
    
    // 1. Cấu hình danh mục cần quét
    const categories = [
        { id: '1006', name: 'Vận hành' },
        { id: '1726', name: 'Cập nhật mới nhất' }
    ];

    // 2. Kết nối Google Sheet
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; 

    // 3. Cấu hình trình duyệt
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let totalNewPosts = 0;

    for (const cat of categories) {
        console.log(`\n🔍 Đang kiểm tra mục: ${cat.name}`);
        
        try {
            await page.goto(`https://banhang.shopee.vn/edu/category?sub_cat_id=${cat.id}`, { 
                waitUntil: 'networkidle', 
                timeout: 60000 
            });
            
            // Đợi danh sách bài viết hiển thị
            await page.waitForSelector('section.category-main div ul li', { timeout: 15000 });
            await page.waitForTimeout(3000); 

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

            // Kiểm tra trùng lặp bằng ID
            const rows = await sheet.getRows();
            const existingIds = rows.map(r => r.toObject()['ID Bài viết']);

            for (const art of articles) {
                if (art.id && !existingIds.includes(art.id)) {
                    // Ghi vào Sheet kèm theo Giờ quét (Timestamp)
                    await sheet.addRow({
                        'ID Bài viết': art.id,
                        'Danh mục': cat.name,
                        'Tiêu đề': art.title,
                        'Đường dẫn': art.link,
                        'Ngày đăng': art.publishedDate,
                        'Giờ quét': new Date().toISOString() // Định dạng chuẩn để Power Automate dễ lọc
                    });
                    console.log(`✅ Đã thêm: ${art.title}`);
                    totalNewPosts++;
                }
            }
        } catch (e) {
            console.error(`❌ Lỗi tại mục ${cat.name}:`, e.message);
        }
    }

    console.log(`\n🏁 Hoàn thành! Tổng cộng thêm mới: ${totalNewPosts} bài.`);
    await browser.close();
}

run().catch(error => {
    console.error("💥 Lỗi nghiêm trọng:", error);
    process.exit(1);
});
