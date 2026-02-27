const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("Đang bắt đầu quét bài viết và lấy ngày đăng thực tế...");
    
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
    
    await page.goto('https://banhang.shopee.vn/edu/category?sub_cat_id=1006', { waitUntil: 'networkidle' });
    
    await page.waitForSelector('section.category-main div ul li');
    await page.waitForTimeout(3000); 

    const articles = await page.evaluate(() => {
        const items = document.querySelectorAll('section.category-main div ul li');
        
        return Array.from(items).map(el => {
            const linkTag = el.querySelector('a');
            const titleTag = el.querySelector('.article-title');
            // Lấy ngày đăng từ class .bottom-time mà bạn đã soi
            const dateTag = el.querySelector('.bottom-time');
            
            return {
                title: titleTag ? titleTag.innerText.trim() : '',
                link: linkTag ? linkTag.href : '',
                id: linkTag ? linkTag.href.split('/').pop() : '',
                // Nếu tìm thấy thẻ ngày thì lấy chữ bên trong, không thì để trống
                publishedDate: dateTag ? dateTag.innerText.trim() : ''
            };
        }).filter(item => item.title !== '');
    });

    console.log(`Tìm thấy ${articles.length} bài viết.`);

    const rows = await sheet.getRows();
    const existingIds = rows.map(r => r.toObject()['ID Bài viết']);

    let newPostsCount = 0;
    for (const art of articles) {
        if (art.id && !existingIds.includes(art.id)) {
            await sheet.addRow({
                'ID Bài viết': art.id,
                'Tiêu đề': art.title,
                'Đường dẫn': art.link,
                'Ngày đăng': art.publishedDate // Giờ nó sẽ điền đúng ngày từ web Shopee
            });
            console.log(`Đã thêm: ${art.title} (Ngày: ${art.publishedDate})`);
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
