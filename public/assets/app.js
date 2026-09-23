// app.js — semua logic di sisi user, tanpa backend
let rawData = null;
let filteredProxies = [];
let currentPage = 0;
const PER_PAGE = 20;

const $ = id => document.getElementById(id);
const toast = $('toast');

function showToast(msg) {
  toast.querySelector('span:last-child').textContent = msg || 'Tersalin';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function escapeHTML(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function flagEmoji(iso) {
  if (!iso || iso === 'XX') return '🌐';
  return String.fromCodePoint(...iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Config tersalin');
  } catch {
    showToast('Gagal salin');
  }
}

function applyFilters() {
  const q = $('search').value.trim().toLowerCase();
  const cc = $('countryFilter').value;
  const proto = $('protocolFilter').value;

  filteredProxies = rawData.proxies.filter(p => {
    if (cc && p.country !== cc) return false;
    if (q) {
      const hay = `${p.proxyIP} ${p.country} ${p.org}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (proto) {
      if (!p.configs.some(c => c.protocol === proto)) return false;
    }
    return true;
  });

  currentPage = 0;
  render();
}

function render() {
  const grid = $('proxyGrid');
  const total = filteredProxies.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = currentPage * PER_PAGE;
  const pageList = filteredProxies.slice(start, start + PER_PAGE);

  $('title').textContent = `${total} node ditemukan`;
  $('pageInfo').innerHTML = `
    <span>Total: ${total}</span>
    <span>Halaman: ${currentPage + 1}/${totalPages}</span>
    <span>Build: ${new Date(rawData.generatedAt).toLocaleString('id-ID')}</span>
  `;

  if (!pageList.length) {
    grid.innerHTML = '<div class="proxy-card glass" style="grid-column:1/-1"><div class="org">Tidak ada hasil.</div></div>';
    return;
  }

  const protoNames = { trojan: 'TROJAN', vless: 'VLESS', ss: 'SS' };
  const gridHTML = pageList.map((p, i) => {
    const cc = escapeHTML((p.country || 'XX').toLowerCase());
    const idx = start + i + 1;

    const btnHTML = p.configs.map((cfg, ci) => {
      const label = `${protoNames[cfg.protocol]} ${cfg.tls ? 'TLS' : 'NTLS'}`;
      const encoded = encodeURIComponent(cfg.uri);
      return `<button class="protocol-btn" data-config="${encoded}">${label}</button>`;
    }).join('');

    return `<article class="proxy-card glass" style="--card-index:${i}">
      <div class="card-top">
        <div class="country-id">
          <img src="https://hatscripts.github.io/circle-flags/flags/${cc}.svg" alt="${escapeHTML(p.country)}" loading="lazy">
          <div>
            <small>NODE.${String(idx).padStart(3, '0')}</small>
            <strong>${escapeHTML(p.country)}</strong>
          </div>
        </div>
      </div>
      <div class="org">${escapeHTML(p.org)}</div>
      <div class="endpoint">
        <span>${escapeHTML(p.proxyIP)}</span>
        <b>${escapeHTML(p.proxyPort)}</b>
      </div>
      <div class="protocol-label">CONFIGS</div>
      <div class="protocol-grid">${btnHTML}</div>
    </article>`;
  }).join('');

  grid.innerHTML = gridHTML;

  // Attach copy events
  grid.querySelectorAll('.protocol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uri = decodeURIComponent(btn.dataset.config);
      copyToClipboard(uri);
    });
  });

  // Pagination controls
  if (!document.getElementById('pagination')) {
    const nav = document.createElement('div');
    nav.id = 'pagination';
    nav.className = 'pagination';
    nav.innerHTML = `
      <button id="prevBtn" class="dock-btn">← Prev</button>
      <span id="pageLabel" style="padding:8px 12px;font:10px 'JetBrains Mono';color:var(--muted)"></span>
      <button id="nextBtn" class="dock-btn">Next →</button>
    `;
    grid.parentNode.appendChild(nav);
  }

  $('pageLabel').textContent = `${currentPage + 1} / ${totalPages}`;
  $('prevBtn').disabled = currentPage <= 0;
  $('nextBtn').disabled = currentPage >= totalPages - 1;
  $('prevBtn').onclick = () => { if (currentPage > 0) { currentPage--; render(); window.scrollTo({ top: 0 }); } };
  $('nextBtn').onclick = () => { if (currentPage < totalPages - 1) { currentPage++; render(); window.scrollTo({ top: 0 }); } };
}

async function init() {
  try {
    const [dataRes, metaRes] = await Promise.all([
      fetch('/data/proxies.json'),
      fetch('/data/meta.json'),
    ]);
    rawData = await dataRes.json();
    const meta = await metaRes.json();

    // Update meta header
    $('systemMeta').innerHTML = `
      <div class="meta-chip status"><span class="status-dot"></span>STATIC</div>
      <div class="meta-chip"><span>Nodes</span><b>${meta.totalProxies}</b></div>
      <div class="meta-chip"><span>Countries</span><b>${meta.countries.length}</b></div>
      <div class="meta-chip"><span>Backend</span><b>${meta.backendHost}</b></div>
    `;

    // Populate country dropdown
    const countrySel = $('countryFilter');
    meta.countries.forEach(cc => {
      const opt = document.createElement('option');
      opt.value = cc;
      opt.textContent = `${flagEmoji(cc)} ${cc}`;
      countrySel.appendChild(opt);
    });

    filteredProxies = rawData.proxies;
    applyFilters();

    // Wire filters
    $('search').addEventListener('input', debounce(applyFilters, 250));
    $('countryFilter').addEventListener('change', applyFilters);
    $('protocolFilter').addEventListener('change', applyFilters);

    $('copyAllBtn').onclick = () => {
      const all = filteredProxies.flatMap(p => p.configs.map(c => c.uri)).join('\n');
      copyToClipboard(all);
    };
  } catch (e) {
    console.error(e);
    $('proxyGrid').innerHTML = `<div class="proxy-card glass" style="grid-column:1/-1"><div class="org">Gagal memuat: ${e.message}</div></div>`;
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

init();
