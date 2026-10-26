# collection-tracker 收藏管理

一个前后端完整的小型收藏品管理系统：管理手办、邮票钱币、卡牌、书籍等收藏品，
记录购入价与当前估值，维护愿望单，并查看价值统计与投入趋势。

## 功能

- **收藏品列表**：按分类 / 状态筛选，按名称、存放位置、备注搜索，多种排序；支持新增、编辑、删除
- **愿望单**：想入手的收藏品清单，含优先级与预算，支持增删改，可一键「转为收藏」
- **价值统计与趋势**：在库总估值、累计投入、分类价值分布、状态分布、按月的投入趋势图（纯 SVG 绘制）

## 技术栈

- 后端：Node.js + Express，REST API，数据持久化到 `server/data.json` 文件
- 前端：原生 HTML / CSS / JavaScript（ES Modules），由后端静态托管，无需构建

## 目录结构

```
collection-tracker/
├── package.json              # 启动脚本 npm start（端口 3017）
├── README.md
├── server/                   # 后端
│   ├── index.js              # Express 入口：静态托管 client + 挂载 API 路由
│   ├── store.js              # data.json 读写与持久化
│   ├── seed.js               # 内置示例数据（20 件收藏品 + 5 条愿望单）
│   ├── data.json             # 数据文件（首次运行缺失时自动用 seed 重建）
│   └── routes/
│       ├── items.js          # 收藏品增删改查 + 筛选排序
│       ├── wishlist.js       # 愿望单增删改
│       └── stats.js          # 分类与价值汇总、趋势
└── client/                   # 前端
    ├── index.html
    ├── style.css
    ├── app.js                # 入口：标签页切换与视图初始化
    └── js/
        ├── api.js            # REST 请求封装 + 常量与工具函数
        ├── items.js          # 收藏品视图
        ├── wishlist.js       # 愿望单视图
        └── stats.js          # 统计视图与趋势图
```

## 安装与启动

要求 Node.js ≥ 16。

```bash
cd /data/home/zcode-projects/collection-tracker
npm install
npm start
```

启动后打开 <http://localhost:3017> 即可使用（前端页面与 REST API 由同一个进程提供）。

- 默认端口为 **3017**，如需更换：`PORT=8080 npm start`
- 停止服务：在启动终端按 `Ctrl+C`

## REST API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/meta` | 分类、状态、优先级元信息 |
| GET | `/api/items?category=&status=&q=&sort=` | 收藏品列表（可筛选/搜索/排序） |
| GET | `/api/items/:id` | 收藏品详情 |
| POST | `/api/items` | 新增收藏品 |
| PUT | `/api/items/:id` | 编辑收藏品（支持部分字段） |
| DELETE | `/api/items/:id` | 删除收藏品 |
| GET | `/api/wishlist` | 愿望单列表 |
| POST | `/api/wishlist` | 加入愿望单 |
| PUT | `/api/wishlist/:id` | 编辑愿望单条目 |
| DELETE | `/api/wishlist/:id` | 删除愿望单条目 |
| GET | `/api/stats` | 价值汇总：总览、分类分布、状态分布、投入趋势 |

字段约定：收藏品 `status` 取值 `owned`（在库）/ `lent`（借出）/ `selling`（出售中）/ `sold`（已售出）；
愿望单 `priority` 取值 `high` / `medium` / `low`。金额单位为元。

## 数据与示例

- 内置 **20 件示例收藏品**与 **5 条愿望单**（定义在 `server/seed.js`）
- 所有增删改都会立即写回 `server/data.json`，重启不丢数据
- 想恢复出厂示例数据：停止服务，删除 `server/data.json`，再 `npm start`

## 快速自测（curl）

```bash
# 列出收藏品
curl -s http://localhost:3017/api/items

# 新增收藏品
curl -s -X POST http://localhost:3017/api/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试藏品","category":"其他","status":"owned","purchasePrice":100,"currentValue":150,"purchaseDate":"2026-10-25"}'

# 价值汇总
curl -s http://localhost:3017/api/stats
```
