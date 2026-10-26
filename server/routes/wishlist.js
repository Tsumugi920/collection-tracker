// 愿望单路由：增删改 + 列表
const express = require('express');
const store = require('../store');

const router = express.Router();

const PRIORITIES = ['high', 'medium', 'low'];

function toNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

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
  if (!partial || body.priority !== undefined) {
    const priority = body.priority ?? 'medium';
    if (!PRIORITIES.includes(priority)) errors.push(`优先级必须是 ${PRIORITIES.join(' / ')}`);
    else out.priority = priority;
  }
  if (!partial || body.targetPrice !== undefined) {
    if (body.targetPrice === undefined && !partial) {
      out.targetPrice = 0;
    } else {
      const n = toNumber(body.targetPrice);
      if (Number.isNaN(n) || n < 0) errors.push('预算必须是 ≥ 0 的数字');
      else out.targetPrice = Math.round(n * 100) / 100;
    }
  }
  if (!partial || body.note !== undefined) out.note = String(body.note ?? '').trim();

  return { errors, out };
}

// GET /api/wishlist?priority=&category=
router.get('/', (req, res) => {
  const { priority, category } = req.query;
  let wishlist = store.load().wishlist.slice();

  if (priority) wishlist = wishlist.filter((w) => w.priority === priority);
  if (category) wishlist = wishlist.filter((w) => w.category === category);

  const order = { high: 0, medium: 1, low: 2 };
  wishlist.sort((a, b) => order[a.priority] - order[b.priority] || String(b.createdAt).localeCompare(String(a.createdAt)));

  res.json(wishlist);
});

router.get('/:id', (req, res) => {
  const wish = store.load().wishlist.find((w) => w.id === req.params.id);
  if (!wish) return res.status(404).json({ error: '愿望单条目不存在' });
  res.json(wish);
});

router.post('/', (req, res) => {
  const { errors, out } = sanitize(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  const now = new Date().toISOString();
  const wish = { id: store.nextId('w'), ...out, createdAt: now, updatedAt: now };
  store.load().wishlist.push(wish);
  store.persist();
  res.status(201).json(wish);
});

router.put('/:id', (req, res) => {
  const data = store.load();
  const wish = data.wishlist.find((w) => w.id === req.params.id);
  if (!wish) return res.status(404).json({ error: '愿望单条目不存在' });

  const { errors, out } = sanitize(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  Object.assign(wish, out, { updatedAt: new Date().toISOString() });
  store.persist();
  res.json(wish);
});

router.delete('/:id', (req, res) => {
  const data = store.load();
  const idx = data.wishlist.findIndex((w) => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '愿望单条目不存在' });

  const [removed] = data.wishlist.splice(idx, 1);
  store.persist();
  res.json({ deleted: removed.id });
});

module.exports = router;
