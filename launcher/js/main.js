/*
 * VibeHome — launcher logic.
 * ES5 on purpose: 2018 Samsung sets (Tizen 4.0) run a Chromium 56-era engine.
 * When `window.tizen` is missing (desktop browser), it runs in demo mode.
 */
(function () {
    'use strict';

    var CFG = window.VIBE_CONFIG || {};
    var HAS_TIZEN = typeof window.tizen !== 'undefined';
    var SELF_ID = 'VbHackTV01.VibeHome';

    var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, BACKSPACE: 8 };

    // Brand-ish tile colors for common apps (used for tile background and shelf glow).
    var BRAND = {
        'netflix': '#e50914', 'youtube': '#ff0033', 'prime video': '#00a8e1', 'amazon': '#00a8e1',
        'disney': '#113ccf', 'hulu': '#1ce783', 'spotify': '#1db954', 'plex': '#e5a00d',
        'max': '#002be7', 'hbo': '#5822b4', 'apple tv': '#3a3a3c', 'twitch': '#9146ff',
        'peacock': '#f5a623', 'paramount': '#0064ff', 'pluto': '#fff200', 'tubi': '#fa541c',
        'tizenbrew': '#f4a51c', 'jellyfin': '#aa5cc3', 'sling': '#2a7de1', 'espn': '#d00'
    };
    var FALLBACK = ['#5e5ce6', '#0a84ff', '#30b0c7', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#64d2ff'];

    var DEMO_APPS = ['Netflix', 'YouTube', 'Prime Video', 'Disney+', 'Hulu', 'Max', 'Spotify', 'Plex',
        'Apple TV', 'Twitch', 'Peacock', 'Paramount+', 'Pluto TV', 'Tubi', 'TizenBrew', 'Jellyfin',
        'Samsung TV Plus', 'e-Manual', 'Gallery'];

    // ---------- state ----------
    var apps = [], dockApps = [], gridApps = [];
    var zone = 'dock';
    var idx = { dock: 0, grid: 0, pills: 0, menu: 0 };
    var cols = CFG.columns || 6;
    var gridRowH = 0, gridScrollRow = 0, visibleRows = 3;
    var menuItems = [];
    var toastTimer = null;

    var $ = function (id) { return document.getElementById(id); };
    var stage = $('stage'), dockEl = $('dock'), gridEl = $('grid'), hl = $('highlight');

    // ---------- helpers ----------
    function lower(s) { return String(s || '').toLowerCase(); }

    function colorFor(name) {
        var n = lower(name), k;
        for (k in BRAND) { if (BRAND.hasOwnProperty(k) && n.indexOf(k) !== -1) { return BRAND[k]; } }
        var h = 0, i;
        for (i = 0; i < n.length; i++) { h = (h * 31 + n.charCodeAt(i)) | 0; }
        return FALLBACK[Math.abs(h) % FALLBACK.length];
    }

    function hexToRgb(hex) {
        var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
        if (!m) { return [94, 92, 230]; }
        var s = m[1];
        if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
        return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
    }

    function tileBackground(hex) {
        var c = hexToRgb(hex);
        var a = 'rgb(' + Math.round(c[0] * 0.55) + ',' + Math.round(c[1] * 0.55) + ',' + Math.round(c[2] * 0.55) + ')';
        var b = 'rgb(' + Math.round(c[0] * 0.22) + ',' + Math.round(c[1] * 0.22) + ',' + Math.round(c[2] * 0.22) + ')';
        return 'linear-gradient(145deg,' + a + ' 0%,' + b + ' 100%)';
    }

    function matches(name, list) {
        var n = lower(name), i;
        for (i = 0; i < (list || []).length; i++) { if (n.indexOf(lower(list[i])) !== -1) { return true; } }
        return false;
    }

    function toast(msg) {
        var t = $('toast');
        t.textContent = msg;
        t.className = '';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.className = 'hidden'; }, 2600);
    }

    // ---------- apps ----------
    function loadApps(done) {
        if (!HAS_TIZEN || !tizen.application || !tizen.application.getAppsInfo) {
            done(DEMO_APPS.map(function (n) { return { id: 'demo.' + n, name: n, icon: '' }; }));
            return;
        }
        try {
            tizen.application.getAppsInfo(function (list) {
                var out = [];
                list.forEach(function (a) {
                    if (!a || !a.name || a.id === SELF_ID || a.show === false) { return; }
                    var icon = a.iconPath || '';
                    if (icon && icon.charAt(0) === '/') { icon = 'file://' + icon; }
                    out.push({ id: a.id, name: a.name, icon: icon });
                });
                done(out);
            }, function (e) {
                toast('Could not list apps: ' + (e && e.message));
                done([]);
            });
        } catch (e) {
            toast('App list unavailable: ' + e.message);
            done([]);
        }
    }

    function organize(list) {
        var seen = {};
        apps = list.filter(function (a) {
            if (seen[a.name]) { return false; }
            seen[a.name] = true;
            return true;
        }).sort(function (a, b) { return lower(a.name) < lower(b.name) ? -1 : 1; });
        apps.forEach(function (a) { a.color = colorFor(a.name); });

        dockApps = [];
        (CFG.dock || []).slice(0, 6).forEach(function (want) {
            for (var i = 0; i < apps.length; i++) {
                if (lower(apps[i].name).indexOf(lower(want)) !== -1 && dockApps.indexOf(apps[i]) === -1) {
                    dockApps.push(apps[i]);
                    return;
                }
            }
        });
        if (!dockApps.length) { dockApps = apps.slice(0, 4); }

        gridApps = apps.filter(function (a) { return !matches(a.name, CFG.hidden); });
    }

    // ---------- rendering ----------
    function makeTile(app, cls, w, h, delay) {
        var el = document.createElement('div');
        el.className = 'tile ' + cls + ' enter';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.animationDelay = delay + 'ms';
        el.style.webkitAnimationDelay = delay + 'ms';

        var art = document.createElement('div');
        art.className = 'art';
        art.style.background = tileBackground(app.color);

        // Shown when the TV gives no usable icon: the app's name as a wordmark.
        var letter = document.createElement('div');
        letter.className = 'letter';
        letter.textContent = app.name;

        if (app.icon) {
            var img = document.createElement('img');
            img.onerror = function () { art.removeChild(img); art.appendChild(letter); };
            img.onload = function () { sampleColor(img, app, art); };
            img.src = app.icon;
            art.appendChild(img);
        } else {
            art.appendChild(letter);
        }

        var name = document.createElement('div');
        name.className = 'name';
        name.textContent = app.name;

        el.appendChild(art);
        el.appendChild(name);
        return el;
    }

    // Average the icon's opaque pixels for the glow. Silently skipped if the canvas is tainted.
    function sampleColor(img, app, art) {
        if (matches(app.name, Object.keys(BRAND))) { return; }
        try {
            var c = document.createElement('canvas');
            c.width = 24; c.height = 24;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 24, 24);
            var d = ctx.getImageData(0, 0, 24, 24).data, r = 0, g = 0, b = 0, n = 0, i;
            for (i = 0; i < d.length; i += 4) {
                if (d[i + 3] > 200 && (d[i] + d[i + 1] + d[i + 2]) > 60 && (d[i] + d[i + 1] + d[i + 2]) < 700) {
                    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
                }
            }
            if (n > 20) {
                app.color = '#' + [r / n, g / n, b / n].map(function (v) {
                    var s = Math.round(v).toString(16);
                    return s.length === 1 ? '0' + s : s;
                }).join('');
                art.style.background = tileBackground(app.color);
                if (zone === 'dock' && dockApps[idx.dock] === app) { updateShelf(true); }
            }
        } catch (e) { /* cross-origin icon: keep the name-based color */ }
    }

    function render() {
        dockEl.innerHTML = '';
        gridEl.innerHTML = '';

        var dockInner = 1920 - 144 - 80;
        var n = dockApps.length || 1;
        var dw = Math.min(370, Math.floor((dockInner - (n - 1) * 36) / n));
        var dh = Math.round(dw * 9 / 16);
        dockApps.forEach(function (a, i) { dockEl.appendChild(makeTile(a, 'dock-tile', dw, dh, 280 + i * 60)); });

        var gridInner = 1920 - 224;
        var gw = Math.floor((gridInner - (cols - 1) * 24) / cols);
        var gh = Math.round(gw * 9 / 16);
        gridRowH = gh + 78;
        visibleRows = Math.max(1, Math.floor(720 / gridRowH));
        gridApps.forEach(function (a, i) {
            var t = makeTile(a, 'grid-tile', gw, gh, Math.min(i, 18) * 25);
            if (i % cols === cols - 1) { t.style.marginRight = '0'; }
            gridEl.appendChild(t);
        });

        idx.dock = Math.min(idx.dock, dockApps.length - 1);
        idx.grid = Math.min(idx.grid, Math.max(0, gridApps.length - 1));
    }

    // ---------- focus ----------
    function els(z) {
        if (z === 'dock') { return dockEl.children; }
        if (z === 'grid') { return gridEl.children; }
        if (z === 'pills') { return $('pills').children; }
        if (z === 'menu') { return $('inputs-menu').children; }
        return [];
    }

    function clearFocus() {
        var all = document.querySelectorAll('.focused'), i;
        for (i = 0; i < all.length; i++) { all[i].classList.remove('focused'); }
    }

    function focus() {
        clearFocus();
        var list = els(zone);
        if (!list.length) { return; }
        var el = list[idx[zone]];
        if (!el) { return; }
        el.classList.add('focused');

        if (zone === 'grid') { scrollGrid(); }
        if (zone === 'dock' || zone === 'grid') {
            placeHighlight(el);
            hl.className = 'on';
        } else {
            hl.className = 'on pill-mode';
        }
        if (zone === 'dock') { updateShelf(false); }
    }

    function placeHighlight(el) {
        var s = 1.09;
        var w = el.offsetWidth, h = el.offsetHeight;
        // Sum offsets up to #lower (the highlight's parent). Transformed ancestors like #grid
        // become offsetParents, and their translate is added back below.
        var x = 0, y = 0, node = el, root = $('lower');
        while (node && node !== root) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
        if (zone === 'grid') { y -= gridScrollRow * gridRowH; }
        var w2 = w * s, h2 = h * s;
        x -= (w2 - w) / 2;
        y -= (h2 - h) / 2 + 8;
        hl.style.width = w2 + 'px';
        hl.style.height = h2 + 'px';
        hl.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        hl.style.webkitTransform = hl.style.transform;
    }

    function scrollGrid() {
        var row = Math.floor(idx.grid / cols);
        if (row >= gridScrollRow + visibleRows) { gridScrollRow = row - visibleRows + 1; }
        if (row < gridScrollRow) { gridScrollRow = row; }
        gridEl.style.transform = 'translateY(' + (-gridScrollRow * gridRowH) + 'px)';
        gridEl.style.webkitTransform = gridEl.style.transform;
    }

    var shelfApp = null;
    function updateShelf(force) {
        var app = dockApps[idx.dock];
        if (!app || (app === shelfApp && !force)) { return; }
        shelfApp = app;
        var title = $('shelf-title'), glow = $('shelf-glow');
        var c = hexToRgb(app.color);
        glow.style.background = 'radial-gradient(ellipse at center, rgba(' + c.join(',') + ',0.34) 0%, rgba(' + c.join(',') + ',0) 65%)';
        title.classList.add('swap');
        setTimeout(function () {
            title.textContent = app.name;
            title.classList.remove('swap');
        }, 140);
    }

    // ---------- mascots ----------
    function renderMascots() {
        var box = $('mascots');
        box.innerHTML = '';
        (CFG.mascots || []).forEach(function (src) {
            var img = document.createElement('img');
            img.onerror = function () { if (img.parentNode) { box.removeChild(img); } };
            img.src = src;
            box.appendChild(img);
        });
    }

    var hopTimer = null;
    function hopMascots() {
        var imgs = $('mascots').children, i;
        for (i = 0; i < imgs.length; i++) {
            (function (img, delay) {
                img.classList.remove('hop');
                void img.offsetWidth;                       // restart the animation
                setTimeout(function () { img.classList.add('hop'); }, delay);
            }(imgs[i], i * 90));
        }
        clearTimeout(hopTimer);
        hopTimer = setTimeout(function () {
            for (var j = 0; j < imgs.length; j++) { imgs[j].classList.remove('hop'); }
        }, 800);
    }

    // ---------- grid open/close ----------
    function openGrid() {
        if (!gridApps.length) { toast('No other apps found'); return; }
        stage.classList.add('grid-open');
        zone = 'grid';
        idx.grid = Math.min(idx.dock, gridApps.length - 1);
        gridScrollRow = 0;
        focus();
    }

    function closeGrid() {
        stage.classList.remove('grid-open');
        zone = 'dock';
        focus();
    }

    // ---------- actions ----------
    function launch(app) {
        if (!app) { return; }
        if (!HAS_TIZEN) { toast('Demo: would launch ' + app.name); return; }
        try {
            tizen.application.launch(app.id, null, function (e) { toast('Could not open ' + app.name + ': ' + e.message); });
        } catch (e) {
            toast('Could not open ' + app.name);
        }
    }

    function hideSelf() {
        if (!HAS_TIZEN) { toast('Demo: would close the launcher'); return; }
        try { tizen.application.getCurrentApplication().hide(); }
        catch (e) { try { tizen.application.getCurrentApplication().exit(); } catch (e2) { /* nothing */ } }
    }

    function buildInputs(done) {
        var fallback = (CFG.inputs || []).map(function (s) { return { label: s.label, src: { type: s.type, number: s.number }, connected: null }; });
        if (!HAS_TIZEN || !tizen.systeminfo) { done(fallback); return; }
        try {
            tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
                var out = [];
                // Keep the user's labels/order, but use the TV's real source objects and connection state.
                fallback.forEach(function (f) {
                    var found = null, connected = null;
                    (vs.connected || []).forEach(function (s) { if (s.type === f.src.type && s.number === f.src.number) { found = s; connected = true; } });
                    (vs.disconnected || []).forEach(function (s) { if (s.type === f.src.type && s.number === f.src.number) { found = s; connected = false; } });
                    if (found || f.src.type === 'TV') { out.push({ label: f.label, src: found || f.src, connected: connected }); }
                });
                done(out.length ? out : fallback);
            }, function () { done(fallback); });
        } catch (e) { done(fallback); }
    }

    function openInputs() {
        buildInputs(function (list) {
            menuItems = list;
            var menu = $('inputs-menu');
            menu.innerHTML = '';
            list.forEach(function (it) {
                var d = document.createElement('div');
                d.className = 'menu-item';
                d.textContent = it.label + (it.connected === true ? '  •' : '');
                menu.appendChild(d);
            });
            menu.className = 'menu';
            zone = 'menu';
            idx.menu = 0;
            focus();
        });
    }

    function closeMenu() {
        $('inputs-menu').className = 'menu hidden';
        zone = 'pills';
        focus();
    }

    function switchInput(item) {
        if (!HAS_TIZEN || !tizen.tvwindow) {
            toast(HAS_TIZEN ? 'Press SOURCE on your remote for ' + item.label : 'Demo: would switch to ' + item.label);
            return;
        }
        try {
            tizen.tvwindow.setSource(item.src, function () { hideSelf(); },
                function () { toast('Press SOURCE on your remote for ' + item.label); }, 'MAIN');
        } catch (e) {
            toast('Press SOURCE on your remote for ' + item.label);
        }
    }

    function showNetwork() { toast($('wifi-label').textContent === 'Offline' ? 'Not connected' : 'Connected: ' + $('wifi-label').textContent); }

    function refreshNetwork() {
        var pill = $('pill-wifi'), label = $('wifi-label');
        function set(name, online) {
            label.textContent = name;
            pill.className = pill.className.replace(/\s*(online|offline)/g, '') + (online ? ' online' : ' offline');
        }
        set(navigator.onLine === false ? 'Offline' : 'Online', navigator.onLine !== false);
        if (!HAS_TIZEN || !tizen.systeminfo) { return; }
        try {
            tizen.systeminfo.getPropertyValue('WIFI_NETWORK', function (w) {
                if (w && w.status === 'ON' && w.ssid) { set(w.ssid, true); }
            }, function () {});
            tizen.systeminfo.getPropertyValue('ETHERNET_NETWORK', function (e) {
                if (e && e.cable === 'ATTACHED' && e.status === 'ON') { set('Ethernet', true); }
            }, function () {});
        } catch (e) { /* keep navigator.onLine status */ }
    }

    // ---------- clock ----------
    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    function tick() {
        var d = new Date(), h = d.getHours(), m = d.getMinutes();
        var hh = CFG.use24h ? (h < 10 ? '0' + h : '' + h) : '' + ((h % 12) || 12);
        $('clock').textContent = hh + ':' + (m < 10 ? '0' + m : m);
        $('date').textContent = DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
        var g = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
        $('greeting').textContent = g + (CFG.name ? ', ' + CFG.name : '');
    }

    // ---------- input ----------
    function onKey(e) {
        var k = e.keyCode, list = els(zone), n = list.length;
        var isBack = k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE;
        if ([KEY.LEFT, KEY.UP, KEY.RIGHT, KEY.DOWN, KEY.ENTER].indexOf(k) !== -1 || isBack) { e.preventDefault(); }

        if (zone === 'dock') {
            if (k === KEY.LEFT && idx.dock > 0) { idx.dock--; focus(); hopMascots(); }
            else if (k === KEY.RIGHT && idx.dock < n - 1) { idx.dock++; focus(); hopMascots(); }
            else if (k === KEY.UP) { zone = 'pills'; focus(); }
            else if (k === KEY.DOWN) { openGrid(); }
            else if (k === KEY.ENTER) { launch(dockApps[idx.dock]); }
        } else if (zone === 'grid') {
            var col = idx.grid % cols;
            if (k === KEY.LEFT && col > 0) { idx.grid--; focus(); }
            else if (k === KEY.RIGHT && col < cols - 1 && idx.grid < n - 1) { idx.grid++; focus(); }
            else if (k === KEY.UP) {
                if (idx.grid < cols) { closeGrid(); } else { idx.grid -= cols; focus(); }
            } else if (k === KEY.DOWN) {
                var rowStart = idx.grid - col + cols;
                if (rowStart < n) { idx.grid = Math.min(idx.grid + cols, n - 1); focus(); }
            }
            else if (k === KEY.ENTER) { launch(gridApps[idx.grid]); }
            else if (isBack) { closeGrid(); }
        } else if (zone === 'pills') {
            if (k === KEY.LEFT && idx.pills > 0) { idx.pills--; focus(); }
            else if (k === KEY.RIGHT && idx.pills < n - 1) { idx.pills++; focus(); }
            else if (k === KEY.DOWN || isBack) { zone = 'dock'; focus(); }
            else if (k === KEY.ENTER) {
                if (idx.pills === 0) { openInputs(); }
                else if (idx.pills === 1) { showNetwork(); }
                else { hideSelf(); }
            }
        } else if (zone === 'menu') {
            if (k === KEY.UP && idx.menu > 0) { idx.menu--; focus(); }
            else if (k === KEY.DOWN && idx.menu < n - 1) { idx.menu++; focus(); }
            else if (k === KEY.ENTER) { var it = menuItems[idx.menu]; closeMenu(); switchInput(it); }
            else if (isBack || k === KEY.LEFT) { closeMenu(); }
        }
    }

    function registerKeys() {
        if (!HAS_TIZEN || !tizen.tvinputdevice) { return; }
        try { tizen.tvinputdevice.registerKey('Exit'); } catch (e) { /* optional */ }
    }

    // ---------- boot ----------
    function reload() {
        loadApps(function (list) {
            organize(list);
            render();
            focus();
        });
    }

    function boot() {
        registerKeys();
        tick();
        setInterval(tick, 10000);
        refreshNetwork();
        window.addEventListener('online', refreshNetwork);
        window.addEventListener('offline', refreshNetwork);
        document.addEventListener('keydown', onKey);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { tick(); refreshNetwork(); reload(); }
        });

        renderMascots();
        reload();
        // Staggered entrance for the clock and shelf.
        setTimeout(function () {
            stage.classList.remove('booting');
            $('top').classList.add('enter');
            $('shelf').classList.add('enter');
            $('shelf').style.animationDelay = '120ms';
        }, 30);
    }

    boot();
}());
