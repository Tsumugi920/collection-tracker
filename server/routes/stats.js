// 统计路由：价值总览、分类分布、状态分布、按月投入趋势
const express = require('express');
const store = require('../store');
const { CATEGORIES } = require('../seed');

const router = express.Router();

const STATUSES = ['owned', 'lent', 'selling', 'sold'];

const round2 = (n) => Math.round(n * 100) / 100;
const sum = (list, key) => list.reduce((acc, it) => acc + (Number(it[key]) || 0), 0);

// GET /api/stats
router.get('/', (req, res) => {
  const data = store.load();
  const items = data.items;
  const wishlist = data.wishlist;

  // 已售出的藏品不计入当前在库估值
  const active = items.filter((it) => it.status !== 'sold');

  // 分类分布（在库）
  const byCategory = new Map();
  for (const it of active) {
    const row = byCategory.get(it.category) || { category: it.category, count: 0, value: 0, cost: 0 };
    row.count += 1;
    row.value += Number(it.currentValue) || 0;
    row.cost += Number(it.purchasePrice) || 0;
    byCategory.set(it.category, row);
  }

  // 状态分布（全部，含已售出）
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const it of items) {
    if (it.status in byStatus) byStatus[it.status] += 1;
  }

  // 趋势：按购入月份汇总新增件数与投入，并计算累计投入
  const byMonth = new Map();
  for (const it of items) {
    const month = String(it.purchaseDate || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const row = byMonth.get(month) || { month, added: 0, cost: 0 };
    row.added += 1;
    row.cost += Number(it.purchasePrice) || 0;
    byMonth.set(month, row);
  }
  let cumulative = 0;
  const trend = [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      cumulative += m.cost;
      return { ...m, cost: round2(m.cost), cumulative: round2(cumulative) };
    });

  res.json({
    overview: {
      totalItems: items.length,
      activeItems: active.length,
      soldItems: items.length - active.length,
      totalCost: round2(sum(items, 'purchasePrice')),
      activeCost: round2(sum(active, 'purchasePrice')),
      currentValue: round2(sum(active, 'currentValue')),
      wishlistCount: wishlist.length,
      wishlistTarget: round2(sum(wishlist, 'targetPrice')),
      categories: data.categories && data.categories.length ? data.categories : CATEGORIES,
    },
    byCategory: [...byCategory.values()]
      .sort((a, b) => b.value - a.value)
      .map((r) => ({ ...r, value: round2(r.value), cost: round2(r.cost) })),
    byStatus,
    trend,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = router;
