// 与后端 REST API 交互的统一封装，外加各视图共用的小工具函数。

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // 空响应或非 JSON，data 保持 null
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `请求失败（HTTP ${res.status}）`);
  }
  return data;
}

function qs(params) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const API = {
  getMeta: () => request('/meta'),

  getItems: (filters) => request(`/items${qs(filters)}`),
  getItem: (id) => request(`/items/${encodeURIComponent(id)}`),
  createItem: (body) => request('/items', { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (id, body) => request(`/items/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteItem: (id) => request(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getWishlist: (filters) => request(`/wishlist${qs(filters)}`),
  createWish: (body) => request('/wishlist', { method: 'POST', body: JSON.stringify(body) }),
  updateWish: (id, body) => request(`/wishlist/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWish: (id) => request(`/wishlist/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getStats: () => request('/stats'),
};

export const STATUS_LABELS = { owned: '在库', lent: '借出', selling: '出售中', sold: '已售出' };
export const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' };
export const CATEGORY_FALLBACK = ['手办模型', '邮票钱币', '卡牌桌游', '书籍文献', '电子产品', '艺术品', '其他'];

let cachedCategories = null;
export async function getCategories() {
  if (!cachedCategories) {
    try {
      const meta = await API.getMeta();
      cachedCategories = meta.categories?.length ? meta.categories : CATEGORY_FALLBACK;
    } catch {
      cachedCategories = CATEGORY_FALLBACK;
    }
  }
  return cachedCategories;
}

export function money(n) {
  const num = Number(n) || 0;
  return '¥' + num.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

export function fmtDate(iso) {
  return String(iso || '').slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// HTML 转义，防止用户输入注入
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function toast(message, type = 'success') {
  const box = document.getElementById('toast-box');
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' toast-error' : ''}`;
  el.textContent = message;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2400);
}
