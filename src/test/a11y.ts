/**
 * Lightweight Accessibility (a11y) Testing Utilities.
 *
 * Implements targeted accessibility validation rules without third-party dependencies:
 *  - Missing alt text on images
 *  - Missing labels on form controls (inputs, textareas, selects)
 *  - Missing accessible names on buttons (e.g. icon-only buttons)
 *  - Heading hierarchy skips (e.g. <h1> directly followed by <h3>)
 *  - Basic text and background color contrast
 *  - Missing lang attribute on HTML root
 *  - Keyboard focusability of custom interactive elements
 */

export interface A11yViolation {
  id: string;
  description: string;
  nodes: HTMLElement[];
  helpUrl?: string;
}

// ---------------------------------------------------------------- Color Contrast Helper

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColorString(color: string): RGB | null {
  const c = color.trim().toLowerCase();
  if (c === "transparent" || c === "inherit" || c === "initial" || !c) {
    return null;
  }

  if (c === "white") return { r: 255, g: 255, b: 255 };
  if (c === "black") return { r: 0, g: 0, b: 0 };

  // Hex format #rgb, #rrggbb
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // rgb(r, g, b) / rgba(r, g, b, a)
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

function calculateRelativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(fg: RGB, bg: RGB): number {
  const l1 = calculateRelativeLuminance(fg);
  const l2 = calculateRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------- Rules

function checkImageAlt(container: HTMLElement): HTMLElement[] {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  if (container.tagName === "IMG") {
    images.push(container as HTMLImageElement);
  }

  return images.filter((img) => {
    const role = img.getAttribute("role");
    if (role === "presentation" || role === "none") return false;
    if (img.getAttribute("aria-hidden") === "true") return false;
    return !img.hasAttribute("alt");
  });
}

function getSearchRoot(el: HTMLElement, container: HTMLElement): ParentNode {
  const root = el.getRootNode();
  if (root && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && "querySelector" in root) {
    return root as ParentNode;
  }
  return container;
}

function checkFormControlLabels(container: HTMLElement): HTMLElement[] {
  const controls = Array.from(
    container.querySelectorAll<HTMLElement>("input, select, textarea")
  );
  if (["INPUT", "SELECT", "TEXTAREA"].includes(container.tagName)) {
    controls.push(container);
  }

  return controls.filter((el) => {
    const inputType = el.getAttribute("type")?.toLowerCase();
    if (["hidden", "submit", "reset", "button", "image"].includes(inputType ?? "")) {
      return false;
    }

    if (el.getAttribute("aria-hidden") === "true") return false;

    // Check aria-label
    if (el.getAttribute("aria-label")?.trim()) return false;

    const root = getSearchRoot(el, container);

    // Check aria-labelledby
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const labelEl = root.querySelector?.(`[id="${labelledby}"]`);
      if (labelEl && labelEl.textContent?.trim()) return false;
    }

    // Check title attribute
    if (el.getAttribute("title")?.trim()) return false;

    // Check wrapping <label>
    const parentLabel = el.closest("label");
    if (parentLabel && parentLabel.textContent?.trim()) return false;

    // Check explicit <label for="id">
    if (el.id) {
      const explicitLabel = root.querySelector?.(`label[for="${el.id}"]`);
      if (explicitLabel && explicitLabel.textContent?.trim()) return false;
    }

    return true;
  });
}

function checkButtonAccessibleNames(container: HTMLElement): HTMLElement[] {
  const buttons = Array.from(
    container.querySelectorAll<HTMLElement>("button, [role='button']")
  );
  if (container.tagName === "BUTTON" || container.getAttribute("role") === "button") {
    buttons.push(container);
  }

  return buttons.filter((btn) => {
    if (btn.getAttribute("aria-hidden") === "true") return false;

    // Direct text content
    if (btn.textContent?.trim()) return false;

    // aria-label
    if (btn.getAttribute("aria-label")?.trim()) return false;

    const root = getSearchRoot(btn, container);

    // aria-labelledby
    const labelledby = btn.getAttribute("aria-labelledby");
    if (labelledby) {
      const labelEl = root.querySelector?.(`[id="${labelledby}"]`);
      if (labelEl && labelEl.textContent?.trim()) return false;
    }

    // title
    if (btn.getAttribute("title")?.trim()) return false;

    // Child image with alt text
    const childImg = btn.querySelector("img[alt]");
    if (childImg && childImg.getAttribute("alt")?.trim()) return false;

    // Child SVG with title or aria-label
    const childSvg = btn.querySelector("svg");
    if (childSvg) {
      if (childSvg.getAttribute("aria-label")?.trim()) return false;
      const svgTitle = childSvg.querySelector("title");
      if (svgTitle && svgTitle.textContent?.trim()) return false;
    }

    return true;
  });
}

function checkHeadingHierarchy(container: HTMLElement): HTMLElement[] {
  const headings = Array.from(
    container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
  );
  if (/^H[1-6]$/.test(container.tagName)) {
    headings.unshift(container);
  }

  const violations: HTMLElement[] = [];
  let lastLevel: number | null = null;

  for (const heading of headings) {
    const currentLevel = parseInt(heading.tagName[1], 10);
    if (lastLevel !== null && currentLevel > lastLevel + 1) {
      violations.push(heading);
    }
    lastLevel = currentLevel;
  }

  return violations;
}

function checkColorContrast(container: HTMLElement): HTMLElement[] {
  const elements = [container, ...Array.from(container.querySelectorAll<HTMLElement>("*"))];
  const violations: HTMLElement[] = [];

  for (const el of elements) {
    const fgColorStr = el.style.color;
    const bgColorStr = el.style.backgroundColor;

    if (!fgColorStr || !bgColorStr) continue;

    const fg = parseColorString(fgColorStr);
    const bg = parseColorString(bgColorStr);

    if (fg && bg) {
      const ratio = getContrastRatio(fg, bg);
      // Minimum WCAG AA contrast ratio threshold is 3:1 for large text, 4.5:1 for regular text
      if (ratio < 3.0) {
        violations.push(el);
      }
    }
  }

  return violations;
}

function checkMissingLang(container: HTMLElement): HTMLElement[] {
  if (container.tagName === "HTML") {
    const lang = container.getAttribute("lang");
    if (!lang || !lang.trim()) {
      return [container];
    }
  }

  const childHtml = container.querySelector("html");
  if (childHtml && (!childHtml.getAttribute("lang") || !childHtml.getAttribute("lang")?.trim())) {
    return [childHtml];
  }

  return [];
}

function checkInteractiveFocusable(container: HTMLElement): HTMLElement[] {
  const customInteractive = Array.from(
    container.querySelectorAll<HTMLElement>("[role='button'], [role='link'], [role='checkbox'], [role='tab']")
  );

  return customInteractive.filter((el) => {
    // Native buttons, links with href, and inputs are focusable by default
    if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return false;
    if (el.tagName === "A" && el.hasAttribute("href")) return false;

    // Custom elements with interactive roles must have tabindex="0" or >= 0
    const tabindex = el.getAttribute("tabindex");
    if (tabindex === null || tabindex === "-1") {
      return true;
    }
    return false;
  });
}

// ---------------------------------------------------------------- Core Runner

/**
 * Runs lightweight accessibility checks on the specified container DOM element.
 * Returns an array of detected a11y violations.
 */
export async function checkA11y(container: HTMLElement): Promise<A11yViolation[]> {
  const violations: A11yViolation[] = [];

  // 1. Missing Image Alt
  const missingAlt = checkImageAlt(container);
  if (missingAlt.length > 0) {
    violations.push({
      id: "missing-image-alt",
      description: "Images must have an alt attribute or role='presentation' for decorative graphics.",
      nodes: missingAlt,
      helpUrl: "https://www.w3.org/WAI/tutorials/images/",
    });
  }

  // 2. Missing Form Control Labels
  const unlabeledControls = checkFormControlLabels(container);
  if (unlabeledControls.length > 0) {
    violations.push({
      id: "missing-form-label",
      description: "Form controls must have an associated accessible label (label element, aria-label, or title).",
      nodes: unlabeledControls,
      helpUrl: "https://www.w3.org/WAI/tutorials/forms/labels/",
    });
  }

  // 3. Icon Buttons without Accessible Names
  const namelessButtons = checkButtonAccessibleNames(container);
  if (namelessButtons.length > 0) {
    violations.push({
      id: "missing-button-name",
      description: "Buttons must have accessible text content or an aria-label.",
      nodes: namelessButtons,
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    });
  }

  // 4. Heading Hierarchy
  const skippedHeadings = checkHeadingHierarchy(container);
  if (skippedHeadings.length > 0) {
    violations.push({
      id: "heading-hierarchy-skip",
      description: "Heading levels should only increase by one level at a time (e.g. h1 followed by h2, not h3).",
      nodes: skippedHeadings,
      helpUrl: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
    });
  }

  // 5. Basic Color Contrast
  const lowContrast = checkColorContrast(container);
  if (lowContrast.length > 0) {
    violations.push({
      id: "insufficient-color-contrast",
      description: "Text and background color contrast ratio must be at least 3:1.",
      nodes: lowContrast,
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
    });
  }

  // 6. Missing HTML Lang Attribute
  const missingLang = checkMissingLang(container);
  if (missingLang.length > 0) {
    violations.push({
      id: "missing-html-lang",
      description: "The <html> element must have a non-empty lang attribute.",
      nodes: missingLang,
      helpUrl: "https://www.w3.org/WAI/tutorials/page-structure/labels/#language",
    });
  }

  // 7. Interactive Elements Keyboard Focusable
  const unfocusable = checkInteractiveFocusable(container);
  if (unfocusable.length > 0) {
    violations.push({
      id: "unfocusable-interactive-element",
      description: "Custom interactive elements with roles must have tabindex='0' to be focusable.",
      nodes: unfocusable,
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
    });
  }

  return violations;
}

/**
 * Asserts that the given container element has no accessibility violations.
 * Throws an descriptive error if any violations are found.
 */
export async function assertNoA11yViolations(container: HTMLElement): Promise<void> {
  const violations = await checkA11y(container);
  if (violations.length > 0) {
    const details = violations
      .map(
        (v) =>
          `  - [${v.id}] ${v.description} (${v.nodes.length} element${v.nodes.length > 1 ? "s" : ""})`
      )
      .join("\n");
    throw new Error(`Accessibility violations found:\n${details}`);
  }
}
