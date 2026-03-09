# サッカー・タクティカルボード (Soccer Tactical Board)

直感的な操作でサッカーの戦術図を作成・保存できる、Webベースのタクティカルボードアプリケーションです。

## 🌟 主な機能

- **インタラクティブなボード**: ドラッグ＆ドロップで選手やボールを配置可能。
- **作図ツール**: 直線、矢印、フリーハンドでの描き込みに対応。
- **高度な範囲選択**: マウスドラッグによる複数オブジェクトの一括選択と移動。
- **ショートカットキー**: 
  - `Ctrl/Cmd + C / V`: コピー＆ペースト
  - `Backspace / Delete`: 削除
  - `Ctrl/Cmd + Z / Y`: 元に戻す(Undo) / やり直し(Redo)
- **フォーメーション・プリセット**: 4-4-2 や 4-2-3-1 をワンクリックで展開。
- **テンプレート保存**: 作成した戦術を名前をつけてデータベースに保存し、いつでも呼び出し可能。
- **高画質エクスポート**: 「ピッチのみ」または「ボード全体（背景込み）」を選択して画像として保存。

## 🛠 技術スタック

- **Frontend**: React, Konva (react-konva), Lucide React
- **Backend API**: Express (Local), Vercel Serverless Functions
- **Real-time Sync**: Ably (Realtime Pub/Sub + Presence)
- **Database**: 
  - ローカル: Prisma + SQLite
  - 本番 (Vercel): @vercel/postgres (SQL直接実行)
- **Development**: Vite, TypeScript, tsx

## 🚀 セットアップ

### 環境変数の準備

`.env` ファイルを作成し、データベースURLとAbly APIキーを設定してください。

```env
# ローカル開発用 (デフォルト)
DATABASE_URL="file:./dev.db"

# Ably APIキー (リアルタイム同期用)
# ※必ずサーバー側変数として設定してください（VITE_ プレフィックスなし）
ABLY_API_KEY="your-ably-api-key"

# 本番環境 (Neonなど) 用
# DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

### 開発サーバーの起動

```bash
npm install
npm run dev
```

ローカル環境では Prisma が `dev.db` (SQLite) を自動的にセットアップします。
フロントエンドはポート 5173 で起動します。

### 本番環境 (Vercel) へのデプロイ

1. Vercel プロジェクトに `POSTGRES_URL` と `VITE_ABLY_API_KEY` を設定します。
2. デプロイ時に `npm run build` が実行され、以下の処理が自動で行われます：
   - `db:prepare`: `DATABASE_URL` に応じて Prisma スキーマのプロバイダーを切り替え
   - `prisma db push`: スキーマをデータベースに反映
   - `prisma generate`: Prisma Client の生成

## 📁 ディレクトリ構成

- `/src`: フロントエンドのReactコンポーネントとUI
- `/api`: Vercel Serverless Functions (Backend API)
- `/server`: ローカル開発用のAPIブリッジサーバー
- `/prisma`: データベーススキーマとマイグレーション
- `/scripts`: データベースの準備用スクリプト

## 📝 ライセンス

MIT License
