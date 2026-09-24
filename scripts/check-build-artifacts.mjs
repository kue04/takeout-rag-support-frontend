#!/usr/bin/env node
/**
 * check-build-artifacts.mjs —— 前端构建产物「泄漏守卫」
 *
 * 为什么需要它
 * ------------
 * 踩坑 C8：`VITE_` 前缀的变量会被 Vite 在**构建期**内联成字符串字面量写进
 * dist/*.js。而 dist 是静态文件，一上线就是人人可 curl 的东西。所以
 * 「把凭据放进 .env」这条经验在前端是**反的** —— 它把暴露面从「代码仓库」
 * 变成了「每一个访客」。
 *
 * 这件事写在文档里没人会记得查。本脚本把判据变成可执行门禁：
 * CI 每次构建后跑一遍，命中即红。
 *
 * 退出码（沿用踩坑 C7 的约定：前置缺失不得退化成「跳过」）
 * --------------------------------------------------------
 *   0 = 全绿
 *   1 = 判定失败 —— 产物里确实发现了泄漏
 *   2 = 无法判定 —— 产物不存在 / 为空 / .env.production 缺失
 *       （注意：2 也是红。缺凭据就该报错，不能默默放行）
 *
 * 用法
 * ----
 *   node scripts/check-build-artifacts.mjs                 # 默认查 dist/
 *   node scripts/check-build-artifacts.mjs --dist out/
 *   node scripts/check-build-artifacts.mjs --env .env.production
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const EXIT_OK = 0;
const EXIT_LEAK = 1;
const EXIT_UNKNOWN = 2;

/** 会被当作文本扫描的产物扩展名。二进制（png/woff/ico）跳过。 */
const TEXT_EXT = new Set([
  ".js", ".mjs", ".cjs", ".css", ".html", ".htm",
  ".json", ".svg", ".txt", ".xml", ".map", ".webmanifest",
]);

/** 单条规则在同一文件里最多报告几处，避免 minified 文件刷屏。 */
const MAX_HITS = 5;

/**
 * 禁止出现在产物里的模式。
 * 每条都要能说清「命中了会怎样」—— 说不清的规则不该进守卫。
 */
const RULES = [
  {
    id: "loopback-ip",
    level: "error",
    re: /127\.0\.0\.1/g,
    why: "回环地址会被编译期焊死：访客浏览器去请求他自己那台机器，服务器上的后端从头到尾无人访问",
  },
  {
    id: "loopback-host",
    level: "error",
    re: /localhost/g,
    why: "与 127.0.0.1 等价的本机地址",
  },
  {
    id: "ipv6-loopback",
    level: "error",
    re: /\[::1\]/g,
    why: "IPv6 回环地址",
  },
  {
    id: "wildcard-host",
    level: "error",
    re: /0\.0\.0\.0/g,
    why: "通配监听地址不是可用的请求目标，浏览器侧必然失败",
  },
  {
    id: "private-network",
    level: "error",
    re: /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g,
    why: "局域网地址同样只在开发机可达；上线后访客解析不到",
  },
  {
    id: "inline-jwt",
    level: "error",
    // 三段式 JWT 形状：header.payload.signature，每段 base64url
    re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
    why: "产物里内联了完整令牌 —— 任何访客下载 JS 即可提取，且过期后全体 401",
  },
  {
    id: "plaintext-http",
    level: "warn",
    // 排除 W3C 命名空间（www.w3.org/2000/svg、/1999/xhtml 等）：它们是
    // createElementNS 的标识符，不产生任何网络请求，命中必然是误报。
    // 误报会淹没真命中 —— 曾经 21 条提示里 21 条全是它。
    re: /http:\/\/(?!127\.|localhost|\[::1\]|0\.0\.0\.0|www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/gi,
    why: "明文 http 外链：HTTPS 页面下会被混合内容策略拦掉（仅提示，不阻断）",
  },
];

/** .env.production 里必须留空的项。留空 = 产物不含本机地址与凭据。 */
const MUST_BE_EMPTY_IN_ENV = ["VITE_API_BASE_URL", "VITE_DEV_TOKEN"];

function parseArgs(argv) {
  const out = { dist: "dist", env: ".env.production", help: false, selfTest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dist") out.dist = argv[++i];
    else if (a === "--env") out.env = argv[++i];
    else if (a === "--self-test") out.selfTest = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a.startsWith("--dist=")) out.dist = a.slice("--dist=".length);
    else if (a.startsWith("--env=")) out.env = a.slice("--env=".length);
    else {
      console.error(`未知参数：${a}（--help 看用法）`);
      return null;
    }
  }
  return out;
}

