// app/s/[token]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useI18n } from "../../../lib/i18n";

export default function SharedDraftPage() {
  const { t } = useI18n();
  const { token } = useParams();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_shared_draft", { in_token: token });
      if (error) { setErr(error.message); return; }
      setData(data?.[0] || null);
    })();
  }, [token]);

  if (err) {
    return (
      <main className="container" style={{ paddingTop: 16 }}>
        <h1>{t("shared.title")}</h1>
        <p className="notice">{t("shared.error", { msg: err })}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container" style={{ paddingTop: 16 }}>
        <h1>{t("shared.title")}</h1>
        <p>{t("shared.loading")}</p>
      </main>
    );
  }

  const html = DOMPurify.sanitize(marked.parse(data.content || ""));

  return (
    <main className="container" style={{ paddingTop: 16 }}>
      <h1 style={{ marginBottom: 8 }}>{data.title || t("title")}</h1>
      <p className="kicker" style={{ marginBottom: 16 }}>
        {t("shared.readonlyUpdated")}{new Date(data.updated_at).toLocaleString()}
      </p>
      <article className="card section prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
