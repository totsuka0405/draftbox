// app/limits/page.js
export const metadata = {
  title: "利用上限 | DraftBox",
  description: "DraftBox の無料枠・保存件数・本文サイズ・タイトル長の上限について。",
};

export default function LimitsPage() {
  return (
    <main className="container">
      <h1 style={{marginBottom:12}}>利用上限</h1>

      <section className="card section">
        <p className="kicker">最終更新日: 2025-08-25</p>
        <p>
          DraftBox は学習用・個人開発の無料ツールです。無料で安心して使っていただくために、以下の上限を設けています。
        </p>

        <div className="grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginTop:12}}>
          <div className="card">
            <div className="kicker">1ユーザーあたり保存できる下書き数</div>
            <div style={{fontSize:22,fontWeight:700}}>最大 1,000 件</div>
            <p className="kicker" style={{marginTop:6}}>※ 超えた場合、新規作成はできません（不要な下書きを削除してください）。</p>
          </div>
          <div className="card">
            <div className="kicker">1件あたり本文サイズ</div>
            <div style={{fontSize:22,fontWeight:700}}>最大 204,800 バイト（約200KB）</div>
            <p className="kicker" style={{marginTop:6}}>※ 文字数ではなくバイト数判定です。UTF-8 で計算しています。</p>
          </div>
          <div className="card">
            <div className="kicker">タイトル長</div>
            <div style={{fontSize:22,fontWeight:700}}>最大 120 文字</div>
            <p className="kicker" style={{marginTop:6}}>※ ファイル名や一覧表示の安定性のため制限しています。</p>
          </div>
        </div>

        <ul className="kicker" style={{marginTop:12}}>
          <li>これらの上限はクライアント側のバリデーションに加えて、Supabase（DB）側でもガードしています。</li>
          <li>仕様は安定運用のため予告なく調整される場合があります。</li>
        </ul>
      </section>
    </main>
  );
}
