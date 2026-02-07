/// <reference types="bun-types" />
/// <reference types="node" />

import { join } from "path";

const DIST_DIR = new URL("./dist/", import.meta.url).pathname;

Bun.serve({
  hostname: "0.0.0.0",
  port: 3000,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    const filePath = join(DIST_DIR, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) return new Response(file);

    // SPA fallback
    return new Response(Bun.file(join(DIST_DIR, "index.html")));
  },
});

console.log("Server running at http://localhost:3000");
