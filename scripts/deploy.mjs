// 一条命令同时发布到 Cloudflare Workers（国外）和腾讯云 EdgeOne Makers（国内）。
// 用法：npm run deploy            两边都发（Cloudflare 配置见 wrangler.jsonc）
//       npm run deploy -- cf      只发 Cloudflare
//       npm run deploy -- eo      只发 EdgeOne
// 首次使用前先各登录一次：npx wrangler login；npx edgeone login --site china
// 域名备案并在 EdgeOne 绑定后，把 EO_AREA 改成 global（含中国大陆加速）。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'artifacts/site');
const PROJECT = process.env.DEPLOY_PROJECT || 'construction-robotics';
const EO_AREA = process.env.EO_AREA || 'overseas'; // 未备案：overseas（不含中国大陆）；备案后：global
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['cf', 'eo'];
const bin = (name) => path.join(ROOT, 'node_modules/.bin', name);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
const quiet = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }).trim();

const commit = quiet('git', ['rev-parse', '--short', 'HEAD']);
const message = quiet('git', ['log', '-1', '--format=%s']).slice(0, 300);
const dirty = quiet('git', ['status', '--porcelain']).length > 0;
console.log(`\n== 打包网站（提交 ${commit}${dirty ? '，有未提交改动' : ''}）`);
run('python3', ['scripts/package-site.py']);
if (!existsSync(path.join(SITE, 'index.html'))) throw new Error('打包失败：artifacts/site/index.html 不存在');

if (targets.includes('cf')) {
  // Cloudflare 已把 Pages 并入 Workers：按 wrangler.jsonc 发布 artifacts/site 静态资源
  console.log('\n== 发布到 Cloudflare Workers');
  run(bin('wrangler'), ['deploy', '--name', PROJECT, '--message', `${commit} ${message}`.slice(0, 100)]);
}

if (targets.includes('eo')) {
  console.log(`\n== 发布到 EdgeOne Makers（区域 ${EO_AREA}）`);
  run(bin('edgeone'), ['makers', 'deploy', SITE, '--name', PROJECT, '--area', EO_AREA,
    '--env', 'production', '--skip-ai-gateway-sync']);
}
console.log('\n== 完成');
