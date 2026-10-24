const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const integrate = require("../../公共资源/动力与工作机构/integrate.cjs");
const template = read("src/index.template.html");
const styles = ["src/style.css", "src/enhancements.css", "src/learning.css"];
// These classic scripts intentionally run in order: rendering library, model,
// labels, framing, component explanations, tasks, and finally application setup.
const scripts = [
  ["THREE", "vendor/three.min.js"],
  ["MODEL", "src/model.js"],
  ["ANNOTATIONS", "src/annotations.js"],
  ["FOCUS", "src/focus.js"],
  ["KNOWLEDGE", "src/knowledge.js"],
  ["LEARNING", "src/learning.js"],
  ["APP", "src/app.js"],
];

function replaceBlock(html, expression, replacement, name) {
  if (!expression.test(html)) throw new Error(`Template is missing ${name}`);
  return html.replace(expression, () => replacement);
}
const stylePattern = /<style>\s*\/\*STYLE\*\/\s*<\/style>/;
const scriptPattern = (token) =>
  new RegExp(`<script>\\s*\\/\\*${token}\\*\\/\\s*<\\/script>`);
// A literal closing tag in embedded JavaScript would terminate the HTML script.
const inline = (code) => code.replace(/<\/script/gi, "<\\/script");
const notice = `<!-- Three.js: MIT License\n${read("vendor/LICENSE-three.txt").trim()}\n-->\n`;
const addNotice = (html) => html.replace(/<html\b/, `${notice}<html`);

// The development entry loads editable files directly. It also works as the
// repository root entry for static hosting with its src/ and vendor/ folders.
let development = replaceBlock(
  template,
  stylePattern,
  styles.map((file) => `<link rel="stylesheet" href="${file}">`).join("\n"),
  "STYLE",
);
// The distribution entry embeds the same sources for one-file offline use.
let standalone = replaceBlock(
  template,
  stylePattern,
  `<style>\n${styles.map(read).join("\n")}\n</style>`,
  "STYLE",
);
for (const [token, file] of scripts) {
  development = replaceBlock(
    development,
    scriptPattern(token),
    `<script src="${file}"></script>`,
    token,
  );
  standalone = replaceBlock(
    standalone,
    scriptPattern(token),
    `<script>\n${inline(read(file))}\n</script>`,
    token,
  );
}
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "index.html"), integrate(addNotice(development), "transmission", "../"));
fs.writeFileSync(
  path.join(root, "dist/机械动力实验室.html"),
  integrate(addNotice(standalone), "transmission", "../../"),
);
console.log("Generated index.html (editable source entry)");
console.log("Generated dist/机械动力实验室.html (offline standalone)");
