import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { safeAsset } from '../.release/guard.mjs';

export function deploymentIdentity(env = process.env) {
  const flag = env.TODO_IDENTITY_ENABLED;
  if (flag === undefined && env.CF_PAGES !== '1') return { enabled: false, origin: '', siteKey: '' };
  if (flag === '0') return { enabled: false, origin: '', siteKey: '' };
  if (flag !== '1') throw new Error('Set TODO_IDENTITY_ENABLED explicitly to 0 or 1 for deployment');
  const origin = env.TODO_IDENTITY_ORIGIN || '';
  const siteKey = env.TODO_IDENTITY_SITE_KEY || '';
  let url;
  try { url = new URL(origin); } catch { throw new Error('Invalid identity origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Identity origin must be a plain HTTPS origin');
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(siteKey)) throw new Error('Invalid identity site key');
  return { enabled: true, origin: url.origin, siteKey };
}

export function stageStatic(root, files, env = process.env) {
  const config = deploymentIdentity(env);
  const output = path.join(root, '.release-output/todo-list');
  if (fs.existsSync(output)) throw new Error('Output already exists; refuse mixed artifacts');
  try {
    const parent = fs.lstatSync(path.dirname(output));
    if (parent.isSymbolicLink() || !parent.isDirectory()) throw new Error('Unsafe output directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!files.includes('public/js/site-config.js')) throw new Error('Missing tracked identity configuration');
  // Validate all source paths before materializing any output.
  const inputs = files.filter(safeAsset).map((rel) => {
    const source = path.resolve(root, rel);
    if (!source.startsWith(root + path.sep) || fs.realpathSync(source) !== source || !fs.lstatSync(source).isFile()) {
      throw new Error('Unsafe static source');
    }
    return { rel, source };
  });
  fs.mkdirSync(output, { recursive: true });
  for (const { rel, source } of inputs) {
    const target = path.join(output, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  // Only the staged artifact receives operator configuration. Source stays off.
  fs.writeFileSync(path.join(output, 'public/js/site-config.js'),
    'window.TODO_IDENTITY_CONFIG = ' + JSON.stringify(config) + ';\n');
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = fs.realpathSync(process.cwd());
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', timeout: 10000 }).split('\0').filter(Boolean);
  stageStatic(root, files);
}
