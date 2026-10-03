"""AC3 font-binary acceptance for docs/wordmusic-case.md (word&music case).

Run after: SITE_ENV=live node scripts/build.mjs
Requires fontTools and brotli (`pip install fonttools brotli`); fails clearly
without them. Written from the contract, independently of the implementation.
"""
from html.parser import HTMLParser
from pathlib import Path
import os
import re
import unittest

ROOT = Path(os.environ.get('WORDMUSIC_SITE_ROOT', str(Path(__file__).resolve().parents[1])))
PAGES = {'en': 'work/wordmusic-design/index.html', 'ua': 'ua/work/wordmusic-design/index.html'}
FONT_URL = re.compile(r'/fonts/tembrava-case-[0-9a-f]{8}\.woff2')
ANY_TEMBRAVA_FONT = re.compile(r'/fonts/[^"\')\s,;]*tembrava[^"\')\s,;]*', re.I)
PRIVATE = re.compile(r'(?:file://|/Users/|/private/|/Volumes/|KR/Production/|GoogleDrive|My Drive)', re.I)
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

try:
    from fontTools.ttLib import TTFont
    import brotli  # noqa: F401  (woff2 decoding)
    FONTTOOLS_ERROR = None
except Exception as exc:  # pragma: no cover
    TTFont = None
    FONTTOOLS_ERROR = exc


class TembravaText(HTMLParser):
    """Collects textContent of every element whose class list contains `tembrava`."""

    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.stack = []          # [tag, is_tembrava]
        self.capture_depth = 0   # number of open .tembrava elements on the stack
        self.chunks = []
        self.count = 0
        self.stylesheets = []
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and 'stylesheet' in (a.get('rel') or '').split() and (a.get('href') or '').startswith('/'):
            self.stylesheets.append(a['href'].split('?')[0].split('#')[0])
        if tag in VOID:
            return
        is_t = 'tembrava' in (a.get('class') or '').split()
        if is_t:
            self.count += 1
            self.capture_depth += 1
        self.stack.append([tag, is_t])

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link':
            self.handle_starttag(tag, attrs)
            return
        if 'tembrava' in (a.get('class') or '').split():
            self.count += 1

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for _, is_t in self.stack[i:]:
                    if is_t:
                        self.capture_depth -= 1
                del self.stack[i:]
                return

    def handle_data(self, data):
        if self.capture_depth > 0:
            self.chunks.append(data)


def load_page(lang):
    path = ROOT / PAGES[lang]
    if not path.is_file():
        raise AssertionError(f'{PAGES[lang]} is not built')
    html = path.read_text(encoding='utf-8')
    parsed = TembravaText(html)
    css = '\n'.join((ROOT / h.lstrip('/')).read_text(encoding='utf-8')
                    for h in parsed.stylesheets if h != '/styles/site.css' and (ROOT / h.lstrip('/')).is_file())
    return html, css, parsed


def union_chars():
    chars = set()
    counts = {}
    for lang in PAGES:
        _, _, parsed = load_page(lang)
        counts[lang] = parsed.count
        for chunk in parsed.chunks:
            chars.update(ch for ch in chunk if ch not in '\t\n\r\f ')
    return chars, counts


def font_url():
    urls = set()
    for lang in PAGES:
        html, css, _ = load_page(lang)
        found = {m.group(0).split('?')[0] for m in ANY_TEMBRAVA_FONT.finditer(html + '\n' + css)}
        if len(found) != 1:
            raise AssertionError(f'{lang}: expected exactly one Tembrava font reference, found {sorted(found)}')
        urls |= found
    if len(urls) != 1:
        raise AssertionError(f'both languages must load the same subset, found {sorted(urls)}')
    url = urls.pop()
    if not FONT_URL.fullmatch(url):
        raise AssertionError(f'font URL {url} is not /fonts/tembrava-case-<8 hex>.woff2')
    return url


class FontToolsAvailable(unittest.TestCase):
    def test_fonttools_and_brotli_importable(self):
        self.assertIsNone(FONTTOOLS_ERROR,
                          f'fontTools + brotli are required for AC3 font checks: pip install fonttools brotli ({FONTTOOLS_ERROR!r})')


@unittest.skipIf(TTFont is None, 'fontTools/brotli missing — see FontToolsAvailable failure')
class SubsetFontAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url = font_url()
        cls.path = ROOT / cls.url.lstrip('/')
        if not cls.path.is_file():
            raise AssertionError(f'{cls.url} does not exist in the repository')
        cls.font = TTFont(str(cls.path))
        cls.cmap = set(cls.font.getBestCmap() or {})
        cls.union, cls.counts = union_chars()

    def test_woff2_container(self):
        self.assertEqual(self.font.flavor, 'woff2')

    def test_pages_have_live_tembrava_text(self):
        for lang, n in self.counts.items():
            self.assertGreater(n, 0, f'{lang}: page has .tembrava elements')
        self.assertTrue(self.union, 'union of .tembrava text is not empty')

    def test_union_covered_by_cmap(self):
        missing = sorted(c for c in self.union if ord(c) not in self.cmap)
        self.assertEqual(missing, [], 'characters set in .tembrava but missing from the subset: '
                         + ' '.join(f'U+{ord(c):04X}({c})' for c in missing))

    def test_cmap_has_nothing_beyond_union_and_space(self):
        allowed = {ord(c) for c in self.union} | {0x20}
        extra = sorted(self.cmap - allowed)
        self.assertEqual(extra, [], 'subset cmap carries characters not used on the page: '
                         + ' '.join(f'U+{u:04X}' for u in extra))

    def test_no_pua_and_at_most_120_code_points(self):
        pua = sorted(u for u in self.cmap if 0xE000 <= u <= 0xF8FF)
        self.assertEqual(pua, [], 'no PUA code points')
        self.assertLessEqual(len(self.cmap), 120, f'cmap has {len(self.cmap)} code points')

    def test_no_logo_glyphs(self):
        logos = [g for g in self.font.getGlyphOrder() if g.endswith('.logo') or '.logo.' in g]
        self.assertEqual(logos, [], 'no *.logo glyphs in the subset')

    def test_no_dlig_and_ss01_kept(self):
        tags = set()
        if 'GSUB' in self.font:
            fl = self.font['GSUB'].table.FeatureList
            tags = {fr.FeatureTag for fr in (fl.FeatureRecord if fl else [])}
        self.assertNotIn('dlig', tags, 'no dlig feature')
        self.assertIn('ss01', tags, 'ss01 is kept so the classic Л/Д demonstration works')

    def test_derived_from_retail_1_0(self):
        name = self.font['name']
        version = name.getDebugName(5) or ''
        family = {name.getDebugName(1) or '', name.getDebugName(16) or ''}
        self.assertRegex(version, r'^Version 1\.000(?![\d])', 'name ID 5 is Version 1.000')
        self.assertIn('Tembrava Display Retail', family, 'family Tembrava Display Retail')
        for rec in name.names:
            try:
                text = rec.toUnicode()
            except Exception:
                continue
            self.assertNotRegex(text, PRIVATE, f'name ID {rec.nameID}: no private paths')

    def test_only_font_file_published(self):
        fonts = sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
                       if p.is_file() and '.git' not in p.parts and 'node_modules' not in p.parts
                       and p.suffix.lower() in {'.woff2', '.woff', '.otf', '.ttf', '.eot'}
                       and 'tembrava' in p.name.lower())
        self.assertEqual(fonts, [self.url.lstrip('/')], 'the subset is the only Tembrava font file in the repository')


if __name__ == '__main__':
    unittest.main(verbosity=2)
