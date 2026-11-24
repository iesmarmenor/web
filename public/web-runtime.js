(() => {
  const script = document.currentScript, api = script?.dataset.api;
  const socialShareUrl = function webSocialShareUrl(network, url, title) {
  const address = encodeURIComponent(url), text = encodeURIComponent(title);
  if (network === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${address}`;
  if (network === "x") return `https://x.com/intent/tweet?url=${address}&text=${text}`;
  if (network === "telegram") return `https://t.me/share/url?url=${address}&text=${text}`;
  if (network === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(title ? title + "\n" + url : url)}`;
  return "";
};
  const shareTemplate = document.querySelector('[data-share-current]');
  const shareData = block => ({ title: block.dataset.shareTitle || document.title, url: block.dataset.shareItem ? new URL('contenido.html?id=' + encodeURIComponent(block.dataset.shareItem), script.src).href : location.href.split('#')[0] });
  const refreshSharing = (root = document) => {
    for (const block of root.querySelectorAll('[data-web-share]')) {
      const data = shareData(block);
      for (const link of block.querySelectorAll('[data-web-share-network]')) link.href = socialShareUrl(link.dataset.webShareNetwork, data.url, data.title);
      const native = block.querySelector('[data-web-share-native]'); if (native) native.hidden = typeof navigator.share !== 'function';
      const copy = block.querySelector('[data-web-share-copy]'); if (copy) copy.hidden = false;
    }
  };
  const appendSharing = (container, item) => {
    if (!shareTemplate) return;
    const block = shareTemplate.cloneNode(true); block.removeAttribute('data-share-current'); block.dataset.shareTitle = item.title; block.dataset.shareItem = item.id;
    const status = block.querySelector('[role="status"]'); if (status) { status.textContent = ''; status.hidden = true; }
    container.append(block);
  };
  const copyShareLink = async (block, data) => {
    const status = block.querySelector('[role="status"]');
    try {
      if (!navigator.clipboard?.writeText) throw Error();
      await navigator.clipboard.writeText(data.url);
      status.textContent = 'Enlace copiado.';
    } catch { status.textContent = 'Copia este enlace: ' + data.url; }
    status.hidden = false;
  };
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-web-share-copy],[data-web-share-native]'); if (!button) return;
    event.preventDefault(); const block = button.closest('[data-web-share]'), data = shareData(block);
    if (button.hasAttribute('data-web-share-native') && navigator.share) {
      try { await navigator.share(data); } catch (error) { if (error.name !== 'AbortError') await copyShareLink(block, data); }
    } else await copyShareLink(block, data);
  });
  refreshSharing();
  const iframeSource = function webIframeSource(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 4e3 || /[\u0000-\u0020\u007f\\]/.test(text)) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
};
  const iframeSandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
  const appendIframe = (container, item) => {
    const src = item.kind === 'iframe' ? iframeSource(item.iframeUrl) : null;
    if (!src) return;
    const frame = document.createElement('iframe'); frame.src = src; frame.title = item.title; frame.className = 'web-iframe'; frame.width = '100%'; frame.height = '720'; frame.loading = 'lazy'; frame.sandbox = iframeSandbox; frame.referrerPolicy = 'no-referrer'; frame.allowFullscreen = true;
    const p = document.createElement('p'), link = document.createElement('a'); link.href = src; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Abrir ' + item.title + ' en una nueva pestaña'; p.append(link); container.append(frame, p);
  };
  const visible = x => (!x.startsAt || Date.parse(x.startsAt) <= Date.now()) && (!x.expiresAt || Date.parse(x.expiresAt) > Date.now());
  const contentDate = function webContentDate(content) {
  const value = content.startsAt || content.publishedAt;
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Madrid" }).formatToParts(date);
  const part = (type) => parts.find((value2) => value2.type === type)?.value ?? "";
  return { dateTime: date.toISOString(), label: `${part("day")} ${part("month").replaceAll(".", "").toLocaleUpperCase("es")} ${part("year")}` };
};
  const appendNewsDate = (container, item) => {
    const date = contentDate(item); if (!date) return;
    const time = document.createElement('time'); time.dateTime = date.dateTime; time.textContent = date.label; container.append(time);
  };
  const tagStyle = function webContentTagStyle(id) {
  const colors = ["#be185d", "#6d28d9", "#0369a1", "#047857", "#b45309", "#4338ca", "#0e7490", "#b91c1c", "#a21caf", "#4d7c0f"];
  let hash = 0;
  for (const char of id) hash = Math.imul(hash, 31) + char.charCodeAt(0) >>> 0;
  return "--web-tag-color:" + colors[hash % colors.length];
};
  const tagFromUrl = new URLSearchParams(location.search).get('tagId') || '';
  const feedControllers = new Map();
  const matchesKinds = (kind, kinds) => kinds.includes(kind) || kind === 'iframe' && kinds.includes('news');
  const tagLink = (tag, kind = 'news', count) => {
    const link = document.createElement('a'); link.className = 'web-tag-chip'; link.style.cssText = tagStyle(tag.id); link.dataset.webTag = tag.id; link.textContent = tag.name;
    const url = new URL((kind === 'notice' ? script.dataset.tagNotice : script.dataset.tagNews) || 'etiquetas.html', script.src); if (tag.id) url.searchParams.set('tagId', tag.id); link.href = url.href;
    if (count !== undefined) { const badge = document.createElement('small'); badge.textContent = count; link.append(' ', badge); }
    return link;
  };
  const syncTagCloud = (block, selected) => {
    const kinds = block.dataset.webFeed.split(/\s+/);
    for (const cloud of document.querySelectorAll('[data-web-tag-cloud]')) {
      if (!(cloud.dataset.webTagCloud || 'news').split(/\s+/).some(kind => matchesKinds(kind, kinds))) continue;
      for (const link of cloud.querySelectorAll('[data-web-tag]')) link.setAttribute('aria-current', String(link.dataset.webTag === selected));
    }
  };
  const appendTags = (container, item) => {
    if (!item.tags?.length) return;
    const list = document.createElement('ul'); list.className = 'web-content-tags'; list.setAttribute('aria-label', 'Etiquetas');
    for (const tag of item.tags) { const li = document.createElement('li'); li.append(tagLink(tag, item.kind)); list.append(li); }
    container.append(list);
  };
  const wireFeedControls = (block, selected = tagFromUrl, currentPage = 1) => {
    const select = block.querySelector('[data-web-tag-filter]');
    if (select && [...select.options].some(option => option.value === selected)) select.value = selected;
    const paginated = block.dataset.webFeed.split(/\s+/).some(kind => ['news', 'notice', 'iframe'].includes(kind));
    if (!select && !paginated) return;
    const articles = [...block.querySelectorAll(':scope > article')];
    const empty = document.createElement('p'); empty.setAttribute('role', 'status'); empty.textContent = 'No hay noticias o avisos con esta etiqueta.'; empty.hidden = true;
    if (select) block.append(empty);
    const nav = document.createElement('nav'), previous = document.createElement('button'), next = document.createElement('button'), status = document.createElement('span');
    nav.className = 'web-feed-pagination'; nav.setAttribute('aria-label', 'Paginación de noticias y avisos');
    previous.type = next.type = 'button'; previous.textContent = 'Anterior'; next.textContent = 'Siguiente';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    nav.append(previous, status, next); if (paginated) block.append(nav);
    const apply = () => {
      const matching = articles.filter(article => {
        const ids = (article.dataset.webTags || '').split(',').filter(Boolean);
        return !select?.value || (select.value === 'untagged' ? !ids.length : ids.includes(select.value));
      });
      const pageSize = paginated ? 10 : Math.max(1, matching.length), pages = Math.max(1, Math.ceil(matching.length / pageSize));
      currentPage = Math.max(1, Math.min(currentPage, pages)); block.dataset.webPage = String(currentPage);
      const shown = new Set(matching.slice((currentPage - 1) * pageSize, currentPage * pageSize));
      for (const article of articles) {
        const show = shown.has(article); article.hidden = !show; article.classList.toggle('web-content-tag-hidden', !show);
      }
      empty.hidden = matching.length > 0;
      previous.disabled = currentPage === 1; next.disabled = currentPage === pages;
      nav.hidden = matching.length <= pageSize;
      status.textContent = 'Página ' + currentPage + ' de ' + pages + ' · ' + matching.length + ' publicaciones';
      syncTagCloud(block, select?.value || '');
    };
    select?.addEventListener('change', () => { currentPage = 1; apply(); });
    previous.addEventListener('click', () => { currentPage--; apply(); });
    next.addEventListener('click', () => { currentPage++; apply(); });
    feedControllers.set(block, value => {
      if (!select || ![...select.options].some(option => option.value === value)) return false;
      select.value = value; currentPage = 1; apply(); return true;
    });
    apply();
  };
  const appendTagFilter = (block, records, catalog = []) => {
    if (!block.dataset.webFeed.split(/\s+/).some(kind => ['news', 'notice', 'iframe'].includes(kind))) return;
    const tags = new Map([...catalog, ...records.flatMap(item => item.tags || [])].map(tag => [tag.id, tag]));
    if (!tags.size) return;
    const label = document.createElement('label'), select = document.createElement('select'); label.className = 'web-tag-filter'; label.append('Filtrar por etiqueta '); select.dataset.webTagFilter = '';
    select.add(new Option('Todas las etiquetas', '')); select.add(new Option('Sin etiquetas', 'untagged'));
    for (const tag of [...tags.values()].sort((a,b) => a.name.localeCompare(b.name, 'es'))) select.add(new Option(tag.name, tag.id));
    label.append(select); block.append(label);
  };
  const refreshTagClouds = (items, catalog) => {
    for (const cloud of document.querySelectorAll('[data-web-tag-cloud]')) {
      const kinds = (cloud.dataset.webTagCloud || 'news').split(/\s+/);
      const records = items.filter(item => matchesKinds(item.kind, kinds) && visible(item));
      const tags = new Map([...catalog, ...records.flatMap(item => item.tags || [])].map(tag => [tag.id, tag]));
      const heading = document.createElement('h3'); heading.textContent = 'Etiquetas'; cloud.replaceChildren(heading); cloud.classList.add('web-tag-cloud');
      if (!tags.size) { const empty = document.createElement('p'); empty.textContent = 'No hay etiquetas disponibles.'; cloud.append(empty); continue; }
      const links = document.createElement('div'); links.className = 'web-tag-cloud-links';
      const kind = kinds.includes('news') ? 'news' : 'notice';
      const all = tagLink({ id: '', name: 'Todas' }, kind); all.classList.add('web-tag-neutral'); all.style.removeProperty('--web-tag-color'); links.append(all);
      for (const tag of [...tags.values()].sort((a,b) => a.name.localeCompare(b.name, 'es'))) links.append(tagLink(tag, kind, records.filter(item => item.tags?.some(t => t.id === tag.id)).length));
      cloud.append(links);
    }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-web-tag]'); if (!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const scope = link.closest('[data-web-tag-cloud],[data-web-feed]'); if (!scope) return;
    const kinds = (scope.dataset.webTagCloud || scope.dataset.webFeed || 'news').split(/\s+/);
    let applied = false;
    for (const [block, filter] of feedControllers) {
      if (scope.hasAttribute('data-web-feed') ? block !== scope : !block.dataset.webFeed.split(/\s+/).some(kind => matchesKinds(kind, kinds))) continue;
      if (filter(link.dataset.webTag)) applied = true;
    }
    if (applied) event.preventDefault();
  });
  document.querySelectorAll('[data-web-feed]').forEach(block => wireFeedControls(block));
  const toggles = document.querySelectorAll('.burger,.web-mobile-toggle');
  toggles.forEach(button => button.addEventListener('click', () => {
    const nav = document.getElementById(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    if (nav) { nav.classList.toggle('mobile-open', open); nav.hidden = false; }
  }));
  document.querySelectorAll('.nav-toggle').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open)); button.parentElement.classList.toggle('open', open);
  }));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.nav-group.open').forEach(group => { group.classList.remove('open'); group.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false'); });
    toggles.forEach(button => { document.getElementById(button.getAttribute('aria-controls'))?.classList.remove('mobile-open'); button.setAttribute('aria-expanded', 'false'); });
  });
  document.querySelectorAll('.search-open').forEach(button => button.addEventListener('click', () => { location.href = new URL('buscar.html', script.src).href; }));
  const live = api ? fetch(api, { credentials: 'omit' }).then(response => { if (!response.ok) throw Error(); return response.json(); }) : Promise.resolve({ items: [] });
  live.then(({ items, tags = [] }) => {
    refreshTagClouds(items, tags);
    for (const block of document.querySelectorAll('[data-web-feed]')) {
      const heading = block.querySelector(':scope > h2, :scope > .section-panel__head, :scope > .home-notices__label');
      const selectedTag = block.querySelector('[data-web-tag-filter]')?.value || '';
      const kinds = block.dataset.webFeed.split(/\s+/);
      const records = items.filter(x => (kinds.includes(x.kind) || kinds.includes('news') && x.kind === 'iframe') && visible(x));
      block.replaceChildren();
      if (heading) block.append(heading);
      else { const title = document.createElement('h2'); title.textContent = 'Actualidad'; block.append(title); }
      appendTagFilter(block, records, tags);
      for (const item of records) {
        const article = document.createElement('article'), title = document.createElement('h3'), summary = document.createElement('p');
        const meta = document.createElement('div'), content = document.createElement('div'); article.className = 'web-news-card'; meta.className = 'web-news-meta'; content.className = 'web-news-body'; article.append(meta, content);
        article.dataset.webTags = (item.tags || []).map(tag => tag.id).join(',');
        const link = document.createElement('a'); link.textContent = item.title; link.href = new URL('contenido.html?id=' + encodeURIComponent(item.id), script.src).href; title.append(link);
        summary.textContent = item.summary; content.append(title, summary);
        if (['news', 'notice', 'iframe'].includes(item.kind)) appendNewsDate(meta, item);
        else if (item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); meta.append(time); }
        appendTags(meta, item);
        if (['news', 'notice', 'iframe'].includes(item.kind)) {
          const p = document.createElement('p'), more = document.createElement('a'); more.className = 'web-news-read-more'; more.href = link.href; more.textContent = 'Leer más'; more.setAttribute('aria-label', 'Leer más: ' + item.title); p.append(more); content.append(p);
        } else {
          if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; image.loading = 'lazy'; content.append(image); }
          if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; content.append(body); }
          if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; content.append(link); }
        }
        if (!['news', 'iframe'].includes(item.kind)) appendSharing(content, item);
        block.append(article);
      }
      if (!records.length) { const empty = document.createElement('p'); empty.setAttribute('role', 'status'); empty.textContent = 'No hay publicaciones vigentes.'; block.append(empty); }
      wireFeedControls(block, selectedTag, Number(block.dataset.webPage) || 1);
      refreshSharing(block);
    }
  }).catch(() => {});
  for (const container of document.querySelectorAll('[data-web-item]')) {
    const id = container.dataset.webItem === 'query' ? new URLSearchParams(location.search).get('id') : container.dataset.webItem;
    if (!api || !/^[0-9a-f-]{36}$/i.test(id || '')) continue;
    fetch(api + '?id=' + encodeURIComponent(id), { credentials: 'omit' }).then(response => {
      if (!response.ok) throw Error(); return response.json();
    }).then(({ items }) => {
      const item = items.find(x => x.id === id && visible(x));
      if (!item) { container.replaceChildren(); const heading = document.createElement('h1'); heading.textContent = 'Contenido no disponible'; container.append(heading); return; }
      container.replaceChildren(); const heading = document.createElement('h1'), summary = document.createElement('p');
      let content = container, meta = container;
      const dated = ['news', 'notice', 'iframe'].includes(item.kind);
      if (dated) {
        const article = document.createElement('article'); article.className = 'web-news-card web-news-detail';
        meta = document.createElement('div'); meta.className = 'web-news-meta'; content = document.createElement('div'); content.className = 'web-news-body';
        article.append(meta, content); container.append(article); appendNewsDate(meta, item);
      }
      heading.textContent = item.title; summary.textContent = item.summary; content.append(heading, summary);
      const pageShare = document.querySelector('[data-share-current]'); if (pageShare) pageShare.dataset.shareTitle = item.title;
      appendTags(meta, item);
      if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; content.append(image); }
      if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; content.append(body); }
      if (!dated && item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); content.append(time); }
      appendIframe(content, item);
      if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; content.append(link); }
      refreshSharing();
    }).catch(() => {});
  }
  const form = document.getElementById('web-search-form'), input = form?.querySelector('input') || document.getElementById('full-search');
  const results = document.getElementById('web-search-results') || document.getElementById('search-page-results');
  async function search(event) {
    event?.preventDefault();
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    const index = await fetch(new URL('search-index.json', script.src)).then(response => response.json());
    const updates = await live.catch(() => ({ items: [] }));
    const all = [...index, ...updates.items.map(x => ({ title: x.title, text: x.summary, url: x.url || new URL('contenido.html?id=' + encodeURIComponent(x.id), script.src).href, startsAt: x.startsAt, expiresAt: x.expiresAt }))];
    results.replaceChildren(); const seen = new Set();
    for (const item of all.filter(x => visible(x) && words.length && words.every(word => normalize(x.title + ' ' + x.text).includes(word))).slice(0, 50)) {
      if (seen.has(item.url)) continue; seen.add(item.url);
      const row = document.createElement('p'), link = document.createElement('a'); link.textContent = item.title; link.href = item.url; row.append(link); results.append(row);
    }
    if (!results.children.length) results.textContent = 'No se han encontrado resultados.';
  }
  if (input && results) {
    form?.addEventListener('submit', search);
    document.getElementById('full-search-submit')?.addEventListener('click', search);
    if (!form) input.addEventListener('keydown', event => { if (event.key === 'Enter') search(event); });
  }
})();