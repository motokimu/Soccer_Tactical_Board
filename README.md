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
- **Database**: Prisma (ORM)
  - ローカル: SQLite
  - 本番: Neon (PostgreSQL)
- **Development**: Vite, TypeScript, tsx

## 🚀 セットアップ

### 環境変数の準備

`.env` ファイルを作成し、データベースURLを設定してください。

```env
# ローカル開発用 (デフォルト)
DATABASE_URL="file:./dev.db"

# 本番環境 (Neonなど) 用
# DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

### 開発サーバーの起動

```bash
npm install
npm run dev
```

APIサーバーはポート 3001、フロントエンドはポート 5173 で起動します。

## 📁 ディレクトリ構成

- `/src`: フロントエンドのReactコンポーネントとUI
- `/api`: Vercel Serverless Functions (Backend API)
- `/server`: ローカル開発用のAPIブリッジサーバー
- `/prisma`: データベーススキーマとマイグレーション
- `/scripts`: データベースの準備用スクリプト

## 📝 ライセンス

MIT License
