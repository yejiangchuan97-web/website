const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4317);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if (file.split(path.sep).some((segment) => segment.startsWith("."))) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if ((await fs.promises.stat(file)).isDirectory())
      file = path.join(file, "index.html");
    const data = await fs.promises.readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 400);
    res.end(error.code === "ENOENT" ? "Not found" : "Bad request");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Open http://127.0.0.1:${port} · Ctrl+C to stop`),
);
