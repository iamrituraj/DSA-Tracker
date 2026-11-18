/* One markdown renderer for every AI surface on the site.
 *
 * Before this file there were five hand-rolled renderers — ai-chat.html,
 * lc-judge.js, draw-review.js, simulator/app.js and aicode-core.js — each
 * supporting a different subset of markdown. They drifted, and every gap showed
 * up as raw punctuation in a model answer: ai-chat had deleted its italic rule
 * so "*Why it matters*" printed its asterisks, lc-judge had no bullet rule,
 * simulator had no headings, aicode-core had neither, and not one of the five
 * handled links. Fixing them one at a time is how they drifted apart in the
 * first place, so they now all call render() here.
 *
 * ── Pipeline (the order is load-bearing) ──
 *   1. normalise odd unicode, then escape HTML
 *   2. park fenced blocks and inline code
 *   3. bold
 *   4. park links
 *   5. emphasis
 *   6. block structure: headings, tables, bullets, numbered lists
 *   7. line breaks, then collapse breaks around block elements
 *   8. restore everything parked
 *
 * Three invariants hold this together. Break one and the bugs come back:
 *
 * ESCAPE FIRST. Step 1 runs before any transform, never after. Escaping
 * afterwards would eat the tags the transforms just produced; not escaping put
 * `<img src=x onerror=...>` from a model response straight into innerHTML.
 *
 * PARK, DON'T TRUST. Code spans, fenced blocks and links are swapped for
 * placeholders so no later rule can reach inside them. That is what keeps
 * `*args`, `__init__`, and underscores in a URL intact.
 *
 * EMPHASIS NEEDS ITS GUARDS. A single asterisk means italic in one place and a
 * bullet marker in another. The guards on ITALIC_STAR below are what tell them
 * apart; ai-chat.html deleted its italic rule outright rather than write them,
 * which is the bug that started all this.
 */
