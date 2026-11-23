(() => {
  const script = document.currentScript, api = script?.dataset.api;
  const socialShareUrl = function webSocialShareUrl(network, url, title) {
	const address = encodeURIComponent(url), text = encodeURIComponent(title);
	if (network === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${address}`;
	if (network === "x") return `https://x.com/intent/tweet?url=${address}&text=${text}`;
	if (network === "telegram") return `https://t.me/share/url?url=${address}&text=${text}`;
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
  const appendTags = (container, item) => {
    if (!item.tags?.length) return;
    const list = document.createElement('ul'); list.className = 'web-content-tags'; list.setAttribute('aria-label', 'Etiquetas');
    for (const tag of item.tags) { const li = document.createElement('li'); li.textContent = tag.name; list.append(li); }
    container.append(list);
  };
  const wireTagFilter = (block, selected = '') => {
    const select = block.querySelector('[data-web-tag-filter]'); if (!select) return;
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
    const empty = document.createElement('p'); empty.setAttribute('role', 'status'); empty.textContent = 'No hay noticias o avisos con esta etiqueta.'; block.append(empty);
    const apply = () => {
      let shown = 0;
      for (const article of block.querySelectorAll(':scope > article')) {
        const ids = (article.dataset.webTags || '').split(',').filter(Boolean);
        const show = !select.value || (select.value === 'untagged' ? !ids.length : ids.includes(select.value));
        article.hidden = !show; article.classList.toggle('web-content-tag-hidden', !show); if (show) shown++;
      }
      empty.hidden = shown > 0;
    };
    select.addEventListener('change', apply); apply();
  };
  const appendTagFilter = (block, records) => {
    const tags = new Map(records.flatMap(item => (item.tags || []).map(tag => [tag.id, tag])));
    if (!tags.size) return;
    const label = document.createElement('label'), select = document.createElement('select'); label.className = 'web-tag-filter'; label.append('Filtrar por etiqueta '); select.dataset.webTagFilter = '';
    select.add(new Option('Todas las etiquetas', '')); select.add(new Option('Sin etiquetas', 'untagged'));
    for (const tag of [...tags.values()].sort((a,b) => a.name.localeCompare(b.name, 'es'))) select.add(new Option(tag.name, tag.id));
    label.append(select); block.append(label);
  };
  document.querySelectorAll('[data-web-feed]').forEach(block => wireTagFilter(block));
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
  live.then(({ items }) => {
    for (const block of document.querySelectorAll('[data-web-feed]')) {
      const label = block.querySelector('h2')?.textContent || 'Actualidad';
      const selectedTag = block.querySelector('[data-web-tag-filter]')?.value || '';
      const records = items.filter(x => (x.kind === block.dataset.webFeed || block.dataset.webFeed === 'news' && x.kind === 'iframe') && visible(x));
      block.replaceChildren(); const heading = document.createElement('h2'); heading.textContent = label; block.append(heading);
      appendTagFilter(block, records);
      for (const item of records) {
        const article = document.createElement('article'), title = document.createElement('h3'), summary = document.createElement('p');
        article.dataset.webTags = (item.tags || []).map(tag => tag.id).join(',');
        title.textContent = item.title; summary.textContent = item.summary; article.append(title, summary);
        appendTags(article, item);
        if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; image.loading = 'lazy'; article.append(image); }
        if (item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); article.append(time); }
        if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; article.append(body); }
        appendIframe(article, item);
        if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; article.append(link); }
        appendSharing(article, item);
        block.append(article);
      }
      wireTagFilter(block, selectedTag);
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
      heading.textContent = item.title; summary.textContent = item.summary; container.append(heading, summary);
      const pageShare = document.querySelector('[data-share-current]'); if (pageShare) pageShare.dataset.shareTitle = item.title;
      appendTags(container, item);
      if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; container.append(image); }
      if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; container.append(body); }
      if (item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); container.append(time); }
      appendIframe(container, item);
      if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; container.append(link); }
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