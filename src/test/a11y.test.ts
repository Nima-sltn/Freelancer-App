import { describe, expect, it } from "vitest";
import { checkA11y, assertNoA11yViolations } from "./a11y";

describe("a11y utilities", () => {
  describe("image alt text", () => {
    it("flags images missing an alt attribute", async () => {
      const container = document.createElement("div");
      container.innerHTML = '<img src="/test.jpg" />';
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-image-alt")).toBe(true);
    });

    it("passes images with alt text, empty alt (decorative), or role='presentation'", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <img src="/test1.jpg" alt="A handsome avatar" />
        <img src="/test2.jpg" alt="" />
        <img src="/test3.jpg" role="presentation" />
      `;
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-image-alt")).toBe(false);
    });
  });

  describe("form control labels", () => {
    it("flags inputs missing an accessible label", async () => {
      const container = document.createElement("div");
      container.innerHTML = '<input type="text" name="email" />';
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-form-label")).toBe(true);
    });

    it("passes inputs with wrapping label, label-for, aria-label, or title", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <label>Email <input type="email" /></label>
        <label for="pwd">Password</label><input id="pwd" type="password" />
        <input type="text" aria-label="Search" />
        <input type="text" title="City" />
      `;
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-form-label")).toBe(false);
    });
  });

  describe("button accessible names", () => {
    it("flags icon-only buttons without accessible labels", async () => {
      const container = document.createElement("div");
      container.innerHTML = '<button><svg width="16" height="16"></svg></button>';
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-button-name")).toBe(true);
    });

    it("passes buttons with text, aria-label, title, or labeled icon", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button>Submit</button>
        <button aria-label="Close dialog"><svg></svg></button>
        <button title="Settings"><svg></svg></button>
      `;
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "missing-button-name")).toBe(false);
    });
  });

  describe("heading hierarchy", () => {
    it("flags heading level skips (e.g. h1 to h3)", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <h1>Main Title</h1>
        <h3>Skipped Subheading</h3>
      `;
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "heading-hierarchy-skip")).toBe(true);
    });

    it("passes sequential headings", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <h1>Main Title</h1>
        <h2>Section Title</h2>
        <h3>Subsection Title</h3>
      `;
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "heading-hierarchy-skip")).toBe(false);
    });
  });

  describe("color contrast", () => {
    it("flags text with insufficient contrast against background", async () => {
      const container = document.createElement("div");
      const badSpan = document.createElement("span");
      badSpan.textContent = "Hard to read text";
      badSpan.style.color = "#111111";
      badSpan.style.backgroundColor = "#000000";
      container.appendChild(badSpan);

      const violations = await checkA11y(container);
      expect(violations.some((v) => v.id === "insufficient-color-contrast")).toBe(true);
    });

    it("passes high-contrast text", async () => {
      const container = document.createElement("div");
      const goodSpan = document.createElement("span");
      goodSpan.textContent = "Clear contrast text";
      goodSpan.style.color = "#ffffff";
      goodSpan.style.backgroundColor = "#000000";
      container.appendChild(goodSpan);

      const violations = await checkA11y(container);
      expect(violations.some((v) => v.id === "insufficient-color-contrast")).toBe(false);
    });
  });

  describe("html lang attribute", () => {
    it("flags <html> element without lang", async () => {
      const htmlEl = document.createElement("html");
      const violations = await checkA11y(htmlEl);

      expect(violations.some((v) => v.id === "missing-html-lang")).toBe(true);
    });

    it("passes <html> element with valid lang attribute", async () => {
      const htmlEl = document.createElement("html");
      htmlEl.setAttribute("lang", "fa");
      const violations = await checkA11y(htmlEl);

      expect(violations.some((v) => v.id === "missing-html-lang")).toBe(false);
    });
  });

  describe("interactive element focusability", () => {
    it("flags custom role='button' without tabindex", async () => {
      const container = document.createElement("div");
      container.innerHTML = '<div role="button">Click me</div>';
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "unfocusable-interactive-element")).toBe(true);
    });

    it("passes custom role='button' with tabindex='0'", async () => {
      const container = document.createElement("div");
      container.innerHTML = '<div role="button" tabindex="0">Click me</div>';
      const violations = await checkA11y(container);

      expect(violations.some((v) => v.id === "unfocusable-interactive-element")).toBe(false);
    });
  });

  describe("assertNoA11yViolations", () => {
    it("resolves when there are no violations", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <h1>Dashboard</h1>
        <h2>Projects</h2>
        <button>View All</button>
      `;
      await expect(assertNoA11yViolations(container)).resolves.not.toThrow();
    });

    it("throws descriptive error when violations exist", async () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <img src="/broken.png" />
        <button><svg></svg></button>
      `;
      await expect(assertNoA11yViolations(container)).rejects.toThrow(
        /Accessibility violations found/
      );
    });
  });
});
