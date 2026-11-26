/* ==========================================================================
   Chongjian GE — site behaviour
   Renders the lists from assets/js/data.js and wires up the small interactions:
   mobile nav, figure/abstract lightbox, expanders, contents rail, lazy videos, email links.
   Pages one folder down set <html data-base="../"> so asset paths resolve.
   ========================================================================== */
(() => {
  'use strict';

  const SITE = window.SITE || { publications: [], news: [] };
  const BASE = document.documentElement.dataset.base || '';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isExternal = (href) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href);
  const url = (href) => (isExternal(href) || /^(mailto:|#)/.test(href) ? href : BASE + href);
  const linkAttrs = (href) => `href="${esc(url(href))}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}`;
  const pubs = SITE.publications;
  const byId = Object.fromEntries(pubs.map((p) => [p.id, p]));
  const people = SITE.people || {};

  const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1L5.92 2.7A.6.6 0 0 0 5 3.2z" fill="currentColor"/></svg>';

  /* ---------- Templates ---------- */
  const MARKS = /[*#+†‡§∗]+$/;
  const star = (s) => s.replace(/\*/g, '∗');

  // Long author lists (more than 8) show the first five, or up to "Chongjian Ge" if that is
  // further in, followed by a "+N more" button that reveals the rest. `full` skips the cut.
  function authorsHTML(str, full) {
    let me = -1;
    const parts = str.split(/\s*,\s*/).map((a, i) => {
      const m = a.match(MARKS);
      const name = m ? a.slice(0, m.index) : a;
      const isMe = /^chongjian ge$/i.test(name.trim());
      if (isMe && me < 0) me = i;
      const page = people[name.trim()];   // the co-author's own page, when data.js lists one
      const label = isMe ? `<span class="me">${esc(name)}</span>`
        : page ? `<a class="person" ${linkAttrs(page)}>${esc(name)}</a>` : esc(name);
      return label + (m ? `<sup>${esc(star(m[0]))}</sup>` : '');
    });
    const keep = Math.max(5, me + 1);
    if (full || parts.length <= 8 || parts.length - keep < 3) return parts.join(', ');
    return `${parts.slice(0, keep).join(', ')}<span hidden>, ${parts.slice(keep).join(', ')}</span>`
      + ` <button type="button" class="more-btn" data-more aria-label="Show ${parts.length - keep} more authors">+${parts.length - keep} more</button>`;
  }

  const metaHTML = (p) =>
    `<div class="meta"><span>${esc(p.venue)}</span>${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</div>`;

  const noteHTML = (p) => (p.note ? `<p class="note">${esc(star(p.note))}</p>` : '');

  // A paper may have no links yet (in review): its title is then plain text.
  const linksOf = (p) => p.links || [];
  const titleLink = (p) => (linksOf(p).length ? `<a ${linkAttrs(linksOf(p)[0][1])}>${esc(p.title)}</a>` : esc(p.title));

  // A paper without a figure gets a tinted tile carrying its short name.
  function mediaHTML(p) {
    const open = `data-open="${esc(p.id)}" aria-label="${esc(`Open details: ${p.short || p.title}`)}"`;
    if (!p.thumb && !p.video) {
      return `<button type="button" class="media placeholder" ${open}><span>${esc(p.short || p.title)}</span></button>`;
    }
    const cls = `media${p.fit === 'contain' ? ' contain' : ''}`;
    const inner = p.video
      ? `<video muted loop playsinline preload="none" poster="${esc(url(p.thumb))}" data-autoplay><source src="${esc(url(p.video))}" type="video/mp4"></video>`
      : `<img src="${esc(url(p.thumb))}" alt="" loading="lazy" decoding="async">`;
    return `<button type="button" class="${cls}" ${open}>${inner}</button>`;
  }

  // Links as pill chips ("Project" is the filled one), then an Abstract chip that opens the abstract below.
  function linksHTML(p, withAbstract) {
    const chips = linksOf(p).map(([label, href]) =>
      `<a class="chip-link${label === 'Project' ? ' primary' : ''}" ${linkAttrs(href)}>${esc(label)}</a>`);
    if (withAbstract && p.abstract) {
      chips.push(`<button type="button" class="chip-link" data-abs="${esc(p.id)}" aria-expanded="false" aria-controls="abs-${esc(p.id)}">Abstract</button>`);
    }
    return chips.length ? `<div class="links">${chips.join('')}</div>` : '';
  }

  const venueHTML = (p) =>
    `<p class="pub-venue">${esc(p.venue)}${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</p>`;

  // One publication entry: figure on the left; title, authors, venue and links on the right.
  const rowHTML = (p) => `<article class="pub" id="pub-${esc(p.id)}">
      ${mediaHTML(p)}
      <div class="pub-body">
        <h3 class="pub-title">${titleLink(p)}</h3>
        <p class="authors">${authorsHTML(p.authors)}</p>
        ${noteHTML(p)}
        ${venueHTML(p)}
        ${linksHTML(p, true)}
        ${p.abstract ? `<p class="pub-abs" id="abs-${esc(p.id)}" hidden>${esc(p.abstract)}</p>` : ''}
      </div>
    </article>`;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => { const [y, m] = d.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
  let refSeq = 0;

  function newsHTML(n, yearBreak) {
    let body = n.html || '';
    let refs = '';
    if (n.refs && n.refs.length) {
      const id = `news-refs-${++refSeq}`;
      body = `<button type="button" class="news-expand" aria-expanded="false" aria-controls="${id}">${esc(n.lead)}${CHEV}</button> ${esc(n.text)}`;
      refs = `<ul class="news-refs" id="${id}" hidden>${n.refs.map(([pid, note]) => {
        const p = byId[pid];
        return p ? `<li>${titleLink(p)}${note ? ` (${esc(note)})` : ''}</li>` : '';
      }).join('')}</ul>`;
    }
    return `<li${yearBreak ? ' class="year-break"' : ''}><span class="date">${fmtDate(n.date)}</span><span>${body}</span>${refs}</li>`;
  }

  // One blog list entry: date, title, summary, then "Read" and the post's companion links.
  const fmtDay = (d) => { const [y, m, day] = d.split('-'); return `${MONTHS[+m - 1]} ${+day}, ${y}`; };

  function postHTML(p) {
    const href = `blog/${p.slug}.html`;
    const chips = [`<a class="chip-link primary" ${linkAttrs(href)}>Read</a>`]
      .concat((p.links || []).map(([label, to]) => `<a class="chip-link" ${linkAttrs(to)}>${esc(label)}</a>`));
    return `<article class="post-row">
      <time class="post-date" datetime="${esc(p.date)}">${fmtDay(p.date)}</time>
      <h2 class="post-title"><a ${linkAttrs(href)}>${esc(p.title)}</a></h2>
      <p class="post-summary">${esc(p.summary)}</p>
      <div class="links">${chips.join('')}</div>
    </article>`;
  }

  const yearsOf = (items, get) => [...new Set(items.map(get))].sort((a, b) => b - a);

  const tocHTML = (years) =>
    `<div class="toc-label">Jump to year</div><ul>${years.map((y) => `<li><a href="#y${y}">${y}</a></li>`).join('')}</ul>`;

  /* ---------- Render ---------- */
  function render() {
    const selectedEl = $('[data-render="selected"]');
    if (selectedEl) selectedEl.innerHTML = pubs.filter((p) => p.selected).sort((x, y) => x.selected - y.selected).map(rowHTML).join('');

    const pubsEl = $('[data-render="publications"]');
    if (pubsEl) {
      const years = yearsOf(pubs, (p) => p.year);
      pubsEl.innerHTML = years.map((y) => {
        const list = pubs.filter((p) => p.year === y);
        return `<section class="year-group"><h2 class="year-head" id="y${y}">${y}</h2><div class="pub-list">${list.map(rowHTML).join('')}</div></section>`;
      }).join('');
      const toc = $('[data-render="toc"]');
      if (toc) toc.innerHTML = tocHTML(years);
    }

    const newsEl = $('[data-render="news"]');
    if (newsEl) {
      const limit = +newsEl.dataset.limit || SITE.news.length;
      const items = SITE.news.slice(0, limit);
      newsEl.innerHTML = items.map((n, i) => newsHTML(n, i > 0 && n.date.slice(0, 4) !== items[i - 1].date.slice(0, 4))).join('');
    }

    const newsYearsEl = $('[data-render="news-by-year"]');
    if (newsYearsEl) {
      const years = yearsOf(SITE.news, (n) => +n.date.slice(0, 4));
      newsYearsEl.innerHTML = years.map((y) => {
        const list = SITE.news.filter((n) => +n.date.slice(0, 4) === y);
        return `<section class="year-group"><h2 class="year-head" id="y${y}">${y}</h2><ul class="log">${list.map((n) => newsHTML(n, false)).join('')}</ul></section>`;
      }).join('');
      const toc = $('[data-render="toc"]');
      if (toc) toc.innerHTML = tocHTML(years);
    }

    // Blog: published posts newest first; drafts stay hidden. The template is for whoever writes
    // the posts, not for readers, so it gets one small link under the list and no row of its own.
    const postsEl = $('[data-render="posts"]');
    if (postsEl) {
      const shown = (SITE.posts || []).filter((p) => !p.draft);
      const posts = shown.filter((p) => !p.template).sort((x, y) => y.date.localeCompare(x.date));
      const templates = shown.filter((p) => p.template);
      postsEl.innerHTML =
        (posts.length ? posts.map(postHTML).join('') : '<div class="empty"><b>No posts yet</b>Posts will appear here once they are published.</div>')
        + (templates.length ? `<div class="post-aside">${templates.map((p) => `<a ${linkAttrs(`blog/${p.slug}.html`)}>${esc(p.title)}</a>`).join('')}</div>` : '');
    }

    // Free-text news may link out: open those in a new tab.
    $$('.log a[href]').forEach((a) => {
      if (isExternal(a.getAttribute('href')) && !a.target) { a.target = '_blank'; a.rel = 'noopener'; }
    });

    // Click-to-load YouTube tiles: <a class="yt" data-yt="VIDEO_ID" href="https://www.youtube.com/watch?v=VIDEO_ID">
    // Add data-hd for a large tile: tries the 1280px thumbnail and falls back when YouTube has none.
    $$('a.yt[data-yt]').forEach((a) => {
      const base = `https://i.ytimg.com/vi/${encodeURIComponent(a.dataset.yt)}/`;
      const hd = a.hasAttribute('data-hd');
      a.innerHTML = `<img src="${base}${hd ? 'maxresdefault' : 'hqdefault'}.jpg" alt="" loading="lazy" decoding="async"><span class="play">${ICON_PLAY}</span>`;
      if (hd) {
        const img = a.firstElementChild;
        const fallback = () => { if (!img.src.endsWith('hqdefault.jpg')) img.src = `${base}hqdefault.jpg`; };
        img.addEventListener('load', () => { if (img.naturalWidth <= 320) fallback(); });
        img.addEventListener('error', fallback);
      }
    });
  }

  /* ---------- Lightbox ---------- */
  let dlg = null;

  function dialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.innerHTML = `<button type="button" class="lb-close" aria-label="Close">${ICON_CLOSE}</button>
      <div class="lb-scroll"><div class="lb-media"></div><div class="lb-body"></div></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('.lb-close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      $('.lb-media', dlg).innerHTML = '';
      document.documentElement.style.overflow = '';
    });
    return dlg;
  }

  function show(mediaHTMLString, bodyHTMLString, wide) {
    const d = dialog();
    d.classList.toggle('wide', !!wide);
    const media = $('.lb-media', d);
    media.innerHTML = mediaHTMLString;
    media.hidden = !mediaHTMLString;
    const body = $('.lb-body', d);
    body.innerHTML = bodyHTMLString || '';
    body.hidden = !bodyHTMLString;
    $('.lb-scroll', d).scrollTop = 0;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      document.documentElement.style.overflow = 'hidden';
    }
  }

  function openPub(p) {
    const media = p.video
      ? `<video src="${esc(url(p.video))}" poster="${esc(url(p.image))}" controls autoplay muted loop playsinline></video>`
      : p.image ? `<img src="${esc(url(p.image))}" alt="${esc(`Figure from ${p.short || p.title}`)}">` : '';
    show(media, `${metaHTML(p)}
      <h2 class="lb-title">${esc(p.title)}</h2>
      <p class="authors">${authorsHTML(p.authors, true)}</p>
      ${noteHTML(p)}
      ${p.abstract ? `<p class="lb-abs"><b>Abstract.</b> ${esc(p.abstract)}</p>` : ''}
      ${linksHTML(p, false)}`);
  }

  /* ---------- Interactions ---------- */
  function toggle(btn) {
    const target = document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    target.hidden = !open;
  }

  // A short notice at the bottom of the screen.
  let toastTimer = 0;
  function toast(text) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
      void el.offsetWidth; // let the first notice fade in too
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
  }

  // An email link opens the visitor's mail app, and does nothing visible where none is set up.
  // So the click also copies the address and says so; the link itself is left to do its job.
  function copyEmail(link) {
    const address = decodeURIComponent(link.getAttribute('href').slice('mailto:'.length).split('?')[0]);
    const say = (copied) => toast(copied ? `Email address copied: ${address}` : `Email: ${address}`);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(address).then(() => say(true), () => say(false));
    else say(false);
  }

  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;

    const opener = t.closest('[data-open]');
    if (opener && byId[opener.dataset.open]) { openPub(byId[opener.dataset.open]); return; }

    const expander = t.closest('[data-abs], .news-expand');
    if (expander) { toggle(expander); return; }

    const more = t.closest('[data-more]');
    if (more) {
      const rest = more.previousElementSibling;
      if (rest) rest.hidden = false;
      more.remove();
      return;
    }

    const zoom = t.closest('img[data-zoom]');
    if (zoom) { show(`<img src="${esc(zoom.currentSrc || zoom.src)}" alt="${esc(zoom.alt)}">`, '', true); return; }

    const yt = t.closest('a.yt[data-yt]');
    if (yt && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      const frame = document.createElement('div');
      frame.className = yt.className;
      frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt.dataset.yt)}?autoplay=1&rel=0" title="${esc(yt.getAttribute('aria-label') || 'YouTube video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      yt.replaceWith(frame);
      return;
    }

    const copy = t.closest('[data-copy]');
    if (copy) {
      const src = document.getElementById(copy.dataset.copy);
      if (src && navigator.clipboard) {
        navigator.clipboard.writeText(src.textContent.trim()).then(() => {
          const label = copy.textContent;
          copy.textContent = 'Copied';
          setTimeout(() => { copy.textContent = label; }, 1600);
        }).catch(() => {});
      }
      return;
    }

    const mail = t.closest('a[href^="mailto:"]');
    if (mail) copyEmail(mail);

    const navToggle = t.closest('.nav-toggle');
    const bar = $('.topbar');
    if (navToggle && bar) {
      const open = bar.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    } else if (bar && bar.classList.contains('open') && !t.closest('.nav')) {
      bar.classList.remove('open');
      const btn = $('.nav-toggle', bar);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Contents rail: highlight the section in view.
  function spy(links) {
    const pairs = links
      .map((a) => [document.getElementById(decodeURIComponent(a.hash.slice(1))), a])
      .filter(([target]) => target);
    if (!pairs.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      let current = pairs[0][1];
      for (const [target, a] of pairs) if (target.getBoundingClientRect().top <= 140) current = a;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = pairs[pairs.length - 1][1];
      links.forEach((a) => a.classList.toggle('active', a === current));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Videos in lists load and play only while on screen.
  function lazyVideos() {
    const videos = $$('video[data-autoplay]');
    if (!videos.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => {}); else target.pause();
      });
    }, { rootMargin: '120px 0px' });
    videos.forEach((v) => io.observe(v));
  }

  // A post's contents rail is built from its h2 headings, so nobody keeps the list in step by hand.
  // A heading without an id gets one from its text; data-toc="…" on a heading gives a shorter label.
  function buildToc() {
    const toc = $('.ar-toc[data-toc="auto"]');
    if (!toc) return;
    const heads = $$('.ar-main h2');
    const used = new Set($$('[id]').map((el) => el.id));
    heads.forEach((h) => {
      if (h.id) return;
      const base = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
      let id = base;
      for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
      used.add(id);
      h.id = id;
    });
    toc.innerHTML = `<h3>Contents</h3><ol>${heads.map((h) =>
      `<li><a href="#${esc(h.id)}">${esc(h.dataset.toc || h.textContent.trim())}</a></li>`).join('')}</ol>`;
  }

  function init() {
    render();
    buildToc();
    lazyVideos();
    const links = $$('.toc a[href^="#"], .ar-toc a[href^="#"]');
    if (links.length) spy(links);
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
