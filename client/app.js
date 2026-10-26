// collection-tracker 前端入口：初始化三个视图，处理标签页切换。
// 每次切换标签都会刷新对应视图，保证数据是最新的。
import { initItemsView } from './js/items.js';
import { initWishlistView } from './js/wishlist.js';
import { initStatsView } from './js/stats.js';

const views = {
  items: initItemsView(document.querySelector('#view-items')),
  wishlist: initWishlistView(document.querySelector('#view-wishlist')),
  stats: initStatsView(document.querySelector('#view-stats')),
};

const tabs = document.querySelectorAll('#tabs .tab');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.toggle('active', t === tab));
    const name = tab.dataset.tab;
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    views[name]?.refresh();
  });
});
