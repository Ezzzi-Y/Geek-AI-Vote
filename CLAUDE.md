# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

这是一个**一次性活动投票网站**，只使用一次，不长期维护。所有代码必须保持极简，禁止引入复杂结构。

## 常用命令

```bash
# 后端（Node.js + Express）
cd backend
npm install
npm run dev                        # 开发服务器，端口 8000

# 前端（Next.js）
cd frontend
npm install
npm run dev                        # 开发服务器，端口 3000
npm run build && npm run start     # 生产运行
```

## 架构说明

- **后端**：所有逻辑写在单一文件 `backend/index.js`。Express + SQLite（`better-sqlite3`），直接使用 SQL，无 ORM。GitHub OAuth 通过 `passport-github2` 实现，session 存储在内存或 SQLite。
- **前端**：Next.js App Router，只有一个页面 `frontend/app/page.tsx`。全局样式在 `frontend/styles/globals.css`，其中定义 `.glass-card` 和 `.glass-option` 组件类。
- **数据流**：前端请求 `NEXT_PUBLIC_API_URL`（默认 `http://localhost:8000`）。主要接口：
  - `GET /options` — 获取所有投票项（按票数降序）
  - `POST /options` — 创建投票项（登录用户，每人限一次，自动 +1 票）
  - `POST /vote/:id` — 投票（登录用户，每人限投一次）
  - `GET /export` — 导出 CSV（投票项 + 票数）
  - `GET /auth/github` — GitHub OAuth 入口
  - `GET /auth/github/callback` — GitHub OAuth 回调
  - `GET /me` — 获取当前登录用户信息
  - `POST /logout` — 登出

### 数据库设计（SQLite，3 张表）

**`users`** — GitHub 身份
```sql
id          INTEGER PRIMARY KEY
github_id   TEXT UNIQUE NOT NULL  -- GitHub 返回的唯一用户 ID
github_login TEXT NOT NULL        -- GitHub 用户名（用于展示）
created_at  DATETIME
```

**`options`** — 投票项
```sql
id          INTEGER PRIMARY KEY
label       TEXT NOT NULL
creator_id  INTEGER REFERENCES users(id)
created_at  DATETIME
```
票数不冗余存储，通过 `COUNT(votes)` 实时聚合。

**`votes`** — 投票记录
```sql
id          INTEGER PRIMARY KEY
user_id     INTEGER UNIQUE REFERENCES users(id)  -- UNIQUE 保证每人只投一次
option_id   INTEGER REFERENCES options(id)
created_at  DATETIME
```

**创建投票项**在事务内执行：先 `INSERT INTO options`，再 `INSERT INTO votes`（创建者自动算已投票，同时触发 `UNIQUE(user_id)` 防止再投他人）。

**排行查询**：
```sql
SELECT o.id, o.label, COUNT(v.id) AS votes
FROM options o LEFT JOIN votes v ON v.option_id = o.id
GROUP BY o.id ORDER BY votes DESC
```
导出 CSV 复用同一条查询。

## 业务规则

- 投票标题在后端代码中硬编码，不存数据库
- 每个用户只能创建一个投票项；创建即自动计 1 票（创建者视为已投票）
- 每个用户只能投票一次（投给他人或自己创建的选项均算）
- 投票项一经创建不可删除、不可修改
- 无管理员角色，所有用户权限一致
- 导出格式：CSV，字段为 `label,votes`

## UI 规范（强制）

所有 UI 修改必须严格遵循 `glassmorphism.md`（Apple Liquid Glass 风格）。核心要求：
- 必须有渐变或图片底层背景（禁止纯色背景）
- `backdrop-blur-[40px]` 或更高 + `backdrop-saturate-[180%]`
- 多层阴影（外层深度 + inset 顶部高光 + 边缘光晕）
- 内发光渐变叠加层 `linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)`
- 边框 `border-white/20`，hover 提升至 `border-white/40`
- 过渡使用 `duration-500` + spring easing `cubic-bezier(0.16,1,0.3,1)`
- 每次生成代码后必须按 `glassmorphism.md` 的自检清单核查

## 约束（禁止事项）

- 后端逻辑只能写在 `backend/index.js`，禁止拆分模块
- 禁止引入 ORM、数据库迁移工具
- 禁止添加后台管理页面或管理员功能
- 前端只有一个页面，禁止新增页面（除非用户明确要求）
- 禁止过度设计：不需要的功能一律不加
