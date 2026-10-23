/**
 * Static HTML for the work section and the case studies, generated from `projects.ts` at build
 * time (see the Vite plugin in vite.config.ts). The page is complete without JavaScript: case
 * studies open through `:target`; scripts only upgrade them to a dialog with a shared-element
 * transition.
 */
import { alsoShipped, type Project, projects } from './projects';

const esc = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Escape, then turn `code spans` into <code>. */
const rich = (s: string): string => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const webp = (src: string): string => src.replace(/\.jpg$/, '.webp');

const tone = (p: Project): string => `--tone:${p.tone};--tone-ink:${p.toneInk}`;

function media(p: Project, cls: string, eager = false): string {
  if (!p.image) {
    return `<div class="${cls} ${cls}-material" data-frost="emblem:${p.emblem}" data-frost-bg="signal" data-strike aria-hidden="true"></div>`;
  }
  const load = eager ? 'eager' : 'lazy';
  const [dw, dh] = p.image.desktopSize;
  const [mw, mh] = p.image.mobileSize;
  return `<figure class="${cls}${p.image.wide ? ` ${cls}-wide` : ''}" data-vt="${p.slug}">
      <picture>
        <source media="(max-width: 599px)" type="image/webp" srcset="${webp(p.image.mobile)}" width="${mw}" height="${mh}" />
        <source media="(max-width: 599px)" srcset="${p.image.mobile}" width="${mw}" height="${mh}" />
        <source type="image/webp" srcset="${webp(p.image.desktop)}" width="${dw}" height="${dh}" />
        <img src="${p.image.desktop}" width="${dw}" height="${dh}" loading="${load}" decoding="async" alt="${esc(p.image.alt)}" />
      </picture>
    </figure>`;
}

function caseRow(p: Project): string {
  const external = p.links.find((l) => l.href.startsWith('http')) ?? p.links[0];
  return `<li class="case${p.image ? '' : ' case-material'}" id="work-${p.slug}" style="${tone(p)}" data-case-row="${p.slug}">
  <article class="frame case-row" aria-labelledby="name-${p.slug}">
    <div class="case-copy">
      <h3 class="case-name" id="name-${p.slug}">${esc(p.name)}</h3>
      <p class="case-line">${esc(p.line)}</p>
      <dl class="case-meta">
        <div><dt>Kind</dt><dd>${esc(p.discipline)}</dd></div>
        <div><dt>Built with</dt><dd>${esc(p.stack)}</dd></div>
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
      </dl>
      <div class="case-actions">
        <a class="btn btn-ink" href="#case-${p.slug}" data-case-open="${p.slug}">Read the case<span class="visually-hidden">: ${esc(p.name)}</span></a>
        ${external ? `<a class="link" href="${external.href}">${esc(external.label)}</a>` : ''}
      </div>
    </div>
    ${p.image ? `<div class="case-emblem" data-frost="emblem:${p.emblem}" data-strike aria-hidden="true"></div>` : ''}
    ${media(p, 'case-media')}
  </article>
</li>`;
}

function caseDoc(p: Project, i: number): string {
  const next = projects[(i + 1) % projects.length];
  const list = (items: string[]) => `<ul>${items.map((t) => `<li>${rich(t)}</li>`).join('')}</ul>`;
  return `<article class="doc" id="case-${p.slug}" style="${tone(p)}" aria-labelledby="doc-${p.slug}" data-doc="${p.slug}">
  <div class="frame doc-bar">
    <span class="doc-kind">${esc(p.discipline)} · ${esc(p.year)}</span>
    <a class="doc-close" href="#work-${p.slug}" data-case-close>Close</a>
  </div>
  <header class="frame doc-head">
    <h2 class="doc-title" id="doc-${p.slug}">${esc(p.name)}</h2>
    <p class="doc-line">${esc(p.line)}</p>
  </header>
  <div class="frame">${media(p, 'doc-media', false)}</div>
  <div class="frame doc-grid">
    <section class="doc-sec doc-brief"><h3>The problem</h3><p>${rich(p.brief)}</p></section>
    <section class="doc-sec"><h3>What we built</h3>${list(p.built)}</section>
    <section class="doc-sec"><h3>Decisions that mattered</h3>${list(p.decisions)}</section>
    ${p.figure ? `<p class="doc-figure"><span class="doc-figure-v">${esc(p.figure.value)}</span><span class="doc-figure-l">${esc(p.figure.label)}</span></p>` : ''}
  </div>
  <div class="frame doc-foot">
    <ul class="doc-links">${p.links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul>
    ${next ? `<a class="doc-next" href="#case-${next.slug}" data-case-open="${next.slug}"><span>Next case</span> ${esc(next.name)}</a>` : ''}
  </div>
</article>`;
}

export function renderWork(): { cases: string; also: string; docs: string } {
  return {
    cases: projects.map(caseRow).join('\n'),
    also: alsoShipped
      .map(
        (a) =>
          `<li><span class="also-name">${a.href ? `<a class="link" href="${a.href}">${esc(a.name)}</a>` : esc(a.name)}</span><span class="also-what">${esc(a.what)}</span><span class="also-stack">${esc(a.stack)}</span></li>`,
      )
      .join(''),
    docs: projects.map(caseDoc).join('\n'),
  };
}
