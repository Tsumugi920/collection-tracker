// 统计视图：总览卡片、分类价值分布、状态分布、投入趋势 SVG 图
import { API, STATUS_LABELS, money, esc, toast } from './api.js';

export function initStatsView(root) {
  const els = {
    overview: root.querySelector('#stats-overview'),
    categoryBody: root.querySelector('#stats-category-body'),
    status: root.querySelector('#stats-status'),
    trend: root.querySelector('#stats-trend'),
    updated: root.querySelector('#stats-updated'),
  };

  async function refresh() {
    let stats;
    try {
      stats = await API.getStats();
    } catch (err) {
      els.overview.innerHTML = `<div class="empty">加载失败：${esc(err.message)}</div>`;
      return;
    }
    render(stats);
  }

  function render(stats) {
    const o = stats.overview;
    els.overview.innerHTML = `
      <div class="stat-card">
        <span class="stat-num">${o.totalItems}</span>
        <span class="stat-label">收藏品总数</span>
        <span class="stat-sub">在库 ${o.activeItems} 件 / 已售出 ${o.soldItems} 件</span>
      </div>
      <div class="stat-card accent">
        <span class="stat-num">${money(o.currentValue)}</span>
        <span class="stat-label">在库总估值</span>
        <span class="stat-sub">不含已售出藏品</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">${money(o.totalCost)}</span>
        <span class="stat-label">累计购入投入</span>
        <span class="stat-sub">其中在库 ${money(o.activeCost)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">${o.wishlistCount} 条</span>
        <span class="stat-label">愿望单</span>
        <span class="stat-sub">预算合计 ${money(o.wishlistTarget)}</span>
      </div>
    `;

    const max = Math.max(1, ...stats.byCategory.map((r) => r.value));
    els.categoryBody.innerHTML = stats.byCategory.map((r) => `
      <tr>
        <td>${esc(r.category)}</td>
        <td>${r.count} 件</td>
        <td class="num">${money(r.value)}</td>
        <td class="num muted">${money(r.cost)}</td>
        <td class="bar-cell"><div class="bar"><div class="bar-fill" style="width:${Math.round((r.value / max) * 100)}%"></div></div></td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="empty">暂无数据</td></tr>';

    els.status.innerHTML = Object.entries(stats.byStatus).map(([key, count]) => `
      <div class="status-pill"><b>${count}</b><span>${STATUS_LABELS[key] || esc(key)}</span></div>
    `).join('');

    els.trend.innerHTML = renderTrendChart(stats.trend.slice(-12));
    els.updated.textContent = `更新于 ${new Date(stats.generatedAt).toLocaleString('zh-CN')}`;
  }

  // 用 SVG 画趋势：柱状 = 每月新增件数，折线 = 累计投入
  function renderTrendChart(trend) {
    if (!trend.length) return '<div class="empty">暂无趋势数据，先去添加几件收藏品吧。</div>';

    const W = 760, H = 260;
    const padL = 64, padR = 16, padT = 20, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const maxCum = Math.max(...trend.map((t) => t.cumulative), 1);
    const maxAdded = Math.max(...trend.map((t) => t.added), 1);
    const x = (i) => padL + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
    const yCum = (v) => padT + innerH - (v / maxCum) * innerH;
    const barW = Math.min(30, (innerW / trend.length) * 0.5);
    const barH = (v) => (v / maxAdded) * (innerH * 0.55);
    const axisText = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${Math.round(v)}`);

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((r) => {
      const y = padT + innerH - r * innerH;
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="grid"/>
        <text x="${padL - 8}" y="${y + 4}" class="axis" text-anchor="end">${axisText(maxCum * r)}</text>`;
    }).join('');

    const bars = trend.map((t, i) => {
      const h = barH(t.added);
      const bx = x(i) - barW / 2;
      const by = padT + innerH - h;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" class="bar-added">
        <title>${t.month} 新增 ${t.added} 件，投入 ${money(t.cost)}</title>
      </rect>`;
    }).join('');

    const line = trend.map((t, i) => `${x(i).toFixed(1)},${yCum(t.cumulative).toFixed(1)}`).join(' ');
    const dots = trend.map((t, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${yCum(t.cumulative).toFixed(1)}" r="3.5" class="dot">
        <title>${t.month} 累计投入 ${money(t.cumulative)}</title>
      </circle>`).join('');
    const labels = trend.map((t, i) => {
      if (trend.length > 8 && i % 2 === 1) return '';
      return `<text x="${x(i).toFixed(1)}" y="${H - padB + 20}" class="axis" text-anchor="middle">${esc(t.month.slice(2))}</text>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="投入趋势图">
      ${gridLines}
      ${bars}
      <polyline points="${line}" class="trend-line"/>
      ${dots}
      ${labels}
      <text x="${padL}" y="${padT - 6}" class="axis">累计投入（元）</text>
    </svg>`;
  }

  refresh();
  return { refresh };
}
