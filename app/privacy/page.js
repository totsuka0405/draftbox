// app/privacy/page.js
export const metadata = {
  title: "プライバシーポリシー | DraftBox",
  description: "DraftBox の個人情報の取り扱い、データ保存、第三者提供、問い合わせ窓口について。",
};

export default function PrivacyPage() {
  const mail = "draftbox.app.dev@gmail.com";
  return (
    <main className="container">
      <h1 style={{marginBottom:12}}>プライバシーポリシー</h1>

      <section className="card section">
        <p className="kicker">最終更新日: 2025-08-25</p>

        <h2>基本方針</h2>
        <p>
          DraftBox（以下「本サービス」）は、学習用・個人開発の下書き保存ツールです。ユーザーの情報を適切に取り扱い、保護に努めます。
        </p>

        <h2>取得する情報</h2>
        <ul>
          <li><strong>アカウント情報</strong>：メールアドレス（認証・通知に利用）</li>
          <li><strong>下書きデータ</strong>：タイトル・本文・更新日時 等</li>
          <li><strong>技術情報</strong>：アクセスログ、エラーログ等（品質改善のため匿名で収集することがあります）</li>
        </ul>

        <h2>利用目的</h2>
        <ul>
          <li>下書きの保存・表示・共有リンクの発行</li>
          <li>アカウントの認証、パスワードリセット</li>
          <li>品質改善・不具合対応・不正利用の抑止</li>
        </ul>

        <h2>第三者提供</h2>
        <p>
          法令に基づく場合を除き、本人の同意なく第三者提供は行いません。データは主に Supabase（ホスティング基盤）に保存されます。
        </p>

        <h2>保存期間・削除</h2>
        <ul>
          <li>ユーザーが自ら下書きを削除できます。</li>
          <li>一定期間アクセスのないデータは、保守の都合で削除・アーカイブされる場合があります。</li>
        </ul>

        <h2>安全管理</h2>
        <p>通信は HTTPS を前提とし、認証・行レベルセキュリティ（RLS）など必要な対策を講じています。</p>

        <h2>未成年の利用</h2>
        <p>保護者の同意なく個人情報を提供しないでください。</p>

        <h2>お問い合わせ</h2>
        <p>本ポリシーに関するお問い合わせは、以下へご連絡ください：</p>
        <p>
          ✉️ <a href={`mailto:${mail}`}>{mail}</a>
        </p>
      </section>
    </main>
  );
}
