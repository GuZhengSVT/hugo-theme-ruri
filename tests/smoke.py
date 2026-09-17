"""Portable build checks. Requires Python 3 and Hugo Extended 0.162.1+."""
from pathlib import Path
import tempfile, shutil, subprocess, json
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
THEME = Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.urls=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in ('a','img','script','link'):
            value=attrs.get('href') if tag in ('a','link') else attrs.get('src')
            if value:self.urls.append(value)
def build(site, prefix=''):
    subprocess.run(['hugo','--source',str(site),'--destination',str(site/'public'),'--cleanDestinationDir'],check=True,stdout=subprocess.DEVNULL)
    out=site/'public'; broken=set()
    for page in out.rglob('*.html'):
        parser=Links();parser.feed(page.read_text())
        for url in parser.urls:
            u=urlsplit(url)
            if u.scheme or u.netloc or not u.path.startswith('/'):continue
            path=unquote(u.path)
            if prefix:assert path.startswith(prefix),url;path=path[len(prefix):]
            dest=out/path.lstrip('/')
            if not dest.is_file() and not (dest/'index.html').is_file():broken.add(url)
    assert not broken,broken
    return out
with tempfile.TemporaryDirectory(prefix='ruri-smoke-') as d:
    base=Path(d)
    for kind in ['minimal','example','subpath']:
        site=base/kind
        if kind=='minimal':
            (site/'content/posts').mkdir(parents=True)
            (site/'hugo.toml').write_text(chr(10).join(['baseURL="https://example.org/"', 'title="Minimal"', 'theme="ruri"']))
            (site/'content/posts/hello.md').write_text(chr(10).join(['---','title: Hello','date: 2025-01-01','---','Hello world.']))
        else:shutil.copytree(THEME/'exampleSite',site)
        (site/'themes').mkdir();(site/'themes/ruri').symlink_to(THEME)
        if kind=='subpath':
            config=site/'hugo.toml';config.write_text(config.read_text().replace('https://example.org/','https://example.org/blog/'))
        with (site/'hugo.toml').open('a') as f:
            if kind=='minimal':f.write(chr(10)+'[outputs]'+chr(10)+'home=["HTML","RSS","JSON"]'+chr(10))
        out=build(site,'/blog/' if kind=='subpath' else '')
        if kind=='minimal':
            assert len(json.loads((out/'index.json').read_text()))==1
        else:
            for lang in ['en','zh-cn','zh-tw','ja']:
                assert (out/lang/'archives/index.html').exists()
                assert 'id="heatmap"' in (out/lang/'archives/index.html').read_text()
                assert len(json.loads((out/lang/'index.json').read_text()))==2
        print('PASS',kind)
