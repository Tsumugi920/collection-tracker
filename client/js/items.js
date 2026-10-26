// 收藏品视图：筛选 / 搜索 / 排序、卡片列表、新增与编辑弹窗、删除
import { API, STATUS_LABELS, getCategories, money, esc, fmtDate, today, toast } from './api.js';

function fillSelect(select, options, { allLabel = null } = {}) {
  const parts = [];
  if (allLabel !== null) parts.push(`<option value="">${allLabel}</option>`);
  for (const opt of options) parts.push(`<option value="${esc(opt)}">${esc(opt)}</option>`);
  select.innerHTML = parts.join('');
}

export function initItemsView(root) {
  const els = {
    category: root.querySelector('#filter-category'),
    status: root.querySelector('#filter-status'),
    sort: root.querySelector('#filter-sort'),
    search: root.querySelector('#filter-search'),
    count: root.querySelector('#items-count'),
    grid: root.querySelector('#items-grid'),
    addBtn: root.querySelector('#btn-add-item'),
    modal: root.querySelector('#item-modal'),
  };
  const form = els.modal.querySelector('#item-form');
  const formTitle = els.modal.querySelector('.modal-title');

  let editingId = null;
  let categories = [];

  // ---------- 数据加载与渲染 ----------
  async function refresh() {
    try {
      const items = await API.getItems({
        category: els.category.value,
        status: els.status.value,
        q: els.search.value.trim(),
        sort: els.sort.value,
      });
      render(items);
    } catch (err) {
      els.grid.innerHTML = `<div class="empty">加载失败：${esc(err.message)}</div>`;
    }
  }

  function render(items) {
    els.count.textContent = `共 ${items.length} 件`;
    if (!items.length) {
      els.grid.innerHTML = '<div class="empty">没有符合条件的收藏品，试试调整筛选，或点击「新增收藏品」。</div>';
      return;
    }
    els.grid.innerHTML = items.map((it) => `
      <article class="item-card" data-id="${esc(it.id)}">
        <header>
          <h3>${esc(it.name)}</h3>
          <div class="chips">
            <span class="chip chip-cat">${esc(it.category)}</span>
            <span class="chip chip-status-${esc(it.status)}">${STATUS_LABELS[it.status] || esc(it.status)}</span>
          </div>
        </header>
        <div class="item-values">
          <div><span class="label">当前估值</span><strong>${money(it.currentValue)}</strong></div>
          <div><span class="label">购入价</span><span>${money(it.purchasePrice)}</span></div>
        </div>
        <dl class="item-meta">
          <div><dt>购入日期</dt><dd>${esc(fmtDate(it.purchaseDate)) || '—'}</dd></div>
          <div><dt>存放位置</dt><dd>${esc(it.location) || '—'}</dd></div>
          <div class="wide"><dt>备注</dt><dd>${esc(it.note) || '—'}</dd></div>
        </dl>
        <footer>
          <button class="btn btn-ghost btn-sm" data-action="edit">编辑</button>
          <button class="btn btn-danger-ghost btn-sm" data-action="delete">删除</button>
        </footer>
      </article>
    `).join('');
  }

  // ---------- 卡片操作（事件委托） ----------
  els.grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.dataset.id;

    if (btn.dataset.action === 'edit') {
      try {
        openModal(await API.getItem(id));
      } catch (err) {
        toast(err.message, 'error');
      }
    } else if (btn.dataset.action === 'delete') {
      if (!confirm('确定要删除这件收藏品吗？删除后不可恢复。')) return;
      try {
        await API.deleteItem(id);
        toast('已删除收藏品');
        refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  // ---------- 新增 / 编辑弹窗 ----------
  function openModal(item = null) {
    editingId = item ? item.id : null;
    formTitle.textContent = item ? '编辑收藏品' : '新增收藏品';
    const f = form.elements;
    f.name.value = item?.name ?? '';
    f.category.value = item?.category ?? (categories[0] || '');
    f.status.value = item?.status ?? 'owned';
    f.purchasePrice.value = item?.purchasePrice ?? '';
    f.currentValue.value = item?.currentValue ?? '';
    f.purchaseDate.value = item?.purchaseDate ?? today();
    f.location.value = item?.location ?? '';
    f.note.value = item?.note ?? '';
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
      status: f.status.value,
      purchasePrice: f.purchasePrice.value,
      currentValue: f.currentValue.value,
      purchaseDate: f.purchaseDate.value,
      location: f.location.value.trim(),
      note: f.note.value.trim(),
    };
    try {
      if (editingId) {
        await API.updateItem(editingId, body);
        toast('已保存修改');
      } else {
        await API.createItem(body);
        toast('已新增收藏品');
      }
      closeModal();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // ---------- 筛选事件 ----------
  els.category.addEventListener('change', refresh);
  els.status.addEventListener('change', refresh);
  els.sort.addEventListener('change', refresh);
  let debounceTimer = null;
  els.search.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, 300);
  });

  // ---------- 初始化 ----------
  (async () => {
    categories = await getCategories();
    fillSelect(els.category, categories, { allLabel: '全部分类' });
    fillSelect(form.elements.category, categories);
    els.category.value = '';
    refresh();
  })();

  return { refresh };
}
