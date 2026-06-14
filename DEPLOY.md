# GitHub公開手順

このアプリはビルド不要の静的Webアプリです。GitHubに置くだけで公開できます。

## 1. リポジトリを作成する

GitHubで新しいリポジトリを作成します。

おすすめ設定：

```text
Repository name: clover-finder
Visibility: Public
README: なし
.gitignore: なし
License: なし
```

このZIPにはREADME、`.gitignore`、LICENSEが入っているため、GitHub側では追加しなくて大丈夫です。

## 2. ファイルをアップロードする

### ブラウザーでアップロードする場合

1. 作成したリポジトリを開く
2. `Add file` → `Upload files`
3. ZIPを展開した中身をすべてドラッグ＆ドロップ
4. `Commit changes`

### Gitコマンドでアップロードする場合

```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/<GitHubユーザー名>/clover-finder.git
git push -u origin main
```

## 3. GitHub Pagesを有効化する

1. リポジトリの `Settings` を開く
2. 左メニューの `Pages` を開く
3. `Build and deployment` の `Source` で `Deploy from a branch` を選択
4. `Branch` で `main` を選択
5. フォルダは `/root` を選択
6. `Save`

公開URLは通常、以下の形式です。

```text
https://<GitHubユーザー名>.github.io/clover-finder/
```

## 4. スマホで確認する

スマホでGitHub PagesのURLを開き、「カメラ開始」を押します。

カメラが起動しない場合は、以下を確認してください。

- ブラウザーのカメラ権限
- URLが `https://` になっているか
- iPhoneの場合はSafariでも試す
- Androidの場合はChromeでも試す
- GitHub Pagesの公開反映が完了しているか

## 5. 更新する場合

ファイルを編集した後、以下を実行します。

```bash
git add .
git commit -m "Update app"
git push
```

GitHub Pagesには自動的に反映されます。

## 6. リポジトリ説明文の例

GitHubのリポジトリ説明欄には、以下がおすすめです。

```text
スマホカメラで四つ葉のクローバー候補を探す、端末内画像処理の軽量Webアプリ
```

英語なら以下です。

```text
A lightweight on-device web app that helps find four-leaf clover candidates using a smartphone camera.
```

## 注意

このアプリは四つ葉を確実に判定するAIではなく、候補表示型の画像処理プロトタイプです。
