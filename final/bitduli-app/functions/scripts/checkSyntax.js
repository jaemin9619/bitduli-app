import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const roots = ["index.js", "src", "test", "scripts"];
const files = roots.flatMap((entry) => collectJavaScriptFiles(resolve(entry)));

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Checked ${files.length} JavaScript files.`);

function collectJavaScriptFiles(path) {
  if (!statSync(path).isDirectory()) {
    return path.endsWith(".js") ? [path] : [];
  }
  return readdirSync(path)
    .map((name) => join(path, name))
    .flatMap(collectJavaScriptFiles)
    .filter((file) => file.endsWith(".js"));
}
