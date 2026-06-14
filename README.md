# 四つ葉ファインダー

スマホのカメラでクローバーを映し、四つ葉らしい候補を赤・黄色の丸で表示する軽量Webアプリです。

![app type](https://img.shields.io/badge/type-static%20web%20app-green)
![privacy](https://img.shields.io/badge/privacy-on--device-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

## 概要

**四つ葉ファインダー**は、スマホのカメラ映像をブラウザー上で解析し、四つ葉のクローバーらしい形を候補表示するプロトタイプです。

画像は外部サーバーへ送信せず、端末内の JavaScript と Canvas だけで処理します。

## デモ公開

GitHub Pagesで公開すると、以下のようなURLでアクセスできます。

```text
https://<GitHubユーザー名>.github.io/clover-finder/
```

例：

```text
https://ushisuke.github.io/clover-finder/
```

## 主な機能

- スマホ背面カメラの利用
- 緑色の葉の抽出
- 四つ葉らしい「4方向の広がり」の候補検出
- 赤・黄色の丸による候補表示
- 検出の厳しさ調整
- 候補サイズ調整
- 端末内解析
- PWA風の静的Webアプリ構成

## 使い方

1. スマホでアプリURLを開きます。
2. 「カメラ開始」を押します。
3. クローバーの群生にカメラを向けます。
4. 赤い丸または黄色い丸が出た場所を目視確認します。
5. 候補が多すぎる場合は「検出の厳しさ」を上げます。
6. 候補が出ない場合は「検出の厳しさ」を下げます。

## 設置方法

### GitHubにアップロードする場合

1. GitHubで新しいリポジトリを作成します。
2. リポジトリ名を `clover-finder` などにします。
3. このフォルダ内のファイルをすべてアップロードします。
4. `Settings` → `Pages` を開きます。
5. `Build and deployment` で `Deploy from a branch` を選びます。
6. Branchを `main`、Folderを `/root` にして保存します。
7. 数分後、GitHub PagesのURLにアクセスします。

詳しい手順は `DEPLOY.md` を見てください。

### コマンドでアップロードする場合

```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/<GitHubユーザー名>/clover-finder.git
git push -u origin main
```

その後、GitHubの `Settings` → `Pages` から公開設定を行います。

## ローカルで試す

PCでこのフォルダを開き、以下を実行します。

```bash
python -m http.server 8080
```

同じPCでは以下で開けます。

```text
http://localhost:8080/
```

スマホから同一Wi-Fiでアクセスする場合は、PCのIPアドレスを使います。

```text
http://<PCのIPアドレス>:8080/
```

ただし、スマホブラウザーでは `http://` のページからカメラを利用できない場合があります。GitHub Pagesのような `https://` 環境での利用がおすすめです。

## 仕組み

1. `getUserMedia()` でカメラ映像を取得します。
2. 映像を Canvas に縮小描画します。
3. 画素の色を見て、緑色の領域を抽出します。
4. 候補点の周囲について、4方向に緑の密度が高く、斜め方向に隙間があるかを採点します。
5. スコアの高い候補を画面に重ねて表示します。

## 精度について

このアプリは初版プロトタイプです。学習済みAIモデルではありません。

以下の条件では誤検出しやすくなります。

- 葉が密集しすぎている
- 影が強い
- 葉が重なっている
- クローバー以外の草が多い
- 風で葉が大きく揺れている
- カメラが近すぎる、または遠すぎる

実用時は、赤い丸を「発見場所」ではなく「確認すべき候補」として使ってください。

## 今後の改善案

- 実写画像を集めたAIモデル化
- TensorFlow Lite / MediaPipe / YOLO系モデルの導入
- 撮影画像からの静止画解析
- 候補の保存機能
- GPS位置メモ
- 検出精度のフィードバック機能
- 日本語・英語切り替え

## プライバシー

このアプリは、カメラ映像を外部サーバーに送信しません。ブラウザー上で端末内処理します。

## ライセンス

MIT License
