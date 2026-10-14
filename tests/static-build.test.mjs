import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { deploymentIdentity, stageStatic } from '../scripts/build-static.mjs';

const enabled = { CF_PAGES: '1', TODO_IDENTITY_ENABLED: '1', TODO_IDENTITY_ORIGIN: 'https://identity.example', TODO_IDENTITY_SITE_KEY: 'fixture-todo' };

test('public build defaults off; deployment requires an explicit choice', () => {
  assert.equal(deploymentIdentity({}).enabled, false);
  assert.throws(() => deploymentIdentity({ CF_PAGES: '1' }));
  assert.equal(deploymentIdentity({ CF_PAGES: '1', TODO_IDENTITY_ENABLED: '0' }).enabled, false);
});

test('enabled identity requires a valid origin and site key', () => {
  assert.deepEqual(deploymentIdentity(enabled), { enabled: true, origin: 'https://identity.example', siteKey: 'fixture-todo' });
  for (const origin of ['', 'http://identity.example', 'https://user:secret@identity.example', 'https://identity.example/path', 'https://identity.example/?a=1', 'https://identity.example/#x']) {
    assert.throws(() => deploymentIdentity({ ...enabled, TODO_IDENTITY_ORIGIN: origin }));
  }
  for (const siteKey of ['', '../escape', 'Bad', 'x'.repeat(65)]) assert.throws(() => deploymentIdentity({ ...enabled, TODO_IDENTITY_SITE_KEY: siteKey }));
});

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'todo-build-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'public/js'), { recursive: true });
  fs.writeFileSync(path.join(root, 'index.html'), 'fixture');
  fs.writeFileSync(path.join(root, 'public/js/site-config.js'), 'window.TODO_IDENTITY_CONFIG = { enabled: false };\n');
  fs.writeFileSync(path.join(root, 'private.env'), 'excluded');
  return root;
}

test('only artifact receives configuration; source and excluded files stay private', (t) => {
  const root = fixture(t);
  const source = fs.readFileSync(path.join(root, 'public/js/site-config.js'), 'utf8');
  const output = stageStatic(root, ['index.html', 'public/js/site-config.js', 'private.env'], enabled);
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(output, 'public/js/site-config.js'), 'utf8'), context);
  assert.equal(context.window.TODO_IDENTITY_CONFIG.origin, enabled.TODO_IDENTITY_ORIGIN);
  assert.equal(context.window.TODO_IDENTITY_CONFIG.siteKey, enabled.TODO_IDENTITY_SITE_KEY);
  assert.equal(fs.readFileSync(path.join(root, 'public/js/site-config.js'), 'utf8'), source);
  assert.equal(fs.existsSync(path.join(output, 'private.env')), false);
  assert.throws(() => stageStatic(root, ['public/js/site-config.js'], enabled), /already exists/);
});

test('invalid configuration and symlink inputs fail before output creation', (t) => {
  const root = fixture(t);
  assert.throws(() => stageStatic(root, ['public/js/site-config.js'], { CF_PAGES: '1' }));
  fs.symlinkSync(path.join(root, 'index.html'), path.join(root, 'alias.html'));
  assert.throws(() => stageStatic(root, ['public/js/site-config.js', 'alias.html'], enabled), /Unsafe/);
  assert.equal(fs.existsSync(path.join(root, '.release-output/todo-list')), false);
});

test('refuses a redirected output parent', (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'other'));
  fs.symlinkSync(path.join(root, 'other'), path.join(root, '.release-output'));
  assert.throws(() => stageStatic(root, ['public/js/site-config.js'], enabled), /Unsafe output/);
  assert.deepEqual(fs.readdirSync(path.join(root, 'other')), []);
});
