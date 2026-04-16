#!/usr/bin/env node
// beyondBINARY quantum-prefixed | uvspeed | zsh bridge: open PWA pages (commands run in HexTerm, not in shell)
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function findRepo() {
  let d = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(d, "web", "terminal.html"))) return d;
    const p = path.dirname(d);
    if (p === d) break;
    d = p;
  }
  return process.cwd();
}

const repo = process.env.UVSPEED_ROOT || findRepo();
const web = path.join(repo, "web");
const pages = {
  terminal: path.join(web, "terminal.html"),
  raw: path.join(web, "raw-games-ugrad.html"),
  hub: path.join(web, "games-ugrad-hub.html"),
  alphabet: path.join(web, "digital_alphabet.html"),
};

function openFile(p) {
  if (!fs.existsSync(p)) {
    console.error("ugrad-cli: missing file:", p);
    console.error("Set UVSPEED_ROOT or run from a uvspeed checkout.");
    process.exit(2);
  }
  const url = "file://" + p;
  const platform = process.platform;
  if (platform === "darwin") spawnSync("open", [url], { stdio: "inherit" });
  else if (platform === "win32") spawnSync("cmd", ["/c", "start", "", url], { stdio: "inherit" });
  else spawnSync("xdg-open", [url], { stdio: "inherit" });
}

const argv = process.argv.slice(2);
const cmd = argv[0] || "help";

if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  console.log(`
ugrad / ugrad-cli — zsh cannot run μgrad commands; they execute in the browser (HexTerm).

  npm exec ugrad-cli open       open terminal.html (HexTerm)
  npm exec ugrad-cli raw        open raw-games-ugrad.html (Apache-style corpus index)
  npm exec ugrad-cli hub        open games hub
  npm exec ugrad-cli alphabet   open digital_alphabet.html

Then in HexTerm type:  ugrad games  |  ugrad go  |  goboard watch  |  alphabet lb

GitHub Pages: https://qbitos.github.io/uvspeed/web/terminal.html
`);
  process.exit(0);
}

if (cmd === "open") openFile(pages.terminal);
else if (cmd === "raw") openFile(pages.raw);
else if (cmd === "hub") openFile(pages.hub);
else if (cmd === "alphabet") openFile(pages.alphabet);
else {
  console.error("ugrad-cli: unknown command:", cmd);
  console.error("Try: ugrad-cli help");
  process.exit(1);
}
