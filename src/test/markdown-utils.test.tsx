import { describe, it, expect } from "vitest";
import { toSafeHtmlSnippet, toSafeReactSnippet } from "@/lib/markdown-utils";
import { render } from "@testing-library/react";

describe("markdown utils", () => {
  it("renders http links safely and strips non-http", () => {
    const html = toSafeHtmlSnippet("See [docs](https://example.com) and [bad](javascript:alert(1)) now.", 500);
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain(">docs<");
    // Non-http link should be rendered as plain text
    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
  });

  it("renders inline code and strips unsafe html", () => {
    const html = toSafeHtmlSnippet("Use `rm -rf /` and <script>alert(1)</script>", 500);
    expect(html).toContain("<code>rm -rf /</code>");
    // Script tag should be stripped entirely (no escaped tag)
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("&lt;script&gt;");
    expect(html).toContain("alert(1)");
  });

  it("trims to 1-2 sentences and appends ellipsis when too long", () => {
    const text = "Sentence one is quite long and descriptive. Sentence two adds further detail about the behavior. Sentence three should not appear.";
    const html = toSafeHtmlSnippet(text, 80);
    // Should end with ellipsis and be reasonably short
    expect(html.endsWith("..."));
    expect(html.length).toBeLessThanOrEqual(83);
  });

  it("renders react elements without XSS risk", () => {
    const elements = toSafeReactSnippet("Link to [docs](https://safe.com) and <script>alert('x')</script>", 500);
    const { container } = render(<div>{elements}</div>);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://safe.com");
    expect(container.textContent).toContain("alert('x')");
    expect(container.innerHTML).not.toContain("<script>");
  });
});