(function () {
  'use strict';

  // Several pages reach this file by more than one route — a page's own script
  // tag plus the one in the ai-chat include, say — and the include graph varies
  // per layout. Bailing out on a second execution means every consumer can ask
  // for the module explicitly without anyone having to trace which page
  // already loaded it.
  if (window.SCMarkdown) return;

  /* ─── Characters models emit that break rendering or just look wrong ─── */

  // Zero-width characters sit invisibly between a delimiter and its text
  // ("*<U+200B>Why*") and silently defeat every rule below.
  var ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
  // Non-breaking (U+2011), figure and en dashes turn up mid-word in model
  // output ("fault<U+2011>tolerant"). Folding them to ASCII renders at a normal
  // width and keeps code copy-pasteable. The em dash (U+2014) is left alone:
  // it is ordinary prose punctuation, not a glitch.
  var ODD_DASHES = /[\u2010\u2011\u2012\u2013]/g;

  function normalizeChars(s) {
    return String(s == null ? '' : s).replace(ZERO_WIDTH, '').replace(ODD_DASHES, '-');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ─── Link safety ───
   * A URL is about to be interpolated into an href, so the scheme is
   * allowlisted and quote characters are refused. Anything failing either check
   * stays literal text instead of becoming a link, which is why a javascript:
   * or data: URL in a model answer can never produce an anchor.
   */
  var SAFE_SCHEME = /^(https?:\/\/|\/|#|mailto:)/i;
  var UNSAFE_CHARS = /["'<>\\`]/;

  function isSafeUrl(url) {
    return SAFE_SCHEME.test(url) && !UNSAFE_CHARS.test(url);
  }

  /* ─── Emphasis ───
   * Three guards make single-asterisk emphasis safe:
   *   [^\s*]  the opening delimiter must hug a non-space. This is the one that
   *           separates emphasis from a bullet marker: "* item" has a space
   *           after the star, "*italic*" does not.
   *   [^*\n]  emphasis cannot cross a newline, so an unclosed delimiter can
   *           never italicise the rest of the answer.
   *   (?!\*)  a ** pair is never read as two single delimiters.
   * The leading (^|[^*\w]) keeps snake_case and __dunder__ names intact.
   */
  var ITALIC_STAR = /(^|[^*\w])\*([^\s*][^*\n]*?)\*(?!\*)/gm;
  var ITALIC_UNDERSCORE = /(^|[^_\w])_([^\s_][^_\n]*?)_(?![_\w])/gm;

  var TOKEN_RE = /\u0000MD(\d+)\u0000/g;

  // Kinds whose markup is a block element with its own vertical margin, so the
  // line break that produced them in the source must not also render.
  function isBlockKind(k) { return k === 'heading' || k === 'fence' || k === 'block'; }

  function defaultOpts(o) {
    o = o || {};
    return {
      // Markup hooks. Each surface has its own CSS, so the caller supplies the
      // wrapper and this file supplies the parsing.
      bullet: o.bullet || function (c) { return '<span class="sc-li">' + c + '</span>'; },
      ordered: o.ordered || function (n, c) { return '<span class="sc-li"><strong>' + n + '.</strong> ' + c + '</span>'; },
      heading: o.heading || function (lvl, c) { return '<strong class="sc-h">' + c + '</strong>'; },
      code: o.code || function (c) { return '<code>' + c + '</code>'; },
      pre: o.pre || function (c) { return '<pre>' + c + '</pre>'; },
      // Receives (headerCells, rowsOfCells) and returns markup, so parsing
      // stays here and theming stays with the surface.
      table: o.table || function (head, rows) {
        var html = '<div class="sc-table"><div class="sc-tr sc-th">';
        head.forEach(function (c) { html += '<span>' + c + '</span>'; });
        html += '</div>';
        rows.forEach(function (cells) {
          html += '<div class="sc-tr">';
          cells.forEach(function (c) { html += '<span>' + c + '</span>'; });
          html += '</div>';
        });
        return html + '</div>';
      },
      // Optional features, off unless the surface asks for them.
      mermaid: o.mermaid || null,
      tables: !!o.tables,
      // Markup for a blank line. Surfaces wanting a visible gap pass it here;
      // the rest collapse a blank line to a single <br>.
      paragraphGap: o.paragraphGap || null,
      // false for surfaces rendering one inline string with no block structure.
      blocks: o.blocks !== false,
      links: o.links !== false,
    };
  }

  /**
   * Render the subset of markdown the AI surfaces actually emit.
   * Returns HTML safe to assign to innerHTML.
   */
  function render(src, opts) {
    var o = defaultOpts(opts);
    // Parked fragments, plus a parallel list of what kind each one is. The kind
    // is what lets step 7 collapse stray breaks around block elements without
    // knowing anything about the surface's markup.
    var parked = [];
    var kinds = [];

    function park(html, kind) {
      parked.push(html);
      kinds.push(kind || 'inline');
      return '\u0000MD' + (parked.length - 1) + '\u0000';
    }
    function kindOf(i) { return kinds[Number(i)] || 'inline'; }

    /* 1. normalise, escape */
    var s = escapeHtml(normalizeChars(src));

    /* 2. park fenced blocks, then inline code */
    if (o.mermaid) {
      s = s.replace(/```mermaid\n?([\s\S]*?)```/g, function (_, code) {
        return park(o.mermaid(code.trim()), 'fence');
      });
    }
    s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, function (_, lang, code) {
      return park(o.pre(code.replace(/\n+$/, ''), lang), 'fence');
    });
    // Parking inline code is what keeps `*args`, `__init__` and two `*ptr`
    // spans on one line from being chewed up by the emphasis rules.
    s = s.replace(/`([^`\n]+)`/g, function (_, code) {
      return park(o.code(code), 'inline');
    });

    /* 3. bold, before links so link text can contain bold */
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

    /* 4. park links — an href routinely contains underscores, and
          target="_blank" is itself underscore-delimited, so an exposed anchor
          would be corrupted by the emphasis rules in step 5 */
    if (o.links) {
      s = s.replace(/\[([^\]\n]*)\]\(([^)\s]+)\)/g, function (whole, text, url) {
        if (!isSafeUrl(url)) return whole;
        return park('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
          (text || url) + '</a>', 'inline');
      });
      // Bare URLs, which models emit more often than bracketed links. Trailing
      // sentence punctuation is deliberately left outside the link.
      s = s.replace(/(^|[\s(])(https?:\/\/[^\s<>"']+?)(?=[.,;:!?)]*(?:\s|$))/gm,
        function (whole, lead, url) {
          if (!isSafeUrl(url)) return whole;
          return lead + park('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
            url + '</a>', 'inline');
        });
    }

    /* 5. emphasis — see ITALIC_STAR above for why this is safe next to bullets */
    s = s.replace(ITALIC_STAR, '$1<em>$2</em>');
    s = s.replace(ITALIC_UNDERSCORE, '$1<em>$2</em>');

    /* 6. block structure, wrapping text whose inline formatting is now done */
    if (o.blocks) {
      s = s.replace(/^(#{1,6})[ \t]+(.+)$/gm, function (_, hashes, text) {
        return park(o.heading(hashes.length, text), 'heading');
      });

      if (o.tables) {
        s = s.replace(/^\|(.+)\|[ \t]*\n\|[-:| \t]+\|[ \t]*\n((?:\|.*\|[ \t]*\n?)*)/gm,
          function (_, header, rows) {
            var cells = function (row) {
              var parts = row.split('|');
              // Outer pipes leave empty leading and trailing segments; drop
              // those but keep genuinely empty interior cells.
              if (parts.length && parts[0].trim() === '') parts.shift();
              if (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
              return parts.map(function (c) { return c.trim(); });
            };
            var body = rows.replace(/\n$/, '').split('\n')
              .filter(function (row) { return row.trim(); })
              .map(cells);
            return park(o.table(cells(header), body), 'block');
          });
      }

      s = s.replace(/^[ \t]*[*\-+][ \t]+(.+)$/gm, function (_, c) {
        return park(o.bullet(c), 'li');
      });
      s = s.replace(/^[ \t]*(\d+)[.)][ \t]+(.+)$/gm, function (_, n, c) {
        return park(o.ordered(n, c), 'li');
      });
    }

    /* 7. line breaks, then tidy the seams around block elements */
    s = s.replace(/\n{3,}/g, '\n\n');
    if (o.paragraphGap) s = s.replace(/\n\n/g, o.paragraphGap);
    s = s.replace(/\n/g, '<br>');

    var gap = o.paragraphGap ? o.paragraphGap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    var BREAK = '(?:<br>' + (gap ? '|' + gap : '') + ')+';
    var TOK = '\\u0000MD(\\d+)\\u0000';

    // Consecutive list items each render as their own block, so a break
    // between them just inserts a blank line.
    s = s.replace(new RegExp(TOK + BREAK + '(?=' + TOK + ')', 'g'), function (whole, a, b) {
      return (kindOf(a) === 'li' && kindOf(b) === 'li') ? '\u0000MD' + a + '\u0000' : whole;
    });
    // Headings, fenced blocks and tables all render as block elements carrying
    // their own margins, so a <br> on either side of one adds a second blank
    // line on top of that margin. Headings were the only kind checked here,
    // which is why a fenced code block always sat in a visibly oversized gap —
    // most noticeable in a discussion post, where a block is usually bracketed
    // by prose on both sides.
    s = s.replace(new RegExp(TOK + BREAK, 'g'), function (whole, a) {
      return isBlockKind(kindOf(a)) ? '\u0000MD' + a + '\u0000' : whole;
    });
    s = s.replace(new RegExp(BREAK + '(?=' + TOK + ')', 'g'), function (whole, a) {
      return isBlockKind(kindOf(a)) ? '' : whole;
    });

    /* 8. restore, repeatedly — a parked block routinely contains parked inline
          fragments (a bullet holding a link, a table cell holding code), and a
          single pass would leave those inner placeholders visible in the
          output. Nesting is shallow, so a small bounded loop covers it. */
    for (var depth = 0; depth < 5 && s.indexOf('\u0000MD') !== -1; depth++) {
      s = s.replace(TOKEN_RE, function (_, i) { return parked[Number(i)]; });
    }
    return s;
  }

  /**
   * Inline-only render: bold, italic, code and links, no block structure.
   * For single-line surfaces such as a hint or a one-line verdict.
   */
  function renderInline(src, opts) {
    var o = {};
    var given = opts || {};
    for (var k in given) if (Object.prototype.hasOwnProperty.call(given, k)) o[k] = given[k];
    o.blocks = false;
    return render(src, o);
  }

  /**
   * Strip markdown to bare prose. For text-to-speech, and anywhere a model
   * answer goes into textContent rather than innerHTML.
   */
  function toPlainText(src) {
    return normalizeChars(src)
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(ITALIC_STAR, '$1$2')
      .replace(ITALIC_UNDERSCORE, '$1$2')
      .replace(/^#{1,6}[ \t]*/gm, '')
      .replace(/^[ \t]*[*\-+][ \t]+/gm, '')
      .replace(/\|/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  window.SCMarkdown = {
    render: render,
    renderInline: renderInline,
    toPlainText: toPlainText,
    escapeHtml: escapeHtml,
    normalizeChars: normalizeChars,
    isSafeUrl: isSafeUrl,
  };
})();
