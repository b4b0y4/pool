export default class Copy {
  static initialized = false;
  static elements = new WeakSet();
  static icon = `
    <svg class="copy-icon-svg" width="16" height="16" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  `;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    document.addEventListener(
      "click",
      (e) => {
        const el = e.target.closest("[data-copy]");
        if (!el) return;
        e.preventDefault();
        this.copy(el.getAttribute("data-copy"), el);
      },
      true,
    );

    const enhance = (el) => {
      if (this.elements.has(el)) return;
      Object.assign(el.style, {
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
      });
      el.title ||= "Click to copy";
      if (!el.querySelector(".copy-icon-svg"))
        el.insertAdjacentHTML("beforeend", this.icon);
      this.elements.add(el);
    };

    new MutationObserver((muts) =>
      muts
        .flatMap((m) => [...m.addedNodes])
        .filter((n) => n.nodeType === 1)
        .forEach((n) => {
          if (n.matches?.("[data-copy]")) enhance(n);
          n.querySelectorAll?.("[data-copy]")?.forEach(enhance);
        }),
    ).observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll("[data-copy]").forEach(enhance);
  }

  static async copy(text, el) {
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    this.feedback(el, ok);
    return ok;
  }

  static feedback(el, ok) {
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;

    const icon = ok
      ? '<polyline points="20 6 9 17 4 12" />'
      : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    const title = ok ? "Copied!" : "Copy failed";

    const prev = { inner: svg.innerHTML, title: el.title };
    svg.innerHTML = icon;
    el.classList.add(ok ? "copy-success" : "copy-error");
    el.title = title;

    setTimeout(() => {
      svg.innerHTML = prev.inner;
      el.classList.remove("copy-success", "copy-error");
      el.title = prev.title || "Click to copy";
    }, 2000);
  }
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", () => Copy.init())
  : Copy.init();
