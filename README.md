# 一次性投票网站

## 功能说明

- 投票标题固定预设，不可更改
- 用户通过 GitHub OAuth 登录
- 每个用户最多创建一个投票项，创建即自动获得 1 票
- 用户可以投票给任意他人的投票项（每人只能投一票）
- 投票项按票数从高到低排列
- 投票项不可删除、不可修改
- 无管理员角色
- 支持导出投票项和票数（CSV）

## 数据库结构

后端使用 SQLite，数据库文件默认在 `backend/database.db`，包含 3 张表：

```sql
CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	github_id TEXT UNIQUE NOT NULL,
	github_login TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE options (
	id INTEGER PRIMARY KEY,
	label TEXT NOT NULL,
	creator_id INTEGER NOT NULL REFERENCES users(id),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE votes (
	id INTEGER PRIMARY KEY,
	user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
	option_id INTEGER NOT NULL REFERENCES options(id),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

关键约束：

- `users.github_id UNIQUE`：同一 GitHub 账号只对应一个本地用户
- `votes.user_id UNIQUE`：每个用户只能投票一次
- 创建投票项时在事务内自动写入 `votes`，即“创建即投票 +1”

## 快速启动

### 后端

```bash
cd backend
npm install
npm run dev
# 运行在 http://localhost:8000
```

后端接口：

- `GET /api/options`
- `POST /api/options`
- `POST /api/vote/:id`
- `GET /api/export`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `GET /api/me`
- `POST /api/logout`

### 前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:3000
```

### 环境变量

后端根目录创建 `.env`：

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
SESSION_SECRET=any_random_string
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8000
GITHUB_CALLBACK_URL=http://localhost:8000/api/auth/github/callback
PORT=8000
```

前端根目录创建 `.env.local`：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

GitHub OAuth 应用配置建议：

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:8000/api/auth/github/callback`

## 数据库清除指南

本项目采用“删除数据库文件后自动重建”的方式清库：

1. 停止后端服务（终止 `npm run dev` 进程）。
2. 删除文件 `backend/database.db`。
3. 在 `backend` 目录重新执行 `npm run dev`。
4. 后端启动时会自动重新建表，数据回到空状态。

PowerShell 示例：

```powershell
cd backend
Remove-Item .\database.db -Force
npm run dev
```

## 项目结构

```
├── backend/
│   ├── index.js         # Node.js 全部逻辑（Express + SQLite）
│   ├── database.db      # SQLite 数据库（运行后自动生成）
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── .env.local.example
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx     # 唯一页面
│   ├── styles/
│   │   └── globals.css  # Tailwind + glass 组件类
│   ├── next-env.d.ts
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── postcss.config.js
├── glassmorphism.md     # UI 风格规范（必读）
├── README.md
└── CLAUDE.md
```
