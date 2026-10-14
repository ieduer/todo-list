# Optional identity and task synchronization

Both language pages operate locally by default. They load only the bundled
identity bridge, which sends no identity requests unless explicitly configured.
Task storage, import, export and ordinary links remain independent of this
integration. No task contents are queued for later identity synchronization.

To enable a compatible provider you operate or are authorized to use, edit
`public/js/site-config.js` before publishing:

```js
window.TODO_IDENTITY_CONFIG = {
    enabled: true,
    origin: 'https://identity.example',
    siteKey: 'your-todo-site'
};
```

The origin must be an absolute HTTPS origin without credentials, path, query
or fragment. The site key uses 1–64 lowercase letters, digits, underscores or
hyphens and starts with a letter or digit. Missing, blank or invalid settings
disable the integration. These are public settings, never passwords or tokens.

The bridge loads `/site-auth.js` from that exact origin once. A compatible
provider exposes `window.BdfzIdentity.mount` and `syncProgress`. After a successful
load, future task changes use the configured site key and the existing progress
shape. Task titles and completion state may be shared with that provider: only
enable a trusted provider and describe this behavior to your users. Loading an
external script grants that script page access; review the provider's own request
destinations and authentication policy. This project supplies no owner fallback.

Load failures do not retry or select another host. Task changes made before
readiness remain local and are not replayed later. Disabling the configuration
and reloading stops future synchronization; it does not delete local tasks or
records already held by a previously configured provider.

## Migration and release

An existing operator who wants to preserve synchronization must explicitly set
their previously approved identity origin and registered site key in the
deployment's configuration before rollout. Do not infer them from a hostname or
copy credentials into this file. Both language pages use the same configuration.
Test configured login and task changes in the authorized environment before
publishing. Unconfigured forks remain local-only.

Run `node --test tests/identity-integration.test.mjs` for mocked local regression
coverage. No service calls occur in these tests. Publishing remains subject to
the repository's existing release gate and separate approval; this candidate
changes no production setting. For rollback, preserve local task data and review
the previous script's synchronization behavior before restoring a deployment.
