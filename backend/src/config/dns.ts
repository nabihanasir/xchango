import dns from 'dns';

const FALLBACK_SERVERS = ['1.1.1.1', '8.8.8.8'];

const isLoopback = (server: string) => {
  const address = server.replace(/^\[|\](:\d+)?$/g, '').split('%')[0];
  return address === '::1' || address.startsWith('127.');
};

// On Windows, Node's bundled resolver (c-ares) sometimes fails to read the
// adapter's DNS servers and falls back to 127.0.0.1, where nothing is
// listening. Plain hostname lookups still work (those go through the OS), but
// the SRV/TXT queries behind a mongodb+srv:// URI fail with ECONNREFUSED.
const ensureDnsResolvers = () => {
  const configured = process.env.DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (configured?.length) {
    dns.setServers(configured);
    return;
  }

  const current = dns.getServers();
  if (current.length && !current.every(isLoopback)) return;

  dns.setServers(FALLBACK_SERVERS);
  console.warn(
    `DNS: system resolvers unusable (${current.join(', ') || 'none'}), falling back to ${FALLBACK_SERVERS.join(', ')}`
  );
};

export default ensureDnsResolvers;
