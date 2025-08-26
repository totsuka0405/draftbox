// app/about/page.js
export const metadata = {
  title: "このアプリについて | DraftBox",
  description: "DraftBox の目的・主な機能・技術スタック・免責事項について。",
};

export default function AboutPage() {
  return (
    <main className="container">
      <h1 style={{marginBottom:12}}>このアプリについて</h1>

      <section className="card section">
        <p>
          DraftBox は、<strong>Markdown 対応の下書きエディタ</strong>＋<strong>詳細な文字数カウント</strong>を提供する、学習用の個人開発プロジェクトです。
          ログインなしでもカウントとエクスポートが利用でき、ログインするとクラウドに下書きを保存できます。
        </p>

        <h2>主な機能</h2>
        <ul>
          <li>Markdown 下書きの作成・自動保存（ログイン時）</li>
          <li>詳細カウント（改行/空白除外、各種エンコーディングの概算バイト、行数、原稿用紙換算）</li>
          <li>共有リンク（有効期限付き）とエクスポート（.md / .html / .txt）</li>
          <li>検索・フィルタ・並び替え（クライアント側）</li>
          <li>日本語/英語の切り替え</li>
        </ul>

        <h2>技術スタック</h2>
        <ul>
          <li>Next.js (App Router)</li>
          <li>Supabase（認証・DB）</li>
          <li>react-simplemde-editor（Markdown エディタ）</li>
        </ul>

        <h2>免責</h2>
        <p>
          本サービスは学習用で提供しています。可用性や永続性は保証しません。重要な文章は必ずローカルにもバックアップしてください。
        </p>
      </section>
    </main>
  );
}
