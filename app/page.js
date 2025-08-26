// app/page.js (draftbox)

"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { LIMITS, byteLength, validateDraft } from "@/lib/policy";
import { marked } from "marked";
import DOMPurify from "dompurify";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });

/* ===================================================================
 * ユーティリティ群
 *  - アプリ本体に依存しない純粋関数のみを配置
 * =================================================================== */

/**
 * 文字の「見た目上の数」(grapheme)を数える。
 * Intl.Segmenter が利用可能であれば正確に（絵文字・結合文字対応）。
 * @param {string} text
 * @returns {number}
 */
function countGraphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("ja", { granularity: "grapheme" });
    let c = 0;
    for (const _ of seg.segment(text || "")) c++;
    return c;
  }
  return Array.from(text || "").length;
}

/**
 * Markdownを概算でプレーンテキスト化する。
 * - コードフェンス/インラインコード/リンク/画像/装飾記号を除去。
 * @param {string} md
 * @returns {string}
 */
function stripMarkdown(md) {
  let t = md ?? "";
  t = t.replace(/```[\s\S]*?```/g, ""); // fenced code
  t = t.replace(/`[^`]*`/g, ""); // inline code
  t = t.replace(/!\[(.*?)\]\((.*?)\)/g, "$1"); // image alt
  t = t.replace(/\[(.*?)\]\((.*?)\)/g, "$1"); // link text
  t = t.replace(/[*_~`>#-]{1,}/g, " "); // emphasis/heading/list marks
  return t;
}

/** SJISの概算バイト長（簡易規則） */
function bytesSJIS(text) {
  let n = 0;
  for (const ch of text || "") {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7f) n += 1;
    else if (cp >= 0xff61 && cp <= 0xff9f) n += 1; // 半角カナ
    else n += 2;
  }
  return n;
}
/** EUC-JPの概算バイト長（簡易規則） */
function bytesEUCJP(text) {
  let n = 0;
  for (const ch of text || "") {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7f) n += 1;
    else n += 2;
  }
  return n;
}
/** ISO-2022-JP(JIS)の概算バイト長（簡易規則） */
function bytesJIS(text) {
  let n = 0;
  for (const ch of text || "") {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7f) n += 1;
    else n += 2; // 概算
  }
  return n;
}

/** 改行数（CR除去のうえLFでカウント） */
function lineCount(text) {
  if (!text) return 0;
  return text.replace(/\r/g, "").split("\n").length;
}

/**
 * debounceユーティリティ。
 * - wait後に最新引数で一度だけ実行
 * - .cancel()でタイマー解除可能
 */
function debounce(fn, wait) {
  let t;
  const debounced = (...a) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...a), wait);
  };
  debounced.cancel = () => window.clearTimeout(t);
  return debounced;
}

/**
 * `YYYY-MM-DDTHH:mm` (input[type=datetime-local]) をローカル→ISO文字列化
 */
function toISOFromDatetimeLocal(localStr) {
  if (!localStr) return null;
  return new Date(localStr).toISOString();
}

/**
 * ISO日時から human readable な残り時間を作成。
 * @param {string|null} iso
 * @param {string} [lang]
 */
function humanTimeLeft(
  iso,
  lang = typeof navigator !== "undefined" ? navigator.language || "ja" : "ja"
) {
  if (!iso) return lang.startsWith("en") ? "No expiry" : "期限なし";
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return lang.startsWith("en") ? "Expired" : "期限切れ";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (lang.startsWith("en")) {
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  } else {
    if (d > 0) return `${d}日${h}時間${m}分`;
    if (h > 0) return `${h}時間${m}分`;
    return `${m}分`;
  }
}

