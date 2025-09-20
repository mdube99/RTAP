/**
 * Minimal, safe markdown renderer for MITRE descriptions used in import flows.
 * - Supports: inline code (`code`), links [text](https://...)
 * - Preserves a very small HTML whitelist: <code>, <strong>, <em>
 * - Truncates to a readable snippet without breaking the UI
 */

import { Fragment, type ReactNode } from "react";

const SAFE_TAGS = new Set(["code", "strong", "em"]);

function stripUnsafeHtml(input: string): string {
  // Remove any HTML tags that are not in the safe whitelist
  return input.replace(/<\/?([a-zA-Z0-9-]+)(\s[^>]*)?>/g, (match, tag) => {
    const t = String(tag).toLowerCase();
    return SAFE_TAGS.has(t) ? match : "";
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null; // Disallow non-http(s)
}

function convertInlineMarkdown(input: string): string {
  // Links: [text](url)
  const withLinks = input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safe = safeHref(String(url));
    const txt = escapeHtml(String(text));
    return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${txt}</a>` : txt;
  });
  // Inline code: `code`
  const withCode = withLinks.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(String(code))}</code>`);
  // Strip remaining markdown symbols like ### headings
  return withCode.replace(/^#+\s+/gm, "");
}

function takeConciseSnippet(text: string, maxLength: number): string {
  // Build from first 1-2 sentences to avoid cutting mid-thought
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/\.\s+/)
    .filter((s) => s.trim().length > 0);

  let snippet = sentences[0] ?? "";
  if (snippet.length < 120 && sentences[1]) snippet += ". " + sentences[1];

  if (snippet.length > maxLength) {
    const cut = snippet.lastIndexOf(" ", maxLength - 3);
    snippet = snippet.substring(0, cut > 0 ? cut : maxLength - 3) + "...";
  }
  return snippet;
}

export function toSafeHtmlSnippet(raw: string | undefined | null, maxLength = 220): string {
  const text = (raw ?? "").trim();
  if (text.length === 0) return "";
  // Allow a few safe built-in tags (<code>, <strong>, <em>), strip others
  const stripped = stripUnsafeHtml(text);
  // Build concise snippet, then convert limited markdown
  const concise = takeConciseSnippet(stripped, maxLength);
  return convertInlineMarkdown(concise);
}

type ReactSnippetOptions = { allowLinks?: boolean };

function toSafeReactNodes(html: string, opts?: ReactSnippetOptions): ReactNode {
  if (!html) return null;
  if (typeof window === "undefined") return html; // SSR-safe fallback for SSR/SSG
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const allowLinks = opts?.allowLinks !== false;

  const convert = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const children = Array.from(el.childNodes).map((child, idx) => convert(child, idx));
    switch (el.tagName.toLowerCase()) {
      case "a":
        if (allowLinks) {
          return (
            <a key={key} href={el.getAttribute("href") ?? ""} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        }
        // Render as non-link inline element to avoid nested anchors
        return (
          <span key={key} className="underline decoration-dotted">
            {children}
          </span>
        );
      case "code":
        return <code key={key}>{children}</code>;
      case "strong":
        return <strong key={key}>{children}</strong>;
      case "em":
        return <em key={key}>{children}</em>;
      default:
        return <Fragment key={key}>{children}</Fragment>;
    }
  };

  return Array.from(doc.body.childNodes).map((node, idx) => convert(node, idx));
}

export function toSafeReactSnippet(raw: string | undefined | null, maxLength = 220): ReactNode {
  const html = toSafeHtmlSnippet(raw, maxLength);
  return toSafeReactNodes(html);
}

// Variant safe to render inside clickable containers or Links
export function toSafeReactSnippetNoLinks(raw: string | undefined | null, maxLength = 220): ReactNode {
  const html = toSafeHtmlSnippet(raw, maxLength);
  return toSafeReactNodes(html, { allowLinks: false });
}
