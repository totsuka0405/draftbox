// lib/i18n.js
"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MESSAGES = {
  ja: {
    brand: "DraftBox",
    tagline: "未ログインでも文字数カウント。ログインでクラウド保存。",
    language: "言語",
    title: "無題",
    counter: "文字数",
    signin: "サインイン",
    signup: "新規登録",
    login: "ログイン",
    register: "登録",
    email: "メールアドレス",
    password: "パスワード",
    forgot: "パスワードをお忘れですか？",
    send: "送信",
    logout: "サインアウト",
    notice: { titleTip: "※未ログイン：このタイトルはエクスポート時のファイル名にのみ使われます（保存は不可）" },
    share: {
      open: "共有を表示", copy: "リンクをコピー", revoke: "共有を無効化", issue: "共有リンクを発行",
      notIssued: "未発行", expiry: "有効期限", none: "期限なし", expiresIn: "残り {time}", update: "期限を更新",
      options: { none: "期限なし", h24: "24時間", d7: "7日間", custom: "日時指定" },
    },
    export: { md: "Export .md", html: "Export .html", txt: "Export .txt", filenameHint: "出力ファイル名の例：{name}.md" },
    stats: {
      title: "詳細カウント",
      chars: "文字数", charsNoNL: "改行を除いた文字数", charsNoNLSpace: "改行・空白を除いた文字数",
      bytesUtf8: "バイト数 (UTF-8)", bytesUtf16: "バイト数 (UTF-16)",
      bytesSjis: "バイト数 (Shift-JIS)", bytesEucjp: "バイト数 (EUC-JP)", bytesJis: "バイト数 (JIS)",
      lines: "行数", genkoyoshi: "原稿用紙換算(400字)",
    },
    status: { saving: "保存中…", saved: "保存済み", error: "保存失敗" },
    shared: { title: "共有下書き", loading: "読み込み中…", error: "エラー：{msg}", readonlyUpdated: "読み取り専用・最終更新：" },
    drafts: {
      new: "＋ 新しい下書き", empty: "まだ下書きがありません。",
      needLogin: "ログインすると下書き一覧が表示されます。", limitHit: "上限に達しています。不要な下書きを削除してください。",
    },
    editor: { placeholder: "ここに文章を入力してください（未ログインでも文字数カウントは使えます）" },
    actions: { saveNow: "今すぐ保存", deleteThisDraft: "この下書きを削除", confirmDelete: "この下書きを削除しますか？" },
    nav: {
      home: "ホーム", privacy: "プライバシー", limits: "利用上限", help: "ヘルプ",
      about: "このアプリについて", terms: "利用規約", contact: "お問い合わせ", reset: "パスワード再設定",
    },
    searchUi: {
        search: "検索",
        placeholder: "タイトル・本文を検索…",
        filters: "フィルタ",
        from: "開始日",
        to: "終了日",
        minChars: "最小文字数",
        maxChars: "最大文字数",
        sort: "並び替え",
        clear: "条件をクリア",
        showing: "{shown}件 / 全{total}件",
        sortOptions: {
            updatedDesc: "更新日（新しい順）",
            updatedAsc: "更新日（古い順）",
            titleAsc: "タイトル（A→Z）",
            titleDesc: "タイトル（Z→A）",
            charsAsc: "文字数（少→多）",
            charsDesc: "文字数（多→少）",
        },
    },
    legal: {
    termsTitle: "利用規約",
    privacyTitle: "プライバシーポリシー",
    updated: "最終更新日：{date}",
    },
  },
  en: {
    brand: "DraftBox",
    tagline: "Count text without login. Save drafts to cloud when signed in.",
    language: "Language",
    title: "Untitled",
    counter: "Characters",
    signin: "Sign in",
    signup: "Sign up",
    login: "Log in",
    register: "Register",
    email: "Email",
    password: "Password",
    forgot: "Forgot password?",
    send: "Send",
    logout: "Sign out",
    notice: { titleTip: "*Not signed in:* This title will only be used as the export filename (no cloud save)." },
    share: {
      open: "Open share", copy: "Copy link", revoke: "Disable share", issue: "Create share link",
      notIssued: "Not issued", expiry: "Expiry", none: "No expiry", expiresIn: "{time} left", update: "Update expiry",
      options: { none: "No expiry", h24: "24 hours", d7: "7 days", custom: "Pick date/time" },
    },
    export: { md: "Export .md", html: "Export .html", txt: "Export .txt", filenameHint: "Example filename: {name}.md" },
    stats: {
      title: "Detailed counts",
      chars: "Characters", charsNoNL: "Characters (no newlines)", charsNoNLSpace: "Characters (no NL & spaces)",
      bytesUtf8: "Bytes (UTF-8)", bytesUtf16: "Bytes (UTF-16)",
      bytesSjis: "Bytes (Shift-JIS)", bytesEucjp: "Bytes (EUC-JP)", bytesJis: "Bytes (JIS)",
      lines: "Lines", genkoyoshi: "Genkō-yōshi (400/pg)",
    },
    status: { saving: "Saving…", saved: "Saved", error: "Save failed" },
    shared: { title: "Shared Draft", loading: "Loading…", error: "Error: {msg}", readonlyUpdated: "Read-only · Last updated: " },
    drafts: {
      new: "+ New draft", empty: "No drafts yet.",
      needLogin: "Sign in to see your drafts.", limitHit: "You've reached the limit. Please delete some drafts.",
    },
    editor: { placeholder: "Type your text here (character counting works without signing in)" },
    actions: { saveNow: "Save now", deleteThisDraft: "Delete this draft", confirmDelete: "Delete this draft?" },
    nav: { home: "Home", privacy: "Privacy", limits: "Limits", help: "Help", about: "About", terms: "Terms", contact: "Contact", reset: "Password Reset" },
    searchUi: {
    search: "Search",
    placeholder: "Search title or content…",
    filters: "Filters",
    from: "From",
    to: "To",
    minChars: "Min chars",
    maxChars: "Max chars",
    sort: "Sort",
    clear: "Clear",
    showing: "{shown} / {total}",
    sortOptions: {
        updatedDesc: "Updated (newest)",
        updatedAsc: "Updated (oldest)",
        titleAsc: "Title (A→Z)",
        titleDesc: "Title (Z→A)",
        charsAsc: "Chars (asc)",
        charsDesc: "Chars (desc)",
    },
    },
    egal: {
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    updated: "Last updated: {date}",
    },
  },
};

function resolve(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

const I18nContext = createContext({ lang: "ja", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children, defaultLang = "ja" }) {
  const [lang, setLang] = useState(defaultLang);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("i18n_lang");
      if (saved && (saved === "ja" || saved === "en") && saved !== lang) {
        setLang(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("i18n_lang", lang);
      document.cookie = `i18n_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
      if (typeof document !== "undefined") document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  const dict = useMemo(() => MESSAGES[lang] || MESSAGES.ja, [lang]);
  const t = useMemo(() => (key, vars) => {
    let v = resolve(dict, key) ?? key;
    if (vars && typeof v === "string") {
      for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, String(val));
    }
    return v;
  }, [dict]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
