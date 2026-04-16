/**
 * beyondBINARY quantum-prefixed | uvspeed
 * Cloudflare Worker: map *.ugrad.ai game hosts → single HTML entry under PAGES_WEB_ORIGIN.
 *
 * Env: PAGES_WEB_ORIGIN = https://YOUR_HOST/web  (no trailing slash)
 * Routes attach per hostname, e.g. go.ugrad.ai/*, chess.ugrad.ai/*, …
 */
const HOST_MAP = {
  'go.ugrad.ai': '/go-ugrad.html',
  'raw.games.ugrad.ai': '/raw-games-ugrad.html',
  'install.games.ugrad.ai': '/games-ugrad-terminal.html',
  'webgrid.ugrad.ai': '/webgrid-ugrad.html',
  'chess.ugrad.ai': '/chess-ugrad.html',
  'checkers.ugrad.ai': '/checkers-ugrad.html',
  'pong.ugrad.ai': '/pong-ugrad.html',
  'cards.ugrad.ai': '/cards-ugrad.html',
  'tarot.ugrad.ai': '/tarot-ugrad.html',
  'cartomancy.ugrad.ai': '/cartomancy-ugrad.html',
  'iching.ugrad.ai': '/iching-ugrad.html',
  'mahjong.ugrad.ai': '/mahjong-ugrad.html',
  'blackjack.ugrad.ai': '/blackjack-ugrad.html',
  'games.ugrad.ai': '/games-ugrad-hub.html',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = (url.hostname || '').toLowerCase();
    const root = (
      (env && env.PAGES_WEB_ORIGIN) ||
      'https://qbitos.github.io/uvspeed/web'
    ).replace(/\/$/, '');
    let path = url.pathname || '/';
    if (path === '/' || path === '') {
      path = HOST_MAP[host] || '/games-ugrad-hub.html';
    }
    const siteRoot = root.replace(/\/web$/, '');
    const fetchTarget =
      path.startsWith('/icons/') || path.startsWith('/icons?')
        ? siteRoot + path
        : root + path;
    const targetUrl = fetchTarget + url.search;
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      redirect: 'follow',
    });
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: sanitizeHeaders(res.headers),
    });
  },
};

function sanitizeHeaders(h) {
  const out = new Headers(h);
  ['content-encoding', 'transfer-encoding', 'connection'].forEach((k) =>
    out.delete(k)
  );
  return out;
}
