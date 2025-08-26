// app/auth/reset/page.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useI18n } from "../../../lib/i18n";

function parseHashTokens() {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const p = new URLSearchParams(hash || window.location.search);
  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");
  return { access_token, refresh_token };
}

export default function ResetPage() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      // すでにセッションがあるか
      const { data: s1 } = await supabase.auth.getSession();
      if (s1.session) { setAuthed(true); setReady(true); return; }

      // メールリンクのトークンがURLにある場合はセット
      const { access_token, refresh_token } = parseHashTokens();
      if (access_token && refresh_token) {
        const { data: s2, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error && s2.session) { setAuthed(true); setReady(true); return; }
      }

      setReady(true);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (pw.length < 8) { setMsg("パスワードは8文字以上にしてください。"); return; }
    if (pw !== pw2) { setMsg("確認用パスワードが一致しません。"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setMsg(`更新エラー: ${error.message}`); return; }
    setMsg("パスワードを更新しました。トップへ移動します…");
    setTimeout(() => { window.location.href = "/"; }, 1500);
  };

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>パスワード再設定</h1>

      {!ready && <p>読み込み中…</p>}

      {ready && !authed && (
        <div className="card section">
          <p className="kicker" style={{ marginBottom: 8 }}>
            メールの「パスワード再設定」リンクからこのページにアクセスしてください。
          </p>
          <p className="kicker">
            If you opened this page directly, please click the reset link from the email again.
          </p>
        </div>
      )}

      {ready && authed && (
        <form onSubmit={submit} className="card section" style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <label className="kicker">新しいパスワード</label>
          <input className="input" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} required minLength={8} />

          <label className="kicker">確認のためもう一度</label>
          <input className="input" type="password" value={pw2} onChange={(e)=>setPw2(e.target.value)} required minLength={8} />

          <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button className="button primary" type="submit">更新</button>
          </div>

          {msg && <p className="notice" role="status" aria-live="polite">{msg}</p>}
        </form>
      )}
    </main>
  );
}
