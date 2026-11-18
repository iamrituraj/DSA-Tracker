/* SystemCraft shared chrome behaviour: theme toggle, mobile nav, nav panels,
   back-to-top, scroll progress. Loaded on every page so these behaviours
   aren't reimplemented per-template. */
(function () {
    'use strict';

    /* ---- Theme ---------------------------------------------------------- */
    var themeBtn = document.getElementById('theme-btn');

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('theme', t); } catch (e) {}
        if (themeBtn) {
            // Show the theme you'd switch TO, not the one you're in.
            themeBtn.textContent = t === 'dark' ? '☀︎' : '☽';
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            // Mermaid bakes theme colours in at render time, so a page with
            // diagrams needs a reload to recolour them.
            if (document.querySelector('.mermaid')) location.reload();
        });
        var stored = 'dark';
        try { stored = localStorage.getItem('theme') || 'dark'; } catch (e) {}
        applyTheme(stored);
    }

    /* ---- Mobile nav ----------------------------------------------------- */
    var hamburger = document.getElementById('hamburger-btn');
    var navLinks = document.getElementById('nav-links');

    function closeNav() {
        if (!navLinks) return;
        navLinks.classList.remove('open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = navLinks.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeNav);
        });
        document.addEventListener('click', function (e) {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) closeNav();
        });
    }

    /* ---- Nav panels (icon-tile dropdowns) -------------------------------
       Was a single #nav-more dropdown; there are now two (Learn, Practice) and
       ids are unique, so the binder is keyed on the .nav-panel class and loops.

       Click-driven, which is also the whole keyboard story: the trigger is a
       native <button>, so Enter and Space dispatch a click and need no extra
       handler. There is no :hover open path in the CSS — on touch, hover is
       unreliable, and a hover-only menu is unreachable from the keyboard.

       Nothing is named .nav-more / .nav-more-btn any more. search-palette.js's
       initNavMore() still looks for .nav-more and binds its own click handler
       that toggles .open; when both it and this file were bound to the same
       button, each click toggled .open twice and the menu never opened. Under
       the new names that lookup returns null and it bails, leaving this as the
       only handler — and the only one that maintains aria-expanded. Do not
       reintroduce those class names on the panel markup. */
    var panels = Array.prototype.slice.call(document.querySelectorAll('.nav-panel'));

    function setPanel(panel, open) {
        panel.classList.toggle('open', open);
        var btn = panel.querySelector('.nav-panel-btn');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closePanels() {
        panels.forEach(function (p) { setPanel(p, false); });
    }

    panels.forEach(function (panel) {
        var btn = panel.querySelector('.nav-panel-btn');
        if (!btn) return;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = !panel.classList.contains('open');
            closePanels();           // only one panel open at a time
            setPanel(panel, open);
        });
    });

    if (panels.length) {
        document.addEventListener('click', function (e) {
            panels.forEach(function (p) {
                if (!p.contains(e.target)) setPanel(p, false);
            });
        });
    }

    /* Escape closes the mobile sheet and any open panel. It used to only clear
       #nav-links, so a panel opened from the keyboard had no dismiss key.
       Focus is returned to the trigger of the panel being closed — Escape on a
       tile would otherwise leave focus on an element that just became
       display:none, which drops it to the top of the document. */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        closeNav();
        panels.forEach(function (p) {
            if (!p.classList.contains('open')) return;
            setPanel(p, false);
            var btn = p.querySelector('.nav-panel-btn');
            if (btn && p.contains(document.activeElement)) btn.focus();
        });
    });

    /* ---- Scroll-driven chrome ------------------------------------------
       One listener, rAF-throttled: the old code bound three separate
       unthrottled scroll handlers that each forced layout. */
    var bar = document.getElementById('progress-bar');
    var btt = document.getElementById('back-to-top');

    if (bar || btt) {
        var queued = false;

        var onScroll = function () {
            if (queued) return;
            queued = true;
            requestAnimationFrame(function () {
                var y = window.scrollY;
                if (bar) {
                    var h = document.documentElement.scrollHeight - window.innerHeight;
                    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
                }
                if (btt) btt.classList.toggle('visible', y > 500);
                queued = false;
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    if (btt) {
        btt.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();
