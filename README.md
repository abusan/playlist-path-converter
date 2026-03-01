# playlist-path-converter

## これは何？
PCで作成したm3u8プレイリストの絶対パスをポータブルオーディオデバイスなどで使用するために相対パスへ変換します。  
Android OSを採用したDAP上で動作するメディアプレーヤーアプリへPCで作成したプレイリストをインポートする際に発生するパスの不一致を解決します。  

## 環境
node.js、npm、npxのインストールが必要です。  
動作確認ではfoobar2000から書き出したプレイリストファイルを使用しています。他のアプリケーションから書き出したプレイリストファイルでは、予期せぬエラーが発生する可能性があります。  


## 注意点
### プレイリストファイルはUTF-8で作成してください
プレイリストファイルの文字コードがUTF-8(BOMなし)であることを前提として動作します。  
文字コードが違う場合は、事前に別のツールで文字コードを変換してください。  

### powershellでの実行について
Powershellでの実行時に出力が文字化けする現象を確認しています。文字化けが発生した場合は以下のコマンドを実行してください。  

```powershell
chcp 65001
$OutputEncoding = [System.Text.UTF8Encoding]::new()
npx ts-node src/index.ts <scanDir> <baseDir>
```

## 使い方

### 事前準備
1. 必要なライブラリのインストール
```
npm install
```

2. ビルド
```
npm run build
```

### 基本的な使い方
#### コマンドモード
```
npm run start <scanDir> <baseDir>
```

scanDir と baseDir を指定するとコマンドモードで起動します。  

#### 対話モード
```
npm run start
```

引数を渡さない場合は対話モードで起動します。  

#### .envからの読み込み
```
事前に実行
cp env.example .env

npm run start:env
または
npm run start load-env
```

env.example をコピーして .env を作成し、load-env オプション、または start:env で起動すると .env から設定を読み込むことができます。  
引数を渡す必要がないため、実行する内容が毎回決まっている場合に便利です。  
`load-env` が指定された場合、他のコマンドライン引数は全て無視されます。  


## オプション

### 必須
- scanDir
  - 処理したいm3u8ファイルを格納しているディレクトリを指定します
- baseDir
  - 相対パスの基準となるディレクトリを指定します
  - ここで指定したディレクトリからの相対パスとなるように変換処理が実行されます

### 任意
- backup, bk
  - 実行時にバックアップを作成します
  - バックアップは対象ディレクトリ内に `backup_YYYYMMDDHHMMSS` という名前で作成されます
- windows, win, w
  - Windows 形式のパスに変換します
- linux, posix, l
  - Linus 形式のパスに変換します
  - Android アプリにプレイリストをインポートしたい場合はこちらを使用します
- remove-comments, rc
  - コメント行を削除します
  - シャープ記号から始まる行をコメント行として処理します
- remove-empty, re
  - 空行を削除します
- remove-all, ra
  - コメント行と空行を削除します
- dry-run:filename, dry:filename, dr:filename
  - テスト実行を行います
  - 実際にファイルへ書き込む処理を行わずに変換結果を表示します
  - 実行前に処理内容を確認したい場合に有効です
  - dry-run の対象とできるのは1回の実行につき1ファイルのみです
    - filename を指定する必要があります

### .env で指定できる変数
.env ファイルに設定を書き込んでおくことで、コマンドライン引数を指定する必要がなくなります。  

- SCAN_DIR
  - scanDir と同様にパスを指定します
- BASE_DIR
  - baseDir と同様にパスを指定します
- OPT_MAKE_BACKUP (true, false)
  - バックアップを作成するかどうかを設定します
- OPT_REMOVE_ALL (true, false)
  - コメント行と空行を削除します
- OPT_REMOVE_HASH_COMMENTS (true, false)
  - コメント行を削除します
- OPT_REMOVE_EMPTY_LINES (true, false)
  - 空行を削除します
- OPT_OUTPUT_FORMAT (windows, linux)
  - 出力形式を指定します
- OPT_DRY_RUN (true, false)
  - テスト実行を行います
  - true を設定した場合は OPT_DRY_RUN_FILE にファイル名を設定する必要があります
- OPT_DRY_RUN_FILE
  - テスト実行を行うファイル名を指定します
  - OPT_DRY_RUN が true の場合は必須です

#### 対話モードでの .env
対話モードでは、何も入力せずにEnterキーを押した際のデフォルト値に .env の値が使用されます。  
