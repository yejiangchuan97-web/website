import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
function collect(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    if (['.git', '.local', 'node_modules', 'previous'].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collect(path) : /\.test\.(cjs|mjs)$/.test(entry.name) ? [path] : [];
  });
}
const tests = collect(root).sort();
if (!tests.length) throw new Error('未找到模型测试');
const result = spawnSync(process.execPath, ['--test', ...tests], {cwd: root, stdio: 'inherit'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
