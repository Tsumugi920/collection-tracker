// 收藏品路由：增删改查 + 筛选/搜索/排序
const express = require('express');
const store = require('../store');

const router = express.Router();

const STATUSES = ['owned', 'lent', 'selling', 'sold'];

function toNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// 校验并整理请求体；partial=true 时只校验传了的对象字段（用于 PUT 部分更新）
function sanitize(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? '').trim();
    if (!name) errors.push('名称不能为空');
    else if (name.length > 80) errors.push('名称不能超过 80 个字符');
    else out.name = name;
  }
  if (!partial || body.category !== undefined) {
    const category = String(body.category ?? '').trim();
    if (!category) errors.push('分类不能为空');
    else out.category = category;
  }
  if (!partial || body.status !== undefined) {
    const status = body.status ?? 'owned';
    if (!STATUSES.includes(status)) errors.push(`状态必须是 ${STATUSES.join(' / ')}`);
    else out.status = status;
  }
  for (const [key, label] of [['purchasePrice', '购入价'], ['currentValue', '当前估值']]) {
    if (!partial || body[key] !== undefined) {
      if (body[key] === undefined && !partial) {
        out[key] = 0;
      } else {
        const n = toNumber(body[key]);
        if (Number.isNaN(n) || n < 0) errors.push(`${label}必须是 ≥ 0 的数字`);
        else out[key] = Math.round(n * 100) / 100;
      }
    }
  }
  if (!partial || body.purchaseDate !== undefined) {
    const d = String(body.purchaseDate ?? '').trim();
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) errors.push('购入日期格式应为 YYYY-MM-DD');
    else out.purchaseDate = d;
  }
  for (const key of ['location', 'note']) {
    if (!partial || body[key] !== undefined) out[key] = String(body[key] ?? '').trim();
  }

  return { errors, out };
}

// GET /api/items?category=&status=&q=&sort=
router.get('/', (req, res) => {
  const { category, status, q, sort } = req.query;
  let items = store.load().items.slice();

  if (category) items = items.filter((it) => it.category === category);
  if (status) items = items.filter((it) => it.status === status);
  if (q) {
    const kw = String(q).toLowerCase();
    items = items.filter((it) =>
      [it.name, it.location, it.note].some((s) => String(s || '').toLowerCase().includes(kw)));
  }

  const sorters = {
    newest: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
    value_desc: (a, b) => b.currentValue - a.currentValue,
    value_asc: (a, b) => a.currentValue - b.currentValue,
    price_desc: (a, b) => b.purchasePrice - a.purchasePrice,
  };
  items.sort(sorters[sort] || sorters.newest);

  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = store.load().items.find((it) => it.id === req.params.id);
  if (!item) return res.status(404).json({ error: '收藏品不存在' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { errors, out } = sanitize(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  const now = new Date().toISOString();
  const item = { id: store.nextId('i'), ...out, createdAt: now, updatedAt: now };
  store.load().items.push(item);
  store.persist();
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const data = store.load();
  const item = data.items.find((it) => it.id === req.params.id);
  if (!item) return res.status(404).json({ error: '收藏品不存在' });

  const { errors, out } = sanitize(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  Object.assign(item, out, { updatedAt: new Date().toISOString() });
  store.persist();
  res.json(item);
});

router.delete('/:id', (req, res) => {
  const data = store.load();
  const idx = data.items.findIndex((it) => it.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '收藏品不存在' });

  const [removed] = data.items.splice(idx, 1);
  store.persist();
  res.json({ deleted: removed.id });
});

module.exports = router;
