const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function run() {
    console.log("Đang bắt đầu quá trình kiểm tra bài viết mới...");
    
    // 1. Cấu hình bảo mật kết nối với Google Sheets
    // Secret này bạn đã thiết lập trong phần Settings > Secrets của GitHub
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Kết nối tới file "Article" của bạn
    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; 

    // 2. Sử dụng Playwright để mở trình duyệt và lấy dữ liệu từ Shopee Uni
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Truy cập danh mục bài viết cụ thể trên Shopee Uni
    await page.goto('https://banhang.shopee.vn/edu/category?sub_cat_id=1006');
    
    // Đợi 5 giây để đảm bảo JavaScript tải xong các thẻ bài viết
    await page.waitForTimeout(5000);

    // Trích xuất danh sách tiêu đề và đường dẫn bài viết
    const articles = await page.evaluate(() => {
        const items = document.querySelectorAll('.article-card');
        return Array.from(items).map(el => ({
            title: el.innerText.split('\n')[0].trim(),
            link: el.querySelector('a') ? el.querySelector('a').href : '',
            id: el.querySelector('a') ? el.querySelector('a').href.split('/').pop() : ''
        }));
    });

    console.log(`Tìm thấy tổng cộng ${articles.length} bài viết trên trang.`);

    // 3. Đọc dữ liệu hiện có trong Sheet để kiểm tra trùng lặp
    const rows = await sheet.getRows();
    // Lấy danh sách các ID bài viết đã có ở cột "ID Bài viết" 
    const existingIds = rows.map(r => r.get('ID Bài viết'));

    let newPostsCount = 0;

    for (const art of articles) {
        // Chỉ thêm nếu bài viết có link và ID này chưa tồn tại trong Sheet
        if (art.id && !existingIds.includes(art.id)) {
            await sheet.addRow({
                'ID Bài viết': art.id,
                'Tiêu đề': art.title,
                'Đường dẫn': art.link,
                'Ngày đăng': new Date().toLocaleDateString('vi-VN')
            });
            console.log(`Đã thêm bài mới: ${art.title}`);
            newPostsCount++;
        }
    }

    if (newPostsCount === 0) {
        console.log("Không có bài viết mới nào để cập nhật.");
    } else {
        console.log(`Hoàn thành! Đã cập nhật thêm ${newPostsCount} bài viết mới vào sheet.`);
    }

    await browser.close();
}

run().catch(error => {
    console.error("Đã xảy ra lỗi trong quá trình thực thi:", error);
    process.exit(1);
});