function usage() {
  console.log(`产物泄漏守卫 —— 扫描前端构建产物中的本机地址与内联凭据

用法：
  node scripts/check-build-artifacts.mjs [--dist <目录>] [--env <文件>]

参数：
  --dist <目录>   构建产物目录，默认 dist
  --env  <文件>   生产环境配置文件，默认 .env.production
                  （校验它存在，且 ${MUST_BE_EMPTY_IN_ENV.join(" / ")} 均为空）
  --self-test     只验证探针本身：给定样本，该抓的能抓到、该放的能放过

退出码：0=全绿  1=发现泄漏或自测失败  2=无法判定（产物缺失/为空/env 缺失）`);
}

/** 递归收集产物目录下的文件。 */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue; // 符号链接失效之类，跳过
    }
    if (st.isDirectory()) walk(p, acc);
    else acc.push({ path: p, size: st.size });
  }
  return acc;
}

/** 简易 .env 解析：只取第一个 = 号，跳过注释与空行。 */
function parseEnvFile(text) {
  const m = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    m.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  return m;
}

/** 取命中位置附近的片段，压掉换行，便于在 CI 日志里一眼看到上下文。 */
function snippet(text, index, span = 70) {
  const s = text.slice(Math.max(0, index - span), index + span);
  return s.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ *
 * 自测：探针本身的效力
 *
 * 一个「没报警」的守卫有两种可能：产物干净，或者探针瞎了。
 * 分不清这两件事的门禁等于没有门禁。所以给样本、断言命中集合 ——
 * 该抓的必须抓到（漏报 = 假绿），不该抓的必须放过（误报 = 没人看）。
 *
 * 样本直接取自真实事故形态：前两条就是踩坑 C8 发生时产物里的原文。
 * ------------------------------------------------------------------ */

const SELF_TEST_CASES = [
  {
    name: "回环地址（C8 事故原文）",
    text: 'const B0="http://127.0.0.1:8001".replace(/\\/$/,"")',
    expect: ["loopback-ip"],
  },
  {
    name: "localhost 文案（status.ts 旧形态）",
    text: "③ 前端必须用 http://localhost:5173 访问，局域网 IP 会被 CORS 白名单拒掉。",
    expect: ["loopback-host"],
  },
  {
    name: "内联 HS256 令牌",
    text:
      'const $s="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      "eyJzdWIiOiJkZXZfdXNlciIsInRlbmFudF9pZCI6InRlbmFudC1kZXYifQ." +
      '3vJ8kQmZ1pXr7tLn9wYb2cFd4gHz6aKs0eU".trim()',
    expect: ["inline-jwt"],
  },
  {
    name: "局域网地址",
    text: 'fetch("http://192.168.31.20:8000/chat/prompt")',
    expect: ["private-network"],
  },
  {
    name: "IPv6 回环",
    text: 'fetch("http://[::1]:8000/health")',
    expect: ["ipv6-loopback"],
  },
  {
    name: "W3C 命名空间 —— 必须放过",
    text: 'p.createElementNS("http://www.w3.org/2000/svg", r)',
    expect: [],
  },
  {
    name: "同源相对路径 —— 正确形态",
    text: 'fetch("/chat/prompt", { method: "POST" })',
    expect: [],
  },
  {
    name: "空值内联（修复后的产物原文）",
    text: 'const Cv="".trim(), r1=Cv.replace(/\\/$/,""), Dv=r1||"(同源)", $s="".trim()',
    expect: [],
  },
];

/** 收集一段文本会触发的 error 级规则 id。warn 不参与判定。 */
function matchErrorIds(text) {
  const ids = new Set();
  for (const rule of RULES) {
    if (rule.level !== "error") continue;
    // 用 matchAll（内部克隆正则）避免 g 标志的 lastIndex 被跨用例污染
    if ([...text.matchAll(rule.re)].length > 0) ids.add(rule.id);
  }
  return ids;
}

function runSelfTest() {
  console.log("守卫自测 —— 验证探针本身有效（不是验证产物）");
  console.log("");
  let failed = 0;
  for (const c of SELF_TEST_CASES) {
    const actual = matchErrorIds(c.text);
    const expected = new Set(c.expect);
    const missing = [...expected].filter((id) => !actual.has(id)); // 漏报
    const extra = [...actual].filter((id) => !expected.has(id)); // 误报
    if (missing.length === 0 && extra.length === 0) {
      const desc = expected.size > 0 ? `命中 ${[...actual].join(", ")}` : "放过（无 error 命中）";
      console.log(`  通过  ${c.name}  → ${desc}`);
    } else {
      failed += 1;
      console.log(`  失败  ${c.name}`);
      if (missing.length > 0) console.log(`        漏报：应命中 ${missing.join(", ")} 却没抓到`);
      if (extra.length > 0) console.log(`        误报：不该命中 ${extra.join(", ")} 却命中了`);
    }
  }
  console.log("");
  console.log("─".repeat(60));
  if (failed > 0) {
    console.log(`自测失败：${failed}/${SELF_TEST_CASES.length} 个样本不符合预期。`);
    console.log("探针不可信 —— 此时「没报警」不构成通过。退出码 1。");
    return EXIT_LEAK;
  }
  console.log(`自测通过：${SELF_TEST_CASES.length} 个样本全部符合预期。`);
  console.log("退出码 0。");
  return EXIT_OK;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) process.exit(EXIT_UNKNOWN);
  if (args.help) {
    usage();
    process.exit(EXIT_OK);
  }
  if (args.selfTest) process.exit(runSelfTest());

  const distDir = resolve(process.cwd(), args.dist);
  const envPath = resolve(process.cwd(), args.env);

  const leaks = [];   // level=error 命中
  const warns = [];   // level=warn 命中
  const blockers = []; // 前置失败：无法判定

  console.log("产物泄漏守卫 / check-build-artifacts");
  console.log(`  产物目录：${distDir}`);
  console.log(`  环境文件：${envPath}`);
  console.log("");

  /* ── 第 1 段：环境配置 ──────────────────────────────────────────── */
  console.log("[1/2] 环境配置");
  if (!existsSync(envPath)) {
    blockers.push(
      `${args.env} 不存在。它必须进仓库（.gitignore 需要 !${args.env} 例外），` +
        "否则本机 build 会被 .env.local 覆盖、把 127.0.0.1 烧进产物",
    );
    console.log("  失败：文件不存在");
  } else {
    const vars = parseEnvFile(readFileSync(envPath, "utf8"));
    for (const key of MUST_BE_EMPTY_IN_ENV) {
      if (!vars.has(key)) {
        console.log(`  跳过：${key} 未定义（真登录落地后该变量会整体删除）`);
        continue;
      }
      const value = vars.get(key);
      if (value !== "") {
        leaks.push({
          file: args.env,
          offset: 0,
          ruleId: "env-not-empty",
          level: "error",
          why: `${key} 在生产配置里必须有值留空，当前为「${value.slice(0, 40)}」`,
          snippet: `${key}=${value.slice(0, 40)}`,
        });
        console.log(`  失败：${key} 不为空`);
      } else {
        console.log(`  通过：${key} 留空`);
      }
    }
  }
  console.log("");

  /* ── 第 2 段：产物扫描 ──────────────────────────────────────────── */
  console.log("[2/2] 产物扫描");

  // 前置断言：先确认「真的扫到了东西」，否则 0 命中是假绿。
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    blockers.push(`产物目录不存在：${distDir}（先跑 npm run build）`);
  } else {
    const all = walk(distDir);
    const textFiles = all.filter((f) => TEXT_EXT.has(extname(f.path).toLowerCase()));
    const totalBytes = textFiles.reduce((n, f) => n + f.size, 0);

    const htmlCount = textFiles.filter((f) => /\.html?$/i.test(f.path)).length;
    const jsCount = textFiles.filter((f) => /\.(m?js|cjs)$/i.test(f.path)).length;

    console.log(`  扫描文件：${textFiles.length} 个文本产物，共 ${(totalBytes / 1024).toFixed(1)} KB`);
    console.log(`  结构：html ${htmlCount} 个 / js ${jsCount} 个`);

    if (textFiles.length === 0) blockers.push(`产物目录里没有可扫描的文本文件：${distDir}`);
    if (htmlCount === 0) blockers.push("产物里没有 index.html —— 构建不完整");
    if (jsCount === 0) blockers.push("产物里没有 .js —— 构建不完整");
    if (totalBytes < 20_000) {
      blockers.push(
        `文本产物合计仅 ${totalBytes} 字节，远低于正常构建体积 —— 疑似空构建，` +
          "此时「0 命中」不构成通过",
      );
    }

    for (const f of textFiles) {
      let text;
      try {
        text = readFileSync(f.path, "utf8");
      } catch {
        continue;
      }
      for (const rule of RULES) {
        let shown = 0;
        let total = 0;
        for (const m of text.matchAll(rule.re)) {
          total += 1;
          const hit = {
            file: f.path,
            offset: m.index,
            ruleId: rule.id,
            level: rule.level,
            why: rule.why,
            snippet: snippet(text, m.index),
          };
          if (rule.level === "error") leaks.push(hit);
          else warns.push(hit);
          if (shown < MAX_HITS) {
            console.log(`  [${rule.id}] ${f.path} @${m.index}`);
            console.log(`      …${hit.snippet}…`);
            shown += 1;
          }
        }
        if (total > MAX_HITS) {
          console.log(`      （该文件另有 ${total - MAX_HITS} 处 ${rule.id} 命中未展开）`);
        }
      }
    }

    if (leaks.length === 0 && warns.length === 0) {
      console.log("  通过：未发现本机地址或内联凭据");
    }
  }

  /* ── 总结 ───────────────────────────────────────────────────────── */
  console.log("");
  console.log("─".repeat(60));
  if (blockers.length > 0) {
    console.log(`结果：无法判定（${blockers.length} 项前置失败）`);
    for (const b of blockers) console.log(`  !! ${b}`);
    console.log("退出码 2 —— 前置缺失不得退化成「跳过」。");
    process.exit(EXIT_UNKNOWN);
  }
  if (leaks.length > 0) {
    console.log(`结果：失败 —— 产物含 ${leaks.length} 处禁止内容（另有 ${warns.length} 条提示）`);
    const byRule = new Map();
    for (const h of leaks) byRule.set(h.ruleId, (byRule.get(h.ruleId) ?? 0) + 1);
    for (const [id, n] of byRule) console.log(`  !! ${id} × ${n}`);
    console.log("退出码 1。");
    process.exit(EXIT_LEAK);
  }
  console.log(`结果：通过 —— 产物不含本机地址与内联凭据（${warns.length} 条提示）`);
  for (const w of warns.slice(0, 5)) console.log(`  · [${w.ruleId}] ${w.file} @${w.offset}`);
  if (warns.length > 5) console.log(`  · 另有 ${warns.length - 5} 条提示未展开`);
  console.log("退出码 0。");
  process.exit(EXIT_OK);
}

main();
