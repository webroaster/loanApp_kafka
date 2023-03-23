# ローン申請・審査アプリ

## producer

> Kafka のプロデューサー側の処理とフロント側のローン申請

```cmd
$ cd producer/server
$ npm run dev # ビルドとnodeを実行

$ cd producer/client
$ npm run dev # ローン申請のVueを起動
```

## consumer

> Kafka のコンシューマー側の処理とフロント側のローン認証と認証済ユーザーの一覧表
> 示

```cmd
$ cd consumer/server
$ npm run dev # ビルドとnodeを実行

$ cd consumer/client
$ npm run dev # ローン審査のVueを起動
```

---

## 使い方

- docker を起動してコンテナに入りトピックを作成する
- Producer、Consumer をそれぞれ起動

1. Producer のローン申請で名前を入力すると Kafka のトピックに名前が格納される
2. Consumer で申請ユーザー取得ボタンを押すとそのトピックにある申請者の名前が一覧
   で表示。そのときトピック内で名前が重複している場合は統合され、また DB にある
   認証済ユーザーとも比較されて、認証されていないユーザーのみが一覧表示される。
3. 認可するボタンを押すと Hasura を経由して DB に認証済ユーザーとして登録される

---
