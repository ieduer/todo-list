import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const bridge = await readFile(new URL('../public/js/todo-identity.js', import.meta.url), 'utf8');
const defaults = await readFile(new URL('../public/js/site-config.js', import.meta.url), 'utf8');
function fixture(config, useDefaults = false) {
    const effects = { scripts: [], mounts: [], progress: [] };
    const storage = new Map();
    const context = vm.createContext({ URL, Promise, console,
        document: { head: { appendChild(script) { effects.scripts.push(script); } }, createElement() { return {}; }, documentElement: { clientWidth: 900 } },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        confirm: async () => true,
        Vue: function (options) { Object.assign(this, options.methods); Object.assign(this, options.data.call(this)); },
        fetch() { throw new Error('Unexpected network'); },
        TODO_IDENTITY_CONFIG: config,
        BdfzIdentity: { mount(value) { effects.mounts.push(value); }, syncProgress(value) { effects.progress.push(value); return Promise.resolve(); } }
    });
    context.window = context;
    if (useDefaults) vm.runInContext(defaults, context);
    vm.runInContext(bridge, context);
    return { context, effects, storage };
}

for (const page of ['index.html', 'index-zh.html']) {
    const html = await readFile(new URL('../' + page, import.meta.url), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    const valid = { enabled: true, origin: 'https://identity.example', siteKey: 'example-todo' };
    function mountPage(f) {
        vm.runInContext(inline.find(script => script.includes('var STORAGE_KEY')), f.context);
        vm.runInContext(inline.find(script => script.includes('function getTodoIdentity')), f.context);
    }
    test(page + ': bundled/default/missing/blank/invalid configuration sends no identity requests on any task path', async () => {
        const configurations = [undefined, undefined, {}, { enabled: false }, { ...valid, enabled: 'true' }, { ...valid, origin: '' },
            { ...valid, origin: 'invalid' }, { ...valid, origin: 'http://identity.example' }, { ...valid, origin: '//identity.example' },
            { ...valid, origin: 'https://user:pass@identity.example' }, { ...valid, origin: 'https://identity.example/path' },
            { ...valid, origin: 'https://identity.example/?q=1' }, { ...valid, siteKey: '' }, { ...valid, siteKey: '../bad' }];
        for (const [index, config] of configurations.entries()) {
            const f = fixture(config, index === 0); mountPage(f);
            const app = f.context.app;
            app.newTodoTitle = 'synthetic task'; app.addTodo();
            const todo = app.todos[0]; assert.equal(todo.title, 'synthetic task');
            app.markAsCompleted(todo); app.markAsUncompleted(todo);
            app.removeTodo(todo); app.restoreTodo(todo);
            app.markAllAsCompleted(); await Promise.resolve();
            app.newTodoTitle = 'keyboard task'; app.lineFeed({ keyCode: 13, ctrlKey: false });
            f.context.todoStorage.save(app.todos);
            assert.equal(JSON.parse(f.storage.get('uiineed-todos')).length, 2);
            await f.context.syncTodoProgress(todo);
            assert.equal(f.effects.scripts.length, 0); assert.equal(f.effects.mounts.length, 0); assert.equal(f.effects.progress.length, 0);
        }
        const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');
        for (const tag of [...activeHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]) assert.doesNotMatch(tag[1], /^https?:|^\/\//);
        assert.ok(html.indexOf('public/js/site-config.js') < html.indexOf('public/js/todo-identity.js'));
        assert.doesNotMatch(html, /my\.bdfz\.net|TODO_SITE_KEY/);
    });
    test(page + ': configured provider loads once and preserves the configured task synchronization', async () => {
        const f = fixture(valid); mountPage(f); f.context.mountTodoIdentity();
        assert.equal(f.effects.scripts.length, 1); assert.equal(f.effects.scripts[0].src, 'https://identity.example/site-auth.js');
        // Local edits before readiness are not retained for later transmission.
        await f.context.syncTodoProgress({ id: 0, title: 'before readiness' });
        assert.equal(f.effects.progress.length, 0);
        f.effects.scripts[0].onload();
        assert.equal(f.effects.mounts[0].siteKey, 'example-todo');
        f.context.app.newTodoTitle = 'configured task'; f.context.app.addTodo();
        const todo = f.context.app.todos[0]; f.context.app.markAsCompleted(todo); f.context.app.removeTodo(todo); f.context.app.restoreTodo(todo);
        assert.equal(f.effects.progress.length, 4);
        assert.deepEqual(f.effects.progress.map(item => item.state), ['in_progress', 'done', 'removed', 'done']);
        assert.ok(f.effects.progress.every(item => item.siteKey === 'example-todo'));
    });
}

test('provider failure cannot trigger fallback hosts, retries or pending-data replay', async () => {
    const f = fixture({ enabled: true, origin: 'https://identity.example', siteKey: 'example' });
    f.context.TodoIdentity.mount(); f.effects.scripts[0].onerror(); f.context.TodoIdentity.mount();
    await f.context.TodoIdentity.syncProgress({ itemTitle: 'fixture' });
    assert.equal(f.effects.scripts.length, 1); assert.equal(f.effects.progress.length, 0);
});
