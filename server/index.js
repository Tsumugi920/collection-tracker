// collection-tracker 后端入口
const path = require('path');
const express = require('express');
const store = require('./store');
const itemsRouter = require('./routes/items');
const wishlistRouter = require('./routes/wishlist');
const statsRouter = require('./routes/stats');

const PORT = Number(process.env.PORT) || 3017;
const app = express();

app.use(express.json());
// 前端静态资源由后端托管，访问 http://localhost:3017 即是页面
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'collection-tracker' }));

app.get('/api/meta', (req, res) => {
  const data = store.load();
  res.json({
    categories: data.categories,
    statuses: [
      { value: 'owned', label: '在库' },
      { value: 'lent', label: '借出' },
      { value: 'selling', label: '出售中' },
      { value: 'sold', label: '已售出' },
    ],
    priorities: [
      { value: 'high', label: '高' },
      { value: 'medium', label: '中' },
      { value: 'low', label: '低' },
    ],
  });
});

app.use('/api/items', itemsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/stats', statsRouter);

app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

// 统一错误处理（含请求体 JSON 解析失败）
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法 JSON' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`collection-tracker 已启动: http://localhost:${PORT}`);
  console.log(`数据文件: ${store.DATA_FILE}`);
});
