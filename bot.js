const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("Đang bắt đầu quá trình kiểm tra bài viết mới...");
    
    // 1. Cấu hình bảo mật
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY là ID file của bạn
    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; 

    // 2. Mở trình duyệt cào Shopee
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://banhang.shopee.vn/edu/category?sub_cat_id=1006');
    await page.waitForTimeout(5000);

    const articles = await page.evaluate(() => {
        const items = document.querySelectorAll('.article-card');
        return Array.from(items).map(el => ({
            title: el.innerText.split('\n')[0].trim(),
            link: el.querySelector('a') ? el.querySelector('a').href : '',
            id: el.querySelector('a') ? el.querySelector('a').href.split('/').pop() : ''
        }));
    });

    console.log(`Tìm thấy ${articles.length} bài viết.`);

    // 3. Đọc dữ liệu và ghi vào Sheet
    const rows = await sheet.getRows();
    // Lưu ý: Tên cột phải khớp chính xác với hàng 1 trong Sheet của bạn
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
