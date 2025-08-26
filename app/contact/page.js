// app/contact/page.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export default function ContactPage(){
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("bug");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      setUser(data.user ?? null);
      if (data.user?.email) setEmail(data.user.email);
    });
  },[]);

  const submit = async (e)=>{
    e.preventDefault();
    setMsg("");
    if (!email.trim()) { setMsg("メールアドレスを入力してください。"); return; }
    if (!body.trim()) { setMsg("内容を入力してください。"); return; }
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      email: email.trim(),
      category,
      body: body.trim(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) { setMsg(`送信エラー：${error.message}`); return; }
    setMsg("送信しました。ありがとうございました。");
    setBody("");
  };

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>{t("nav.contact")}</h1>
      <form onSubmit={submit} className="card section" style={{ display:"grid", gap:8, maxWidth:560 }}>
        <label className="kicker">メールアドレス</label>
        <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />

        <label className="kicker">カテゴリ</label>
        <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
          <option value="bug">不具合</option>
          <option value="feature">機能要望</option>
          <option value="other">その他</option>
        </select>

        <label className="kicker">内容</label>
        <textarea className="input" rows={8} value={body} onChange={e=>setBody(e.target.value)} required maxLength={4000} />

        <div className="toolbar" style={{ justifyContent:"flex-end", marginTop:8 }}>
          <button className="button primary" type="submit">送信</button>
        </div>

        {msg && <p className="notice" role="status" aria-live="polite">{msg}</p>}
        <p className="kicker">※短時間の連続送信には制限があります。</p>
      </form>
    </main>
  );
}
