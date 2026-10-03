"""AC5 independent binary/page acceptance; stdlib only, authored before page implementation."""
from html.parser import HTMLParser
from pathlib import Path
import os
import hashlib
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(os.environ.get('TEMBRAVA_SITE_ROOT', str(Path(__file__).resolve().parents[1])))
LICENSE = ROOT / 'data/tembrava-license.txt'
LICENSE_SHA256 = '250b40c2ffdb8a74cf54e5f506d3f7303aedac4b5eb91b95b7717d75b1e08deb'
BASE = 'https://rusanivsky.com'
URLS = {'en':'/tembrava/license/', 'uk':'/ua/tembrava/license/'}


def norm(s): return re.sub(r'\s+', ' ', s).strip()


class Page(HTMLParser):
    def __init__(self, data):
        super().__init__(convert_charrefs=True)
        self.links=[]; self.anchors=[]; self.text=[]; self.headings=[]; self.html_lang=None
        self.title=[]; self.h1=[]; self.stack=[]; self.eula=[]; self.eula_lang=None; self.eula_depth=None
        self.feed(data)
    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.stack.append(tag)
        if tag=='html': self.html_lang=attr.get('lang')
        if tag=='link': self.links.append(attr)
        if tag=='a': self.anchors.append(attr)
        if tag=='h2': self.headings.append([])
        if attr.get('id')=='full-eula':
            self.eula_depth=len(self.stack); self.eula_lang=attr.get('lang')
    def handle_endtag(self, tag):
        if self.eula_depth==len(self.stack): self.eula_depth=None
        # HTML void tags are not part of content nesting.
        if tag in self.stack:
            self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        self.handle_endtag(tag)
    def handle_data(self, data):
        self.text.append(data)
        if 'title' in self.stack: self.title.append(data)
        if 'h1' in self.stack: self.h1.append(data)
        if 'h2' in self.stack and self.headings: self.headings[-1].append(data)
        if self.eula_depth is not None: self.eula.append(data)


def page(language):
    return Page((ROOT / URLS[language].strip('/') / 'index.html').read_text())


class LicensePageAcceptance(unittest.TestCase):
    def test_exact_license_download(self):
        self.assertEqual(hashlib.sha256(LICENSE.read_bytes()).hexdigest(), LICENSE_SHA256, 'original EULA 1.0 baseline')
        self.assertEqual((ROOT/'tembrava/license/LICENSE.txt').read_bytes(), LICENSE.read_bytes())

    def test_full_eula_both_pages_no_missing_clause(self):
        expected = norm(LICENSE.read_text())
        headings = re.findall(r'^\d+\. [A-Z][A-Z ]+$', LICENSE.read_text(), re.M)
        self.assertEqual(len(headings), 12, 'independent baseline sanity')
        for language in URLS:
            with self.subTest(language=language):
                p=page(language)
                self.assertEqual(p.html_lang, language)
                self.assertTrue('Tembrava' in ''.join(p.title))
                self.assertIn('Tembrava', ''.join(p.h1))
                text=norm(' '.join(p.eula or p.text))
                self.assertIn(expected, text, 'EULA preamble, 12 clauses and closing must remain complete and verbatim')
                h2=[norm(''.join(h)) for h in p.headings]
                self.assertTrue(all(h in h2 for h in headings), h2)
                if language=='uk': self.assertEqual(p.eula_lang,'en')
                self.assertTrue(any(a.get('href')=='/tembrava/license/LICENSE.txt' for a in p.anchors))

    def test_canonical_hreflang_and_switcher(self):
        for language, url in URLS.items():
            with self.subTest(language=language):
                p=page(language)
                self.assertTrue(any(l.get('rel')=='canonical' and l.get('href')==BASE+url for l in p.links))
                for other, href in URLS.items():
                    self.assertTrue(any(l.get('rel')=='alternate' and l.get('hreflang')==other and l.get('href')==BASE+href for l in p.links))
                self.assertTrue(any(l.get('rel')=='alternate' and l.get('hreflang')=='x-default' and l.get('href')==BASE+URLS['en'] for l in p.links))
                other='uk' if language=='en' else 'en'
                self.assertTrue(any(a.get('href') in (URLS[other],BASE+URLS[other]) for a in p.anchors), 'language switch missing')

    def test_sitemap_and_case_link_not_info(self):
        sitemap=ET.parse(ROOT/'sitemap.xml')
        locations={e.text for e in sitemap.iter() if e.tag.rsplit('}',1)[-1]=='loc'}
        license_hrefs={v for href in URLS.values() for v in (href,BASE+href)}
        for language, href in URLS.items():
            prefix='ua/' if language=='uk' else ''
            with self.subTest(language=language):
                self.assertIn(BASE+href,locations)
                info=Page((ROOT/(prefix+'aboutme/index.html')).read_text())
                self.assertFalse(any(a.get('href') in license_hrefs for a in info.anchors), 'Info must not link to license (owner decision, 3 October 2026)')
                case=Page((ROOT/(prefix+'work/wordmusic-design/index.html')).read_text())
                self.assertTrue(any(a.get('href') in (href,BASE+href) for a in case.anchors), 'word&music case page must link to its own-language license')

    def test_no_font_download_link_on_license_pages(self):
        for language in URLS:
            for a in page(language).anchors:
                self.assertFalse(re.search(r'\.(otf|ttf|woff2?)(?:[?#]|$)',a.get('href',''),re.I), 'license page must not expose font binaries')


if __name__=='__main__': unittest.main(verbosity=2)
