import { describe, it, expect } from "vitest";
import { shouldExportNode } from "@/lib/shouldExportNode";

describe("export report node filtering", () => {
  it("allows non-element nodes", () => {
    const text = document.createTextNode("hello");
    expect(shouldExportNode(text)).toBe(true);
  });

  it("filters out buttons and excluded elements", () => {
    const button = document.createElement("button");
    expect(shouldExportNode(button)).toBe(false);

    const excluded = document.createElement("div");
    excluded.setAttribute("data-export-exclude", "");
    expect(shouldExportNode(excluded)).toBe(false);

    const controls = document.createElement("div");
    controls.classList.add("react-flow__controls");
    expect(shouldExportNode(controls)).toBe(false);

    const normal = document.createElement("div");
    expect(shouldExportNode(normal)).toBe(true);
  });
});
