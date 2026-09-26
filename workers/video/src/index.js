/* Films for rusanivsky.com, straight from R2.

   A <video> element asks for byte ranges — first a little to read the
   header, then whatever part the viewer seeks to — so Range has to be
   answered with 206, or scrubbing and Safari break. Only GET and HEAD;
   only the site (and local previews) may embed. */

const ALLOWED = [
  'https://rusanivsky.com',
  'https://www.rusanivsky.com',
  'https://test.rusanivsky.com',
];

function cors(origin) {
  const ok = ALLOWED.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return ok ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        ...cors(origin),
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Max-Age': '86400',
      } });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    const key = decodeURIComponent(new URL(request.url).pathname.slice(1));
    if (key === 'health') return new Response('ok');
    if (!key || key.includes('..')) return new Response('Not found', { status: 404 });

    const obj = await env.VIDEO.get(key, { range: request.headers, onlyIf: request.headers });
    if (obj === null) return new Response('Not found', { status: 404 });

    const headers = new Headers(cors(origin));
    obj.writeHttpMetadata(headers);
    headers.set('ETag', obj.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // onlyIf failed: the browser's copy is still good.
    if (!('body' in obj)) return new Response(null, { status: 304, headers });

    const r = obj.range;
    if (r && request.headers.has('Range')) {
      // R2 hands back either { suffix } or { offset, length } — the other
      // keys can be present but undefined, so test values, not keys.
      const suffix = r.suffix !== undefined;
      const start = suffix ? obj.size - r.suffix : (r.offset ?? 0);
      const length = suffix ? r.suffix : (r.length ?? obj.size - start);
      headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${obj.size}`);
      headers.set('Content-Length', String(length));
      return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers });
    }
    headers.set('Content-Length', String(obj.size));
    return new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
  },
};