/** ファイル名に利用できない文字を安全化（最大100文字） */
function safeFilename(str) {
  const base = (str || "untitled").trim();
  const sanitized = base.replace(/[\\\/:*?"<>|]/g, "_");
  return sanitized.slice(0, 100);
}

/* ===================================================================
 * メインコンポーネント
 * =================================================================== */
export default function Page() {
  const { lang, setLang, t } = useI18n();

  // 認証周り
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // 下書き状態
  const [drafts, setDrafts] = useState([]);
  const [draftsCount, setDraftsCount] = useState(0);
  const [currentId, setCurrentId] = useState(null);

  // エディタ
  const [title, setTitle] = useState(t("title"));
  const [content, setContent] = useState("");

  // 通知/保存状態
  const [status, setStatus] = useState("idle"); // idle|saving|saved|error
  const [toast, setToast] = useState("");

  // 共有
  const [shareToken, setShareToken] = useState(null);
  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const [shareExpiresAt, setShareExpiresAt] = useState(null);
  const [expiryMode, setExpiryMode] = useState("none"); // none|24h|7d|custom
  const [expiryCustom, setExpiryCustom] = useState("");

  // 検索/フィルタ/並び替え
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");
  const [minChars, setMinChars] = useState("");
  const [maxChars, setMaxChars] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("updated"); // 'updated'|'title'|'chars'
  const [sortDir, setSortDir] = useState("desc"); // 'asc'|'desc'

  // バッジ用の素文字数
  const plain = useMemo(() => stripMarkdown(content), [content]);
  const charCount = useMemo(() => countGraphemes(plain), [plain]);

  // 詳細統計
  const stats = useMemo(() => {
    const noNL = plain.replace(/\r?\n/g, "");
    const noNLSpace = noNL.replace(/[ \t\u3000]/g, "");
    const utf8 = new TextEncoder().encode(plain).length;
    const utf16 = plain.length * 2;
    return {
      chars: countGraphemes(plain),
      charsNoNL: countGraphemes(noNL),
      charsNoNLSpace: countGraphemes(noNLSpace),
      bytesUTF8: utf8,
      bytesUTF16: utf16,
      bytesSJIS: bytesSJIS(plain),
      bytesEUCJP: bytesEUCJP(plain),
      bytesJIS: bytesJIS(plain),
      lines: lineCount(plain),
      genkoyoshi: Math.ceil(countGraphemes(noNLSpace) / 400),
    };
  }, [plain]);

  // 認証監視（初期化時に現在ユーザーを取得し、state変更を購読）
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const showToast = useCallback((m) => {
    setToast(m);
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, []);

  // ログイン/登録
  const handleAuth = useCallback(async (e) => {
    e.preventDefault();
    if (authMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return showToast(`ログインに失敗しました: ${error.message}`);
      await loadDrafts();
      showToast("ログインしました。");
    } else {
      if (password.length < 8) return showToast("パスワードは8文字以上でご設定ください。");
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return showToast(`登録に失敗しました: ${error.message}`);
      showToast("登録を受け付けました。案内メールをご確認ください。");
    }
  }, [authMode, email, password, showToast]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setDrafts([]); setDraftsCount(0); setCurrentId(null);
    setTitle(t("title")); setContent(""); setShareToken(null);
    showToast("サインアウトしました。");
  }, [t, showToast]);

  // パスワード再設定メール
  const sendReset = useCallback(async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${BASE_URL}/auth/reset`,
    });
    showToast(error ? `再設定メールの送信に失敗しました: ${error.message}` : "再設定用メールを送信しました。");
  }, [resetEmail, BASE_URL, showToast]);

  // 一覧取得
  const loadDrafts = useCallback(async () => {
    if (!user) return;
    const { data, count, error } = await supabase
      .from("drafts")
      .select("id,title,content,updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) return showToast(`下書きの読み込みに失敗しました: ${error.message}`);
    setDrafts(data || []);
    setDraftsCount(typeof count === "number" ? count : data?.length || 0);
    if (data?.length) {
      const d = data[0];
      setCurrentId(d.id);
      setTitle(d.title || t("title"));
      setContent(d.content || "");
    } else {
      setCurrentId(null);
      setTitle(t("title"));
      setContent("");
      setShareToken(null);
    }
  }, [user, t, showToast]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // 共有設定取得
  const fetchShare = useCallback(async (draftId) => {
    if (!user || !draftId) { setShareToken(null); setShareExpiresAt(null); return; }
    const { data, error } = await supabase
      .from("draft_shares")
      .select("token, expires_at")
      .eq("draft_id", draftId)
      .maybeSingle();
    if (error) { setShareToken(null); setShareExpiresAt(null); return; }
    setShareToken(data?.token || null);
    setShareExpiresAt(data?.expires_at || null);
    if (!data?.expires_at) { setExpiryMode("none"); setExpiryCustom(""); }
    else { setExpiryMode("custom"); setExpiryCustom(toDatetimeLocalString(data.expires_at)); }
  }, [user]);

  useEffect(() => { fetchShare(currentId); }, [currentId, fetchShare]);

  // -------- 保存関連 --------
  const debouncedSaveRef = useRef((id, patch) => {});
  const lastSaveIdRef = useRef(0); // 競合回避用の単純なID

  useEffect(() => {
    const doSave = async (id, patch) => {
      if (!user || !id) return;
      setStatus("saving");
      const thisSaveId = ++lastSaveIdRef.current;
      const { error } = await supabase.from("drafts").update({ ...patch }).eq("id", id);
      // 後から来た保存が完了している可能性もあるため、最後のもののみ反映
      if (thisSaveId !== lastSaveIdRef.current) return;
      if (error) { setStatus("error"); showToast(`保存に失敗しました: ${error.message}`); }
      else { setStatus("saved"); window.setTimeout(() => setStatus("idle"), 1200); }
    };
    const debounced = debounce(doSave, 700);
    debouncedSaveRef.current = debounced;
    return () => debounced.cancel();
  }, [user, showToast]);

  // 空なら自動作成して保存
  const ensureDraftAndMaybeSave = useCallback(async (patch = {}) => {
    if (!user) return null;
    if (currentId) {
      const id = currentId;
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      debouncedSaveRef.current(id, patch);
      return id;
    }
    setStatus("saving");
    const initialTitle = patch.title ?? title ?? t("title");
    const initialContent = patch.content ?? content ?? "";
    const err = validateDraft({ title: initialTitle, content: initialContent, count: draftsCount });
    if (err) { setStatus("error"); showToast(err); return null; }
    const { data, error } = await supabase
      .from("drafts").insert({ user_id: user.id, title: initialTitle, content: initialContent })
      .select().single();
    if (error) { setStatus("error"); showToast(`下書きの作成に失敗しました: ${error.message}`); return null; }
    setDrafts((p) => [data, ...p]); setDraftsCount((n) => n + 1);
    setCurrentId(data.id); setTitle(data.title); setContent(data.content);
    setStatus("saved"); window.setTimeout(() => setStatus("idle"), 1200);
    return data.id;
  }, [user, currentId, title, content, draftsCount, t, showToast]);

  // 編集ハンドラ
  const handleTitle = useCallback((v) => {
    if (v.length > LIMITS.MAX_TITLE_CHARS) {
      setTitle(v.slice(0, LIMITS.MAX_TITLE_CHARS));
      setStatus("error"); return showToast(`タイトルは${LIMITS.MAX_TITLE_CHARS}文字以内でご入力ください。`);
    }
    setTitle(v);
    if (!user) return;
    if (!currentId) ensureDraftAndMaybeSave({ title: v });
    else {
      setDrafts((prev) => prev.map((d) => (d.id === currentId ? { ...d, title: v } : d)));
      debouncedSaveRef.current(currentId, { title: v });
    }
  }, [user, currentId, ensureDraftAndMaybeSave, showToast]);

  const handleContent = useCallback((v) => {
    if (byteLength(v) > LIMITS.MAX_CONTENT_BYTES) {
      setStatus("error"); return showToast(`本文が上限（${LIMITS.MAX_CONTENT_BYTES}B）を超えました。`);
    }
    setContent(v);
    if (!user) return;
    if (!currentId) ensureDraftAndMaybeSave({ content: v });
    else {
      setDrafts((prev) => prev.map((d) => (d.id === currentId ? { ...d, content: v } : d)));
      debouncedSaveRef.current(currentId, { content: v });
    }
  }, [user, currentId, ensureDraftAndMaybeSave, showToast]);

  // 手動保存＋ショートカット
  const saveNow = useCallback(async () => {
    if (!user) return showToast("保存するにはサインインが必要です。");
    const err = validateDraft({ title, content, count: draftsCount });
    if (err) { setStatus("error"); return showToast(err); }
    setStatus("saving");
    let id = currentId;
    if (!id) { id = await ensureDraftAndMaybeSave({}); if (!id) return; }
    const { error } = await supabase.from("drafts").update({ title, content }).eq("id", id);
    if (error) { setStatus("error"); showToast(`保存に失敗しました: ${error.message}`); }
    else { setStatus("saved"); window.setTimeout(() => setStatus("idle"), 1200); }
  }, [user, currentId, title, content, draftsCount, ensureDraftAndMaybeSave, showToast]);

  useEffect(() => {
    const onKey = (e) => {
      // Windows/Linux: Ctrl+S, macOS: ⌘S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // 非同期だが例外を握りつぶさない
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  // 共有：発行/更新/解除
  function computeExpiresISO(mode, customStr) {
    if (mode === "none") return null;
    if (mode === "24h") return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    if (mode === "7d") return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    if (mode === "custom") return toISOFromDatetimeLocal(customStr);
    return null;
  }

  const createShare = useCallback(async () => {
    if (!user || !currentId) return showToast("共有対象の下書きがありません。");
    const expires_at = computeExpiresISO(expiryMode, expiryCustom);
    const { data, error } = await supabase
      .from("draft_shares")
      .upsert({ draft_id: currentId, user_id: user.id, expires_at }, { onConflict: "draft_id", ignoreDuplicates: false })
      .select("token, expires_at").single();
    if (error) return showToast(`共有リンクの作成に失敗しました: ${error.message}`);
    setShareToken(data.token); setShareExpiresAt(data.expires_at || null);
    showToast("共有リンクを発行しました。");
  }, [user, currentId, expiryMode, expiryCustom, showToast]);

  const updateExpiry = useCallback(async () => {
    if (!user || !currentId || !shareToken) return;
    const expires_at = computeExpiresISO(expiryMode, expiryCustom);
    const { error } = await supabase.from("draft_shares").update({ expires_at }).eq("draft_id", currentId);
    if (error) return showToast(`有効期限の更新に失敗しました: ${error.message}`);
    setShareExpiresAt(expires_at || null);
    showToast(expires_at ? "有効期限を更新しました。" : "有効期限を解除しました。");
  }, [user, currentId, shareToken, expiryMode, expiryCustom, showToast]);

  const revokeShare = useCallback(async () => {
    if (!user || !currentId) return;
    const { error } = await supabase.from("draft_shares").delete().eq("draft_id", currentId);
    if (error) return showToast(`共有リンクの無効化に失敗しました: ${error.message}`);
    setShareToken(null); showToast("共有リンクを無効化しました。");
  }, [user, currentId, showToast]);

  const shareURL = shareToken ? `${BASE_URL}/s/${shareToken}` : "";

  // エクスポート
  function download(filename, mime, text) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const exportMD   = useCallback(() => download(`${safeFilename(title)}.md`,  "text/markdown;charset=utf-8", content), [title, content]);
  const exportTXT  = useCallback(() => download(`${safeFilename(title)}.txt`, "text/plain;charset=utf-8", stripMarkdown(content)), [title, content]);
  const exportHTML = useCallback(() => {
    const htmlBody = DOMPurify.sanitize(marked.parse(content || ""));
    const name = safeFilename(title);
    const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>${name}</title><body>${htmlBody}</body></html>`;
    download(`${name}.html`, "text/html;charset=utf-8", html);
  }, [content, title, lang]);

  // 検索・フィルタ・並び替え
  function draftChars(d) {
    const txt = stripMarkdown(d?.content || "");
    return countGraphemes(txt.replace(/\r/g, ""));
  }

  const filteredDrafts = useMemo(() => {
    let arr = drafts.map((d) => ({ ...d, _chars: draftChars(d) }));

    const needle = q.trim().toLowerCase();
    if (needle) {
      arr = arr.filter(
        (d) => (d.title || "").toLowerCase().includes(needle) || (d.content || "").toLowerCase().includes(needle)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      arr = arr.filter((d) => new Date(d.updated_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999");
      arr = arr.filter((d) => new Date(d.updated_at) <= to);
    }
    const min = Number.isFinite(+minChars) && minChars !== "" ? +minChars : null;
    const max = Number.isFinite(+maxChars) && maxChars !== "" ? +maxChars : null;
    if (min !== null) arr = arr.filter((d) => d._chars >= min);
    if (max !== null) arr = arr.filter((d) => d._chars <= max);

    const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const byUpdated = (a, b) => new Date(a.updated_at) - new Date(b.updated_at);
    const byTitle   = (a, b) => coll.compare(a.title || "", b.title || "");
    const byChars   = (a, b) => a._chars - b._chars;

    let cmp = byUpdated;
    if (sortField === "title") cmp = byTitle;
    if (sortField === "chars") cmp = byChars;
    arr.sort((a, b) => (sortDir === "asc" ? cmp(a, b) : cmp(b, a)));

    return arr;
  }, [drafts, q, dateFrom, dateTo, minChars, maxChars, sortField, sortDir]);

  const mdeOptions = useMemo(() => ({
    spellChecker: false, status: false,
    toolbar: [
      "bold","italic","strikethrough","|",
      "heading-1","heading-2","heading-3","|",
      "code","quote","table","horizontal-rule","|",
      "unordered-list","ordered-list","|",
      "link","image","|",
      "preview","side-by-side","fullscreen","|","guide"
    ],
    placeholder: t("editor.placeholder"),
  }), [t]);

  const statusLabel =
    status === "saving" ? t("status.saving") :
    status === "saved"  ? t("status.saved")  :
    status === "error"  ? t("status.error")  : "　";

  // ===================================================================
  // ▼ UIレンダリング
  // ===================================================================
  return (
    <div className="container">
      {/* ヘッダー */}
      <header className="header">
        <div>
          <div className="brand">{t("brand")}</div>
          <div className="kicker">{t("tagline")}</div>
        </div>
        <div>
          <div className="toolbar" style={{ justifyContent: "flex-end", marginBottom: 6 }}>
            <label className="kicker" htmlFor="lang" style={{ marginRight: 4 }}>{t("language")}</label>
            <select id="lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("language")}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          {user ? (
            <div className="toolbar" style={{ justifyContent: "flex-end" }}>
              <span className="kicker">{user.email}</span>
              <button className="button" onClick={signOut}>{t("logout")}</button>
            </div>
          ) : (
            <>
              <form onSubmit={handleAuth} className="toolbar" style={{ justifyContent: "flex-end" }}>
                <div className="formTabs">
                  <button
                    type="button"
                    className="button"
                    aria-selected={authMode === "signin"}
                    onClick={() => setAuthMode("signin")}
                  >
                    {t("signin")}
                  </button>
                  <button
                    type="button"
                    className="button"
                    aria-selected={authMode === "signup"}
                    onClick={() => setAuthMode("signup")}
                  >
                    {t("signup")}
                  </button>
                </div>
                <input className="input" type="email" required placeholder={t("email")}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="input" type="password" required placeholder={t("password")}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="button primary" type="submit">
                  {authMode === "signin" ? t("login") : t("register")}
                </button>
                <button type="button" className="button ghost" onClick={() => setShowReset(v => !v)}>
                  {t("forgot")}
                </button>
              </form>

              {showReset && (
                <form onSubmit={sendReset} className="toolbar" style={{ justifyContent: "flex-end", marginTop: 6 }}>
                  <input className="input" type="email" required placeholder={t("email")}
                    value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  <button className="button" type="submit">{t("send")}</button>
                </form>
              )}
            </>
          )}
        </div>
      </header>

      {/* カウンターバー */}
      <div className="counterBar" style={{ marginBottom: 12 }}>
        <span className="badge" aria-label={t("counter")}>
          <span>{t("counter")}</span> <strong>{charCount}</strong>
        </span>
        <div className="settings">
          <span className="kicker">下書き {draftsCount} / {LIMITS.MAX_DRAFTS_PER_USER}</span>
          <span className="kicker">本文 {byteLength(content)} / {LIMITS.MAX_CONTENT_BYTES} B</span>
        </div>
      </div>

      {/* 詳細カウント */}
      <section className="card section" style={{ marginBottom: 12 }}>
        <h3 style={{ marginBottom: 8 }}>{t("stats.title")}</h3>
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <Stat label={t("stats.chars")} value={stats.chars} unit="文字" />
          <Stat label={t("stats.charsNoNL")} value={stats.charsNoNL} unit="文字" />
          <Stat label={t("stats.charsNoNLSpace")} value={stats.charsNoNLSpace} unit="文字" />
          <Stat label={t("stats.bytesUtf8")} value={stats.bytesUTF8} unit="バイト" />
          <Stat label={t("stats.bytesUtf16")} value={stats.bytesUTF16} unit="バイト" />
          <Stat label={t("stats.bytesSjis")} value={stats.bytesSJIS} unit="バイト" />
          <Stat label={t("stats.bytesEucjp")} value={stats.bytesEUCJP} unit="バイト" />
          <Stat label={t("stats.bytesJis")} value={stats.bytesJIS} unit="バイト" />
          <Stat label={t("stats.lines")} value={stats.lines} unit="行" />
          <Stat label={t("stats.genkoyoshi")} value={stats.genkoyoshi} unit="枚" />
        </div>
        <p className="kicker" style={{ marginTop: 6 }}>
          ※ Shift-JIS / EUC-JP / JIS のバイト数は簡易推定です。
        </p>
      </section>

      <div className="layout">
        {/* 左：下書き一覧 */}
        <aside className="card section" aria-label="下書き一覧">
          <div className="toolbar" style={{ marginBottom: 8 }}>
            <button
              className="button primary"
              onClick={async () => {
                if (!user) return showToast("保存にはサインインが必要です。");
                const err = validateDraft({ title, content, count: draftsCount }); if (err) return showToast(err);
                const { data, error } = await supabase
                  .from("drafts").insert({ user_id: user.id, title: t("title"), content: "" })
                  .select().single();
                if (error) return showToast(`下書きの作成に失敗しました: ${error.message}`);
                setDrafts((p) => [data, ...p]); setDraftsCount((n) => n + 1);
                setCurrentId(data.id); setTitle(data.title); setContent(data.content); setShareToken(null);
                showToast("新しい下書きを作成しました。");
              }}
              disabled={!user || draftsCount >= LIMITS.MAX_DRAFTS_PER_USER}
            >
              {t("drafts.new")}
            </button>
            {!user && <span className="kicker">{t("drafts.needLogin")}</span>}
            {user && draftsCount >= LIMITS.MAX_DRAFTS_PER_USER && (
              <span className="kicker">{t("drafts.limitHit")}</span>
            )}
          </div>

          {/* 検索・ソート：コンパクトヘッダー */}
          <div className="toolbar" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              type="search"
              placeholder={t("searchUi.placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
              aria-label={t("searchUi.search")}
            />

            {/* ソートのセグメント（更新/タイトル/文字数） */}
            <div className="seg" role="group" aria-label="Sort field">
              <button
                type="button"
                className={`seg-btn ${sortField === "updated" ? "active" : ""}`}
                onClick={() => setSortField("updated")}
                aria-pressed={sortField === "updated"}
                title="更新日"
              >
                ⏱
              </button>
              <button
                type="button"
                className={`seg-btn ${sortField === "title" ? "active" : ""}`}
                onClick={() => setSortField("title")}
                aria-pressed={sortField === "title"}
                title="タイトル"
              >
                A↔Z
              </button>
              <button
                type="button"
                className={`seg-btn ${sortField === "chars" ? "active" : ""}`}
                onClick={() => setSortField("chars")}
                aria-pressed={sortField === "chars"}
                title="文字数"
              >
                #
              </button>
            </div>

            {/* 昇順/降順トグル */}
            <button
              type="button"
              className="button ghost"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label="昇順/降順"
              title="昇順/降順"
            >
              {sortDir === "asc" ? "▲" : "▼"}
            </button>

            {/* 詳細フィルタの開閉 */}
            <button
              type="button"
              className="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="filters-panel"
            >
              {t("searchUi.filters")}
            </button>
          </div>

          {/* 折りたたみ：詳細フィルタ */}
          {showFilters && (
            <div id="filters-panel" className="card soft" style={{ padding: 8, marginBottom: 8 }}>
              <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                <div className="field-inline">
                  <label className="kicker" htmlFor="from">{t("searchUi.from")}</label>
                  <input id="from" className="input" type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
                </div>
                <div className="field-inline">
                  <label className="kicker" htmlFor="to">{t("searchUi.to")}</label>
                  <input id="to" className="input" type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
                </div>

                {/* 文字数最小/最大 */}
                <div className="field-inline">
                  <label className="kicker" htmlFor="minc">{t("searchUi.minChars")}</label>
                  <input
                    id="minc"
                    className="input input-narrow"
                    type="number"
                    min="0"
                    value={minChars}
                    onChange={(e)=>setMinChars(e.target.value)}
                  />
                </div>

                <div className="field-inline">
                  <label className="kicker" htmlFor="maxc">{t("searchUi.maxChars")}</label>
                  <input
                    id="maxc"
                    className="input input-narrow"
                    type="number"
                    min="0"
                    value={maxChars}
                    onChange={(e)=>setMaxChars(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="button ghost"
                  onClick={() => { setQ(""); setDateFrom(""); setDateTo(""); setMinChars(""); setMaxChars(""); }}
                  style={{ marginLeft: "auto" }}
                >
                  {t("searchUi.clear")}
                </button>
              </div>

              <div className="kicker" style={{ marginTop: 6 }}>
                {t("searchUi.showing", { shown: filteredDrafts.length, total: drafts.length })}
              </div>
            </div>
          )}


          <ul className="list">
            {user && filteredDrafts.map((d) => (
              <li
                key={d.id}
                className={`item ${d.id === currentId ? "active" : ""}`}
                onClick={() => { setCurrentId(d.id); setTitle(d.title || t("title")); setContent(d.content || ""); }}
              >
                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.title || t("title")}
                </div>
                <div className="metaChip" aria-label="更新日時">
                  {new Date(d.updated_at).toLocaleString()}
                </div>
              </li>
            ))}
            {user && filteredDrafts.length === 0 && <li className="kicker">{t("drafts.empty")}</li>}
            {!user && <li className="kicker">{t("drafts.needLogin")}</li>}
          </ul>
        </aside>

        {/* 右：エディタ */}
        <section className="card section" aria-label="エディタ">
          {/* タイトル行 */}
          <div className="titleRow" style={{ marginBottom: 8 }}>
            <input
              className="input"
              style={{ width: "100%", fontSize: 18, fontWeight: 600 }}
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder={t("title")}
              aria-label={t("title")}
            />
            {!user && (
              <span className="kicker clamp-1" style={{ marginTop: 4 }}>
                ※未サインイン：このタイトルはエクスポート時のファイル名にのみ利用されます（保存不可）
              </span>
            )}
          </div>

          {/* 共有 & エクスポート */}
          <div className="toolbar" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {/* 共有状態 */}
            {shareToken ? (
              <>
                <a className="button" href={shareURL} target="_blank" rel="noreferrer">{t("share.open")}</a>
                <button className="button" onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(shareURL);
                    showToast(t("share.copy"));
                  } catch {
                    showToast("コピーに失敗しました。共有リンクを手動で選択してください。");
                  }
                }}>
                  {t("share.copy")}
                </button>
                <span className="kicker">
                  {t("share.expiry")}：
                  {shareExpiresAt
                    ? `${new Date(shareExpiresAt).toLocaleString()}（${t("share.expiresIn", { time: humanTimeLeft(shareExpiresAt) })}）`
                    : t("share.none")}
                </span>
                <button className="button danger" onClick={revokeShare}>{t("share.revoke")}</button>
              </>
            ) : (
              <span className="kicker">{t("share.notIssued")}</span>
            )}

            {/* 期限設定 */}
            <div className="divider" />
            <label className="kicker" htmlFor="expiry">{t("share.expiry")}</label>
            <select
              id="expiry"
              className="input"
              value={expiryMode}
              onChange={(e) => setExpiryMode(e.target.value)}
              aria-label={t("share.expiry")}
            >
              <option value="none">{t("share.options.none")}</option>
              <option value="24h">{t("share.options.h24")}</option>
              <option value="7d">{t("share.options.d7")}</option>
              <option value="custom">{t("share.options.custom")}</option>
            </select>
            {expiryMode === "custom" && (
              <input
                className="input"
                type="datetime-local"
                value={expiryCustom}
                onChange={(e) => setExpiryCustom(e.target.value)}
                aria-label={t("share.options.custom")}
              />
            )}
            {shareToken ? (
              <button className="button" onClick={updateExpiry} disabled={!user || !currentId}>{t("share.update")}</button>
            ) : (
              <button className="button" onClick={createShare} disabled={!user || !currentId}>{t("share.issue")}</button>
            )}

            {/* エクスポート */}
            <div className="divider" />
            <button className="button" onClick={exportMD}>{t("export.md")}</button>
            <button className="button" onClick={exportHTML}>{t("export.html")}</button>
            <button className="button" onClick={exportTXT}>{t("export.txt")}</button>
          </div>

          {/* エディタ本体 */}
          <SimpleMDE value={content} onChange={handleContent} options={mdeOptions} />

          {/* 下部操作 */}
          <div className="toolbar" style={{ marginTop: 8, justifyContent: "flex-end", gap: 10 }}>
            <span className={`statusChip ${status}`}>{statusLabel}</span>
            <button className="button" onClick={saveNow} disabled={!user}>{t("actions.saveNow")}</button>
            {user && currentId ? (
              <button className="button danger" onClick={async () => {
                if (!confirm(t("actions.confirmDelete"))) return;
                const { error } = await supabase.from("drafts").delete().eq("id", currentId);
                if (error) return showToast(`削除に失敗しました: ${error.message}`);
                setDrafts((p) => p.filter((d) => d.id !== currentId));
                setDraftsCount((n) => Math.max(0, n - 1));
                const next = drafts.find((d) => d.id !== currentId);
                setCurrentId(next?.id ?? null);
                setTitle(next?.title ?? t("title"));
                setContent(next?.content ?? "");
                setShareToken(null);
                showToast("削除しました。");
              }}>{t("actions.deleteThisDraft")}</button>
            ) : null}
          </div>
        </section>
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

/* 小さな表示コンポーネント */
function Stat({ label, value, unit }) {
  return (
    <div className="card" style={{ padding: "8px 10px" }}>
      <div className="kicker" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
        <span className="kicker" style={{ marginLeft: 6 }}>{unit}</span>
      </div>
    </div>
  );
}
