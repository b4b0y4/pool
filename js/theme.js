const themeManager = {
  themes: ["light", "dark"],
  sys: () => (matchMedia("(prefers-color-scheme: dark)").matches ? 1 : 0),
  cur() {
    return localStorage.themeOverride
      ? this.themes.indexOf(localStorage.themeOverride)
      : this.sys();
  },
  apply() {
    let o = localStorage.themeOverride,
      t = this.themes[this.cur()];
    Object.assign(document.documentElement.dataset, {
      theme: t,
      themeSource: o ? "manual" : "system",
      selectedTheme: o ? t : "",
    });
  },
  cycle() {
    localStorage.themeOverride = this.themes[(this.cur() + 1) % 2];
    this.apply();
  },
  reset() {
    localStorage.removeItem("themeOverride");
    this.apply();
  },
};
document.addEventListener("DOMContentLoaded", () => {
  let btn = document.getElementById("theme-btn");
  if (btn) {
    btn.onclick = () => themeManager.cycle();
    btn.ondblclick = (e) => (e.preventDefault(), themeManager.reset());
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    () => !localStorage.themeOverride && themeManager.apply(),
  );
  themeManager.apply();
});
