const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("Đang bắt đầu quét đa danh mục...");
    
    // 1. Cấu hình danh mục (Bạn muốn thêm mục nào thì cứ copy dòng rồi dán thêm vào đây)
    const categories = [
        { id: '1006', name: 'Vận hành' },
        { id: '1726', name: 'Cập nhật mới nhất' },
        // Ví dụ thêm: { id: '1010', name: 'Marketing' }
    ];

    // 2. Cấu hình bảo mật Google Sheets
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; 

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let totalNewPosts = 0;

    // 3. Lặp qua từng danh mục để quét
    for (const cat of categories) {
        console.log(`--- Đang quét danh mục: ${cat.name} (ID: ${cat.id}) ---`);
        
        await page.goto(`https://banhang.shopee.vn/edu/category?sub_cat_id=${cat.id}`, { waitUntil: 'networkidle' });
        
        // Đợi danh mục hiển thị
        try {
            await page.waitForSelector('section.category-main div ul li', { timeout: 10000 });
        } catch (e) {
            console.log(`Danh mục ${cat.name} không có bài viết hoặc load chậm.`);
            continue; 
        }

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

        // Đọc lại sheet mỗi lần lặp để cập nhật danh sách ID mới nhất (tránh trùng giữa các danh mục)
        const rows = await sheet.getRows();
        const existingIds = rows.map(r => r.toObject()['ID Bài viết']);

        for (const art of articles) {
            if (art.id && !existingIds.includes(art.id)) {
                await sheet.addRow({
                    'ID Bài viết': art.id,
                    'Danh mục': cat.name, // Điền tên danh mục bạn đã set sẵn ở trên
                    'Tiêu đề': art.title,
                    'Đường dẫn': art.link,
                    'Ngày đăng': art.publishedDate
                });
                console.log(`Đã thêm: [${cat.name}] ${art.title}`);
                totalNewPosts++;
            }
        }
    }

    console.log(`Hoàn thành! Tổng cộng thêm mới: ${totalNewPosts}`);
    await browser.close();
}

run().catch(error => {
    console.error("Lỗi:", error);
    process.exit(1);
});
