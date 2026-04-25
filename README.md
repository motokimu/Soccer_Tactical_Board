# サッカー・タクティカルボード (Soccer Tactical Board)

直感的な操作でサッカーの戦術図を作成・保存・共有できる、Webベースのタクティカルボードアプリケーションです。

## 主な機能

### エディタ
- **インタラクティブなボード**: ドラッグ＆ドロップで選手やボールを配置。
- **作図ツール**: 直線・矢印・フリーハンドでの描き込みに対応。
- **範囲選択**: マウスドラッグによる複数オブジェクトの一括選択と移動。
- **ボードタイトルの編集**: ヘッダーのタイトルをクリックしてインラインで変更可能。
- **ズームコントロール**: ヘッダーの +/− ボタンまたはパーセント入力で 10%〜200% の範囲でズーム。
- **フォーメーション・プリセット**: 4-4-2 や 4-2-3-1 などをワンクリックで展開。
- **高画質エクスポート**: 「ピッチのみ」または「ボード全体（背景込み）」を選択して画像として保存。
- **ショートカットキー**:
  - `Ctrl/Cmd + C / V`: コピー＆ペースト
  - `Backspace / Delete`: 削除
  - `Ctrl/Cmd + Z / Y`: Undo / Redo

### リアルタイムコラボレーション
- **Ably による同期**: 同じボードを複数人で同時編集でき、操作が即時反映される。
- **カーソル共有**: 他のユーザーのカーソル位置をリアルタイムで表示。
- **ユーザー名・カラー**: 参加者ごとに名前と識別色を設定。
- **Ablyトークン認証**: サーバー側でトークンを発行し、APIキーをクライアントに露出させない。

### ダッシュボード
- **テンプレート管理**: 作成した戦術を名前付きで保存し、一覧から呼び出し可能。
- **検索・ソート**: 名前検索と更新日/作成日でのソートに対応。
- **ページネーション**: 「さらに表示」で追加読み込み。
- **ボードのコピー**: 既存ボードを複製して新しいボードを作成。
- **安全な削除**: カウントダウン付き確認でのみボードを削除。

### セキュリティ
- **パスワード保護**: アプリ全体を静的パスワードで保護するログイン画面。
- **API バリデーション**: 入力値の検証とレスポンスフィールドの制限。

## 技術スタック

- **Frontend**: React 19, Konva (react-konva), Lucide React, React Router v7
- **Backend API**: Express (Local), Vercel Serverless Functions
- **Real-time Sync**: Ably (Realtime Pub/Sub + Presence)
- **Database**:
  - ローカル: Prisma + SQLite
  - 本番 (Vercel): @vercel/postgres (SQL直接実行)
- **Build**: Vite, TypeScript, tsx

## セットアップ

### 環境変数の準備

`.env` ファイルを作成し、以下を設定してください。

```env
# ローカル開発用 (デフォルト)
DATABASE_URL="file:./dev.db"

# Ably APIキー (リアルタイム同期用)
# ※サーバー側変数として設定（VITE_ プレフィックスなし）
ABLY_API_KEY="your-ably-api-key"

# 本番環境 (Neonなど) 用
# DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

### 開発サーバーの起動

```bash
npm install
npm run dev
```

ローカル環境では Prisma が `dev.db` (SQLite) を自動セットアップします。
フロントエンドはポート 5173、ローカルAPIサーバーはポート 3001 で起動します。

### 本番環境 (Vercel) へのデプロイ

1. Vercel プロジェクトに `POSTGRES_URL` と `ABLY_API_KEY` を設定します。
2. `npm run build` 実行時に以下が自動で行われます:
   - `db:prepare`: `DATABASE_URL` に応じて Prisma スキーマのプロバイダーを切り替え
   - `prisma db push`: スキーマをデータベースに反映
   - `prisma generate`: Prisma Client の生成

## ディレクトリ構成

```
/src        フロントエンド (React コンポーネント・スタイル)
/api        Vercel Serverless Functions (Backend API)
/server     ローカル開発用 API ブリッジサーバー
/prisma     データベーススキーマ
/scripts    DB 準備用スクリプト
```

## ライセンス

MIT License
