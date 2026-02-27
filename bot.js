const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("Đang bắt đầu quét theo tọa độ bạn gửi...");
    
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
    
    // Vào link danh mục bạn đã chọn
    await page.goto('https://banhang.shopee.vn/edu/category?sub_cat_id=1006', { waitUntil: 'networkidle' });
    
    // Đợi cho danh sách bài viết (thẻ <ul>) hiện ra
    await page.waitForSelector('section.category-main div ul');
    await page.waitForTimeout(3000); // Đợi thêm 3s cho chắc chắn

    const articles = await page.evaluate(() => {
        // Dựa trên selector bạn gửi: #app > div.content > section > section.category-main > div > ul > li
        const items = document.querySelectorAll('section.category-main div ul li');
        
        return Array.from(items).map(el => {
            const linkTag = el.querySelector('a');
            const titleTag = el.querySelector('.article-title');
            
            return {
                title: titleTag ? titleTag.innerText.trim() : '',
                link: linkTag ? linkTag.href : '',
                id: linkTag ? linkTag.href.split('/').pop() : ''
            };
        }).filter(item => item.title !== ''); // Loại bỏ những dòng trống
    });

    console.log(`Tìm thấy ${articles.length} bài viết khớp với cấu trúc bạn soi.`);

    const rows = await sheet.getRows();
    const existingIds = rows.map(r => r.toObject()['ID Bài viết']);

    let newPostsCount = 0;
    for (const art of articles) {
        if (art.id && !existingIds.includes(art.id)) {
            await sheet.addRow({
                'ID Bài viết': art.id,
                'Tiêu đề': art.title,
                'Đường dẫn': art.link,
                'Ngày đăng': new Date().toLocaleDateString('vi-VN')
            });
            console.log(`Đã thêm: ${art.title}`);
            newPostsCount++;
        }
    }

    console.log(`Hoàn thành! Thêm mới: ${newPostsCount}`);
    await browser.close();
}

run().catch(error => {
    console.error("Lỗi:", error);
    process.exit(1);
});
