// 愿望单视图：列表、加入 / 编辑 / 删除、一键「转为收藏」
import { API, PRIORITY_LABELS, getCategories, money, esc, today, toast } from './api.js';

function fillSelect(select, options) {
  select.innerHTML = options.map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`).join('');
}

export function initWishlistView(root) {
  const els = {
    count: root.querySelector('#wishlist-count'),
    list: root.querySelector('#wishlist-list'),
    addBtn: root.querySelector('#btn-add-wish'),
    modal: root.querySelector('#wish-modal'),
  };
  const form = els.modal.querySelector('#wish-form');
  const formTitle = els.modal.querySelector('.modal-title');

  let editingId = null;
  let categories = [];

  // ---------- 数据加载与渲染 ----------
  async function refresh() {
    try {
      const wishlist = await API.getWishlist();
      render(wishlist);
    } catch (err) {
      els.list.innerHTML = `<div class="empty">加载失败：${esc(err.message)}</div>`;
    }
  }

  function render(wishlist) {
    const budget = wishlist.reduce((acc, w) => acc + (Number(w.targetPrice) || 0), 0);
    els.count.textContent = `共 ${wishlist.length} 条愿望 · 预算合计 ${money(budget)}`;
    if (!wishlist.length) {
      els.list.innerHTML = '<div class="empty">愿望单还是空的，点击「加入愿望单」记下想入手的收藏品吧。</div>';
      return;
    }
    els.list.innerHTML = wishlist.map((w) => `
      <article class="wish-card" data-id="${esc(w.id)}">
        <div class="wish-main">
          <h3>${esc(w.name)}</h3>
          <div class="chips">
            <span class="chip chip-cat">${esc(w.category)}</span>
            <span class="chip chip-priority-${esc(w.priority)}">优先级 ${PRIORITY_LABELS[w.priority] || esc(w.priority)}</span>
          </div>
          <p class="wish-note">${esc(w.note) || '—'}</p>
        </div>
        <div class="wish-side">
          <div class="wish-price"><span class="label">预算 / 心理价</span><strong>${money(w.targetPrice)}</strong></div>
          <div class="wish-actions">
            <button class="btn btn-primary btn-sm" data-action="convert">转为收藏</button>
            <button class="btn btn-ghost btn-sm" data-action="edit">编辑</button>
            <button class="btn btn-danger-ghost btn-sm" data-action="delete">删除</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  // ---------- 列表操作（事件委托） ----------
  els.list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.dataset.id;
    const wish = (await API.getWishlist()).find((w) => w.id === id);
    if (!wish) return;

    if (btn.dataset.action === 'edit') {
      openModal(wish);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`确定要删除愿望「${wish.name}」吗？`)) return;
      try {
        await API.deleteWish(id);
        toast('已删除愿望单条目');
        refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    } else if (btn.dataset.action === 'convert') {
      try {
        // 转为收藏：按预算价入账，然后从愿望单移除
        await API.createItem({
          name: wish.name,
          category: wish.category,
          status: 'owned',
          purchasePrice: wish.targetPrice,
          currentValue: wish.targetPrice,
          purchaseDate: today(),
          location: '',
          note: wish.note ? `由愿望单转入：${wish.note}` : '由愿望单转入',
        });
        await API.deleteWish(id);
        toast(`「${wish.name}」已转入收藏品`);
        refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  // ---------- 新增 / 编辑弹窗 ----------
  function openModal(wish = null) {
    editingId = wish ? wish.id : null;
    formTitle.textContent = wish ? '编辑愿望' : '加入愿望单';
    const f = form.elements;
    f.name.value = wish?.name ?? '';
    f.category.value = wish?.category ?? (categories[0] || '');
    f.priority.value = wish?.priority ?? 'medium';
    f.targetPrice.value = wish?.targetPrice ?? '';
    f.note.value = wish?.note ?? '';
    els.modal.classList.remove('hidden');
    f.name.focus();
  }

  function closeModal() {
    els.modal.classList.add('hidden');
    editingId = null;
  }

  els.addBtn.addEventListener('click', () => openModal());
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal();
  });
  els.modal.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeModal));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      name: f.name.value.trim(),
      category: f.category.value,
      priority: f.priority.value,
      targetPrice: f.targetPrice.value === '' ? 0 : f.targetPrice.value,
      note: f.note.value.trim(),
    };
    try {
      if (editingId) {
        await API.updateWish(editingId, body);
        toast('已保存修改');
      } else {
        await API.createWish(body);
        toast('已加入愿望单');
      }
      closeModal();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // ---------- 初始化 ----------
  (async () => {
    categories = await getCategories();
    fillSelect(form.elements.category, categories);
    refresh();
  })();

  return { refresh };
}
