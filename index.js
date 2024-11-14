#!/usr/bin/env node
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;

// Thiết lập bộ đệm với thời gian hết hạn là 5 phút (300 giây)
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Middleware kiểm tra và trả về từ bộ đệm nếu có.
 */
function cacheMiddleware(req, res, next) {
    const cacheKey = req.originalUrl;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
        console.log(`🔄 Cache hit for: ${cacheKey}`);
        return res.status(200).json(cachedResponse);
    } else {
        console.log(`⚡ Cache miss for: ${cacheKey}`);
        next();
    }
}

/**
 * Route chính cho proxy server
*/

app.get('/cache', (req, res) => {
    const keys = cache.keys();  // Lấy tất cả các khóa
    const allCacheData = keys.map(key => ({
        key: key,
        value: cache.get(key)  // Lấy giá trị tương ứng với mỗi khóa
    }));

    res.status(200).json(allCacheData);  // Trả về các mục trong cache
});

app.use(cacheMiddleware);

app.get('*', async (req, res) => {
    const url = req.originalUrl.slice(1); // Bỏ dấu '/' đầu tiên để lấy URL

    try {
        // Gửi yêu cầu đến máy chủ đích
        const response = await axios.get(url);
        const data = response.data;

        // Lưu phản hồi vào bộ đệm
        cache.set(req.originalUrl, data);

        res.status(200).json(data);
    } catch (error) {
        console.error(`❌ Error fetching data from ${url}:`, error.message);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Khởi chạy máy chủ proxy
app.listen(port, () => {
    console.log(`🚀 Proxy server listening on port ${port}`);
});