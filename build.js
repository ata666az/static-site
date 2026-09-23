// build.js
import fs from 'node:fs/promises';
import path from 'node:path';
import config from './config.js';

console.log('[BUILD] Start');

// ---------- HELPER ----------
function getFlagEmoji(iso) {
  if (!iso || iso === 'XX') return '🌐';
  return String.fromCodePoint(...iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}
function btoa(str) {
  return Buffer.from(str).toString('base64');
}

// ---------- FETCH PROXY LIST ----------
async function fetchProxies() {
  console.log('[BUILD] Fetching proxy bank...');
  const res = await fetch(config.PROXY_BANK_URL, {
    headers: { 'User-Agent': 'static-vpn-build' },
  });
  if (!res.ok) throw new Error('Fetch failed: ' + res.status);
  const text = await res.text();
  console.log('[BUILD] Downloaded ' + text.length + ' bytes');

  return text
    .split('\n')
    .filter(Boolean)
    .map(entry => {
      const [ip, port, cc, org] = entry.split(',');
      return {
        proxyIP: (ip || '').trim(),
        proxyPort: (port || '').trim(),
        country: (cc || 'XX').trim(),
        org: (org || 'Unknown Org').trim(),
      };
    })
    .filter(p => p.proxyIP && p.proxyPort && /^\d+$/.test(p.proxyPort))
    .slice(0, config.MAX_PROXIES);
}

// ---------- GENERATE CONFIGS ----------
function generateConfigs(proxy, backendHost, uuid) {
  const pIP = proxy.proxyIP;
  const proxyPort = proxy.proxyPort;
  const configs = [];

  for (const port of config.PORTS) {
    for (const protocol of config.PROTOCOLS) {
      const uri = new URL(`${protocol}://${backendHost}`);
      uri.searchParams.set('encryption', 'none');
      uri.searchParams.set('type', 'ws');
      uri.searchParams.set('host', backendHost);
      uri.searchParams.set('path', `/${pIP}-${proxyPort}`);
      uri.port = port.toString();
      uri.hash = `${getFlagEmoji(proxy.country)} ${proxy.country} ${proxy.org} WS ${port === 443 ? 'TLS' : 'NTLS'}`;

      if (protocol === 'ss') {
        uri.username = btoa(`none:${uuid}`);
        uri.searchParams.set(
          'plugin',
          `v2ray-plugin${port === 80 ? '' : ';tls'};mux=0;mode=websocket;path=/${pIP}-${proxyPort};host=${backendHost}`
        );
      } else {
        uri.username = uuid;
      }
      uri.searchParams.set('security', port === 443 ? 'tls' : 'none');
      uri.searchParams.set('sni', port === 80 && protocol === 'vless' ? '' : backendHost);

      configs.push({ protocol, port, tls: port === 443, uri: uri.toString() });
    }
  }
  return configs;
}

// ---------- BUILD ----------
async function build() {
  console.log('[BUILD] Fetching proxies...');
  const proxies = await fetchProxies();
  console.log(`[BUILD] Got ${proxies.length} proxies`);

  if (!proxies.length) throw new Error('No proxies fetched');

  const backendHost = config.BACKEND_HOSTS[0];
  const uuid = config.SHARED_UUID;

  const output = {
    generatedAt: new Date().toISOString(),
    backendHost,
    uuid,
    totalProxies: proxies.length,
    countries: [...new Set(proxies.map(p => p.country))].sort(),
    proxies: proxies.map((proxy, i) => ({
      index: i + 1,
      proxyIP: proxy.proxyIP,
      proxyPort: proxy.proxyPort,
      country: proxy.country,
      org: proxy.org,
      configs: generateConfigs(proxy, backendHost, uuid),
    })),
  };

  // Pastikan folder dibuat
  const dir = path.dirname(config.OUTPUT_JSON);
  console.log(`[BUILD] Creating dir: ${dir}`);
  await fs.mkdir(dir, { recursive: true });

  // Tulis JSON
  await fs.writeFile(config.OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`[BUILD] ✓ Wrote ${config.OUTPUT_JSON}`);

  // Tulis subscription
  const allUris = output.proxies.flatMap(p => p.configs.map(c => c.uri)).join('\n');
  await fs.writeFile(config.OUTPUT_SUB, allUris, 'utf-8');
  console.log(`[BUILD] ✓ Wrote ${config.OUTPUT_SUB} (${allUris.split('\n').length} URIs)`);

  // Tulis meta
  const meta = {
    generatedAt: output.generatedAt,
    backendHost,
    totalProxies: output.totalProxies,
    countries: output.countries,
  };
  await fs.writeFile('public/data/meta.json', JSON.stringify(meta, null, 2), 'utf-8');
  console.log('[BUILD] ✓ Wrote public/data/meta.json');

  // Verifikasi file benar-benar ada
  console.log('[BUILD] Verifying output files...');
  for (const f of [config.OUTPUT_JSON, config.OUTPUT_SUB, 'public/data/meta.json']) {
    const stat = await fs.stat(f);
    console.log(`[BUILD]   ✓ ${f} (${(stat.size / 1024).toFixed(2)} KB)`);
  }

  console.log(`[BUILD] Done! ${output.totalProxies} proxies`);
}

build().catch(e => {
  console.error('[BUILD] FAILED:', e);
  process.exit(1);
});
