const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { chromium } = require('playwright'); // Dùng Playwright giống Shopee nè

async function runTikTokBot() {
    // 1. Xác thực Google Sheet (Giữ nguyên)
    const serviceAccountAuth = new JWT({
        email: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
        key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1eAqPpi-ZyPEbTSDWw8OE1ngv07jjiwUAQy-XPYMutdY', serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['TikTok'];

    // 2. Mở trình duyệt ảo để "vượt rào" TikTok
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("🚀 Đang truy cập TikTok Academy...");
    
    // Chặn các yêu cầu thừa cho nhẹ máy
    await page.route('**/*.{png,jpg,jpeg,svg,css}', route => route.abort());

    // Đi đến trang danh sách bài viết
    await page.goto('https://seller-vn.tiktok.com/university/home', { waitUntil: 'networkidle' });

    // Đợi 1 chút cho API nó load xong bài viết
    await page.waitForTimeout(5000);

    // 3. "Móc" dữ liệu trực tiếp từ cửa sổ trình duyệt (Bí kíp ở đây)
    const articles = await page.evaluate(() => {
        const results = [];
        // Tìm tất cả các link có chứa knowledge_id
        const links = document.querySelectorAll('a[href*="knowledge_id="]');
        links.forEach(link => {
            const url = new URL(link.href);
            const id = url.searchParams.get('knowledge_id');
            const title = link.innerText.trim();
            if (id && title && !results.find(r => r.id === id)) {
                results.push({ id, title, link: link.href });
            }
        });
        return results;
    });

    await browser.close();

    if (articles.length === 0) {
        console.log("❌ Không tìm thấy bài viết nào. Có thể trang web đã đổi cấu trúc.");
        return;
    }

    // 4. Ghi vào Google Sheet
    const rows = await sheet.getRows();
    const existingIds = rows.map(row => row.get('Knowledge_ID'));
    const today = new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd

    for (const art of articles) {
        if (!existingIds.includes(art.id)) {
            await sheet.addRow({
                'Knowledge_ID': art.id,
                'Tieu_de': art.title,
                'Link': art.link,
                'Gio_quet': today
            });
            console.log(`✅ Thêm mới: ${art.title}`);
        }
    }
}

runTikTokBot().catch(console.error);
