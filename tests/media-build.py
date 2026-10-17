"""Build real local/remote images and verify excerpts, responsive output and fallbacks."""
from pathlib import Path
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
from urllib.parse import urlsplit, unquote
import struct
import subprocess
import tempfile
import zlib

THEME = Path(__file__).resolve().parents[1]


def png(width, height):
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    pixels = (b'\0' + b'\x50\x80\xb0' * width) * height
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b''))


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.images = []
        self.meta = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img':
            self.images.append(attrs)
        elif tag == 'meta':
            self.meta[attrs.get('name') or attrs.get('property')] = attrs.get('content')


class Handler(SimpleHTTPRequestHandler):
    requests = []

    def do_GET(self):
        self.requests.append(self.path)
        super().do_GET()

    def log_message(self, *args):
        pass


with tempfile.TemporaryDirectory(prefix='ruri-media-') as directory:
    site = Path(directory)
    (site / 'themes').mkdir()
    (site / 'themes/ruri').symlink_to(THEME)
    (site / 'content/posts').mkdir(parents=True)
    (site / 'static').mkdir()
    (site / 'static/local.png').write_bytes(png(1000, 600))
    (site / 'static/tiny.png').write_bytes(png(80, 40))
    (site / 'static/mislabeled.jpg').write_bytes(png(100, 60))
    (site / 'static/vector.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(site / 'static')))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    remote = f'http://127.0.0.1:{server.server_port}'
    (site / 'hugo.toml').write_text('''baseURL="https://example.org/blog/"
title="Media fixture"
theme="ruri"
defaultContentLanguage="zh-cn"
hasCJKLanguage=true
[params]
description="SITE DESCRIPTION"
mainSections=["posts"]
[params.ruri]
favicon=""
[security.http]
urls=['^http://127[.]0[.]0[.]1:[0-9]+/']
mediaTypes=['^image/(jpeg|png|webp)$']
''')
    with (site / 'hugo.toml').open('a') as config:
        config.write(f'''\n[[params.ruri.images.remoteSources]]
prefix="https://cdn.example.net/CaseSensitive/"
origin="{remote}/"
''')
    opening = '正文开头，包含**粗体**与[链接](https://example.org/)。'
    body = opening + '这是需要自动截取的中文正文。' * 20
    (site / 'content/posts/auto.md').write_text(f'''---
title: Automatic excerpt
date: 2025-01-01
description: ""
cover: {remote}/local.png
---
{body}

![Remote & diagram]({remote}/local.png "Original diagram")
![Mapped](https://cdn.example.net/CaseSensitive//local.png)
![Small](/tiny.png)
![Mislabeled]({remote}/mislabeled.jpg)
![Vector](/vector.svg)
![Dynamic]({remote}/local.png?random=1)
![Missing]({remote}/missing.png)
''')
    (site / 'content/posts/manual.md').write_text('''---
title: Manual excerpt
date: 2025-01-02
description: "Manually chosen & accurate"
cover: /local.png
---
This body must not replace the manual description.
''')
    try:
        result = subprocess.run(['hugo', '--source', str(site)], check=True, capture_output=True, text=True)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    out = site / 'public'
    automatic = Page((out / 'posts/auto/index.html').read_text())
    manual = Page((out / 'posts/manual/index.html').read_text())
    home = Page((out / 'index.html').read_text())
    description = automatic.meta['description']
    assert description.startswith('正文开头，包含粗体与链接。'), description
    assert len(description) <= 81 and description.endswith('…'), description
    assert automatic.meta['og:description'] == description
    assert manual.meta['description'] == 'Manually chosen & accurate'
    assert home.meta['description'] == 'SITE DESCRIPTION'
    assert description in (out / 'index.html').read_text()
    remote_image = next(i for i in automatic.images if i.get('alt') == 'Remote & diagram')
    assert remote_image['loading'] == 'lazy' and remote_image['title'] == 'Original diagram'
    assert remote_image['src'].startswith('/blog/ruri-media/remote/') and remote_image['src'].endswith('.webp'), (remote_image, result.stdout, result.stderr)
    assert remote_image['data-original-src'].startswith('/blog/ruri-media/remote/')
    assert (out / remote_image['data-original-src'].removeprefix('/blog/')).read_bytes() == png(1000, 600)
    assert remote_image['data-original-width'] == '1000'
    assert remote_image['data-original-height'] == '600'
    assert remote_image['width'] == '1000' and remote_image['height'] == '600'
    assert next(i for i in automatic.images if i.get('alt') == 'Mapped')['src'] == remote_image['src']
    assert '480w' in remote_image['srcset'] and '960w' in remote_image['srcset']
    for variant in remote_image['srcset'].split(','):
        assert variant.strip().split()[0].startswith('/blog/ruri-media/remote/'), variant
    small = next(i for i in automatic.images if i.get('alt') == 'Small')
    assert small['width'] == '80' and small['height'] == '40'
    assert next(i for i in automatic.images if i.get('alt') == 'Mislabeled')['src'].endswith('.webp')
    assert next(i for i in automatic.images if i.get('alt') == 'Vector')['src'] == '/blog/vector.svg'
    dynamic = next(i for i in automatic.images if i.get('alt') == 'Dynamic')
    assert dynamic['src'] == remote + '/local.png?random=1' and 'srcset' not in dynamic
    assert next(i for i in automatic.images if i.get('alt') == 'Missing')['src'] == remote + '/missing.png'
    assert not any('random=' in url for url in Handler.requests), Handler.requests
    assert not list(out.glob('*_hu_*')), 'Image variants must not be published at the site root'
    for image in automatic.images:
        if image.get('data-original-width') and image.get('alt') != 'Small':
            assert image['data-original-src'].startswith('/blog/ruri-media/remote/'), image
    for image in home.images + automatic.images + manual.images:
        if 'src' not in image:
            continue
        urls = [image['src']] + [s.strip().split(' ')[0] for s in image.get('srcset', '').split(',') if s]
        for url in urls:
            if url.startswith('/blog/'):
                assert (out / unquote(urlsplit(url).path.removeprefix('/blog/'))).is_file(), url
    print('PASS automatic/manual excerpts, subpath images, remote/local WebP, srcset, dimensions, originals, dynamic/SVG/404 fallbacks')
