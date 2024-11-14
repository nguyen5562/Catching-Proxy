#!/usr/bin/env node

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const yargs = require('yargs');

// Khởi tạo ứng dụng Express và bộ đệm
const app = express();
const cache = new NodeCache();
const port = 3000;  // Cổng mặc định

// Đọc tham số từ dòng lệnh
const argv = yargs
  .command('start', 'Khởi động máy chủ proxy', {
    port: {
      description: 'Cổng để chạy proxy server',
      alias: 'p',
      type: 'number',
      default: 3000
    }
  })
  .help()
  .alias('help', 'h')
  .argv;

const { port: cliPort } = argv;

// Middleware kiểm tra và trả về từ bộ đệm nếu có
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

// Route kiểm tra cache
app.get('/cache', (req, res) => {
  const keys = cache.keys();  // Lấy tất cả các khóa
  const allCacheData = keys.map(key => ({
    key: key,
    value: cache.get(key)
  }));

  res.status(200).json(allCacheData);
});

// Áp dụng cacheMiddleware cho tất cả các route còn lại
app.use(cacheMiddleware);

// Các route proxy
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

// Khởi động server theo tham số cổng CLI
app.listen(cliPort, () => {
  console.log(`🚀 Proxy server listening on port ${cliPort}`);
});
