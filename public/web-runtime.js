(() => {
  const script = document.currentScript, api = script?.dataset.api;
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
      block.replaceChildren(); const heading = document.createElement('h2'); heading.textContent = label; block.append(heading);
      for (const item of items.filter(x => (x.kind === block.dataset.webFeed || block.dataset.webFeed === 'news' && x.kind === 'iframe') && visible(x))) {
        const article = document.createElement('article'), title = document.createElement('h3'), summary = document.createElement('p');
        title.textContent = item.title; summary.textContent = item.summary; article.append(title, summary);
        if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; image.loading = 'lazy'; article.append(image); }
        if (item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); article.append(time); }
        if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; article.append(body); }
        appendIframe(article, item);
        if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; article.append(link); }
        block.append(article);
      }
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
      if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.title; container.append(image); }
      if (item.body) { const body = document.createElement('div'); body.innerHTML = item.body; container.append(body); }
      if (item.startsAt) { const time = document.createElement('time'); time.dateTime = item.startsAt; time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.startsAt)); container.append(time); }
      appendIframe(container, item);
      if (item.url) { const link = document.createElement('a'); link.href = item.url; link.textContent = 'Consultar ' + item.title; container.append(link); }
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