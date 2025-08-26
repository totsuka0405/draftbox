// app/help/page.js
export const metadata = {
  title: "ヘルプ／お問い合わせ | DraftBox",
  description: "DraftBox の使い方・トラブルシュート・お問い合わせ窓口。",
};

export default function HelpPage() {
  const mail = "draftbox.app.dev@gmail.com";
  const mailto = `mailto:${mail}?subject=${encodeURIComponent("【DraftBox】お問い合わせ")}`;

  return (
    <main className="container">
      <h1 style={{marginBottom:12}}>ヘルプ／お問い合わせ</h1>

      <section className="card section">
        <h2>よくある質問（FAQ）</h2>
        <details>
          <summary>ログインしなくても使えますか？</summary>
          <p>はい。ログイン不要で文字数カウントとエクスポートが可能です。保存や共有リンクはログインが必要です。</p>
        </details>
        <details>
          <summary>保存が反映されません</summary>
          <p>ネットワーク状況をご確認ください。エラー表示が出る場合はメッセージを添えてご連絡ください。</p>
        </details>
        <details>
          <summary>共有リンクの有効期限を設定したい</summary>
          <p>エディタ上部の「有効期限」で 24時間／7日／指定日時を選択し、発行または更新してください。</p>
        </details>
        <details>
          <summary>データの削除方法</summary>
          <p>対象の下書きを開き「この下書きを削除」から削除できます。</p>
        </details>
      </section>

      <section className="card section">
        <h2>問い合わせ</h2>
        <p>解決しない場合は、以下の連絡先までご連絡ください。</p>
        <ul>
          <li>メール: <a href={mailto}>{mail}</a></li>
        </ul>
        <p className="kicker">※ スクリーンショットやエラー文言があると解決が早くなります。</p>
      </section>
    </main>
  );
}
