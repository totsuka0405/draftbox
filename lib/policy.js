// lib/policy.js
export const LIMITS = {
  MAX_DRAFTS_PER_USER: 1000,     // 1ユーザーの下書き件数上限
  MAX_CONTENT_BYTES: 204_800,    // 1件あたり本文の最大バイト数(約200KB)
  MAX_TITLE_CHARS: 120,          // タイトル最大文字数
};

export function byteLength(text) {
  return new TextEncoder().encode(text || "").length;
}

export function validateDraft({ title, content, count }) {
  if (title && title.length > LIMITS.MAX_TITLE_CHARS) {
    return `タイトルは${LIMITS.MAX_TITLE_CHARS}文字以内にしてください。`;
  }
  if (byteLength(content || "") > LIMITS.MAX_CONTENT_BYTES) {
    return `本文サイズが上限(${LIMITS.MAX_CONTENT_BYTES}バイト)を超えています。`;
  }
  if (typeof count === "number" && count >= LIMITS.MAX_DRAFTS_PER_USER) {
    return `下書き数が上限（${LIMITS.MAX_DRAFTS_PER_USER}件）に達しています。`;
  }
  return null;
}
