# GitHub公開手順

このアプリはビルド不要の静的Webアプリです。GitHubに置くだけで公開できます。

## 1. リポジトリを作成する

GitHubで新しいリポジトリを作成します。

```text
Repository name: clover-finder
Visibility: Public
README: なし
.gitignore: なし
License: なし
```

## 2. ファイルをアップロードする

1. 作成したリポジトリを開く
2. `Add file` → `Upload files`
3. ZIPを展開した中身をすべてドラッグ＆ドロップ
4. `Commit changes`

`index.html` がリポジトリ直下にあることを確認してください。

## 3. GitHub Pagesを有効化する

1. リポジトリの `Settings` を開く
2. 左メニューの `Pages` を開く
3. `Build and deployment` の `Source` で `Deploy from a branch` を選択
4. `Branch` で `main` を選択
5. フォルダは `/(root)` を選択
6. `Save`

公開URLは通常、以下の形式です。

```text
https://<GitHubユーザー名>.github.io/clover-finder/
```
