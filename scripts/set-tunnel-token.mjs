#!/usr/bin/env node
/**
 * Copy box 3 on the Cloudflare tunnel page (macOS), then:
 *   npm run gym:token
 * Do not run that cloudflared line in Terminal. Shape Lab starts the tunnel.
 *
 * If the clipboard is empty, paste the line as an argument:
 *   npm run gym:token -- --token eyJ…
 *   npm run gym:token -- 'cloudflared tunnel run --token eyJ…'
 */
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stdin as stdinStream, stdout as stdoutStream } from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

function clipboard() {
  try {
    return execFileSync("pbpaste", { encoding: "utf8" });
  } catch {
    return "";
  }
}

/** Cloudflare connector tokens are one eyJ… blob (no dots). JWT-shaped tokens also work. */
function extractToken(raw) {
  const text = String(raw || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
  const fromFlag = text.match(/--token\s+['"]?([A-Za-z0-9._~+/-]+=*)['"]?/i);
  const blob = (fromFlag ? fromFlag[1] : text).replace(/\s+/g, "");
  if (!blob.startsWith("eyJ")) return "";
  if (blob.length < 80) return "";
  if (/paste the token/i.test(blob)) return "";
  return blob;
}

function argvToken() {
  const args = process.argv.slice(2).filter((a) => a !== "--self-test" && a !== "--if-missing" && a !== "--no-prompt");
  const i = args.indexOf("--token");
  if (i >= 0) return extractToken(args.slice(i + 1).join(" "));
  return extractToken(args.join(" "));
}

function envToken() {
  if (!existsSync(envPath)) return "";
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*CLOUDFLARE_TUNNEL_TOKEN=(.*)$/);
    if (!m) continue;
    return extractToken(m[1]);
  }
  return "";
}

if (process.argv.includes("--self-test")) {
  const connector =
    "eyJhIjoi" + "A".repeat(40) + "IiwidCI6ImZha2UtdHVubmVsLWlkIiwicyI6ImZha2Utc2VjcmV0LXZhbHVlLWhlcmUifQ";
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaGFwZS1sYWItc2VsZi10ZXN0IiwibmFtZSI6InRlc3QiLCJpYXQiOjE1MTYyMzkwMjJ9.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const cases = [
    [connector, connector],
    [`cloudflared tunnel run --token ${connector}`, connector],
    [`--token '${connector}'`, connector],
    [`cloudflared tunnel run --token '${connector}'`, connector],
    [jwt, jwt],
    ["eyJ...paste the token...", ""],
    ["eyJshort", ""],
    ["", ""],
  ];
  for (const [input, want] of cases) {
    const got = extractToken(input);
    if (got !== want) {
      console.error(`extractToken failed\n input: ${input.slice(0, 48)}\n  want: ${want.slice(0, 48)}\n   got: ${got.slice(0, 48)}`);
      process.exit(1);
    }
  }
  console.log("gym:token extractor ok");
  process.exit(0);
}

function promptPaste() {
  if (!stdinStream.isTTY) {
    return new Promise((resolve) => {
      const chunks = [];
      stdinStream.setEncoding("utf8");
      stdinStream.on("data", (chunk) => chunks.push(chunk));
      stdinStream.on("end", () => resolve(chunks.join("")));
      stdinStream.on("error", () => resolve(""));
    });
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdinStream, output: stdoutStream });
    console.log("");
    console.log("Paste the box-3 line below, then press Return.");
    console.log("It can be the whole cloudflared … --token eyJ… line, or just the eyJ… part.");
    rl.question("> ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function saveToken(token) {
  let body = "";
  if (existsSync(envPath)) body = readFileSync(envPath, "utf8");
  else if (existsSync(examplePath)) body = readFileSync(examplePath, "utf8");

  const lines = body.split(/\r?\n/);
  let seenToken = false;
  let seenHost = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*CLOUDFLARE_TUNNEL_TOKEN=/.test(line)) {
      out.push(`CLOUDFLARE_TUNNEL_TOKEN=${token}`);
      seenToken = true;
      continue;
    }
    if (/^\s*CLOUDFLARE_TUNNEL_HOSTNAME=/.test(line)) {
      out.push("CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.shapelab.win");
      seenHost = true;
      continue;
    }
    out.push(line);
  }
  if (!seenToken) out.push(`CLOUDFLARE_TUNNEL_TOKEN=${token}`);
  if (!seenHost) out.push("CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.shapelab.win");
  while (out.length && out[out.length - 1] === "") out.pop();
  out.push("");
  writeFileSync(envPath, out.join("\n"));
  console.log(`Saved tunnel token (${token.length} characters) to .env`);
  console.log("Next: npm run gym:mac");
  console.log("Then on iPad / phone: https://gym.shapelab.win");
  console.log("Leave the Terminal window open. Do not pause Vercel until names and faces show there.");
}

async function main() {
  const ifMissing = process.argv.includes("--if-missing");
  const noPrompt = process.argv.includes("--no-prompt");
  if (ifMissing && envToken()) {
    console.log("Tunnel token already saved in .env");
    return;
  }
  let token = argvToken() || extractToken(clipboard());
  if (!token && !noPrompt) {
    token = extractToken(await promptPaste());
  }
  if (!token) {
    if (noPrompt) {
      console.warn("No tunnel token in .env or clipboard. gym.shapelab.win will 502 until you copy the box-3 line and start again.");
      process.exit(0);
    }
    console.error(`That paste was not a Cloudflare token.

Paste the box-3 line into this command (quotes matter), then press Return:

  npm run gym:token -- --token 'cloudflared tunnel run --token eyJ…'

Or run npm run gym:token again and paste when you see the > prompt.`);
    process.exit(1);
  }
  saveToken(token);
}

await main();
