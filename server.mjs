import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 3000);
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".glb":"model/gltf-binary", ".svg":"image/svg+xml", ".png":"image/png", ".webp":"image/webp", ".jpg":"image/jpeg", ".ico":"image/x-icon" };
createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let relative = pathname === "/" ? "web/index.html" : pathname.startsWith("/game/assets/") ? pathname.slice(1) : "web" + pathname;
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end("Forbidden"); return; }
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end("Not found"); return; }
  res.writeHead(200, { "Content-Type":types[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control":file.endsWith(".glb") ? "public, max-age=3600" : "no-cache", "X-Content-Type-Options":"nosniff" });
  createReadStream(file).pipe(res);
}).listen(port,"0.0.0.0", () => console.log("Scrapline web garage running on port "+port));
