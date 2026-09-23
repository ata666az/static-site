// config.js
export default {
  BACKEND_HOSTS: [
    'cf.bebas11.workers.dev',
    'cf.bebas9.workers.dev',
  ],
  PROXY_BANK_URL: 'https://raw.githubusercontent.com/papapapapdelesia/Emilia/refs/heads/main/Data/Country-ALIVE.txt',
  PORTS: [443, 80],
  PROTOCOLS: ['trojan', 'vless', 'ss'],
  SHARED_UUID: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  MAX_PROXIES: 200,
  OUTPUT_JSON: 'public/data/proxies.json',
  OUTPUT_SUB: 'public/data/sub.txt',
};
