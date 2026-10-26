// 数据持久化层：所有数据读写 server/data.json，写入即时落盘。
const fs = require('fs');
const path = require('path');
const { buildSeed } = require('./seed');

const DATA_FILE = path.join(__dirname, 'data.json');
let cache = null;

function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.wishlist)) {
      throw new Error('结构不正确');
    }
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = buildSeed().categories;
    }
    cache = parsed;
  } catch (err) {
    console.warn('[store] data.json 不可用（%s），已用内置示例数据重建。', err.message);
    cache = buildSeed();
    persist();
  }
  return cache;
}

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

module.exports = { load, persist, nextId, DATA_FILE };
