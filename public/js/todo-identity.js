(function (window, document) {
    'use strict';
    var config = null;
    var attempted = false;
    var identity = null;
    try {
        var candidate = window.TODO_IDENTITY_CONFIG;
        if (candidate && candidate.enabled === true &&
            typeof candidate.origin === 'string' && candidate.origin.trim() &&
            typeof candidate.siteKey === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(candidate.siteKey)) {
            var url = new URL(candidate.origin);
            if (url.protocol === 'https:' && !url.username && !url.password &&
                url.pathname === '/' && !url.search && !url.hash) {
                config = { origin: url.origin, siteKey: candidate.siteKey };
            }
        }
    } catch (_) { /* Invalid configuration leaves the local app independent. */ }

    window.TodoIdentity = {
        mount: function () {
            if (!config || attempted) return;
            attempted = true;
            var script = document.createElement('script');
            script.src = config.origin + '/site-auth.js';
            script.async = true;
            script.referrerPolicy = 'no-referrer';
            script.onload = function () {
                var provider = window.BdfzIdentity;
                if (!provider || typeof provider.mount !== 'function' || typeof provider.syncProgress !== 'function') return;
                try {
                    provider.mount({ siteKey: config.siteKey });
                    identity = provider;
                } catch (_) { identity = null; }
            };
            script.onerror = function () { identity = null; };
            document.head.appendChild(script);
        },
        syncProgress: function (progress) {
            // Do not queue local task contents or replay them after a failed load.
            if (!config || !identity) return Promise.resolve(false);
            try {
                return Promise.resolve(identity.syncProgress(Object.assign({}, progress, { siteKey: config.siteKey })))
                    .catch(function () { return false; });
            } catch (_) { return Promise.resolve(false); }
        }
    };
})(window, document);
