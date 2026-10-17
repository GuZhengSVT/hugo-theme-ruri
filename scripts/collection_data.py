"""Shared public collection parsing, transport and stable paginated snapshots."""
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def find(self, tag=None, cls=None):
        for child in self.children:
            if not isinstance(child, Node):
                continue
            if (not tag or child.tag == tag) and (not cls or cls in child.attrs.get('class', '').split()):
                yield child
            yield from child.find(tag, cls)

    def text(self):
        return ' '.join(' '.join(c.text() if isinstance(c, Node) else c for c in self.children).split())

    def first(self, tag=None, cls=None):
        return next(self.find(tag, cls), Node())


class Document(HTMLParser):
    void = set('area base br col embed hr img input link meta param source track wbr'.split())

    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in self.void:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.void:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def fetch(url):
    # Download compressed responses into a file so retries cannot concatenate partial pages.
    with tempfile.TemporaryDirectory(prefix='ruri-neodb-') as directory:
        page = Path(directory) / 'page.html'
        subprocess.run([
            'curl', '--fail', '--silent', '--show-error', '--location', '--compressed',
            '--max-time', '20', '--retry', '2', '--retry-all-errors', '--retry-delay', '1',
            '--user-agent', 'Ruri-Collections/1.0 (+https://github.com/GuZhengSVT/hugo-theme-ruri)',
            '--header', 'Accept-Language: zh-CN,en;q=0.5', '--output', str(page), url,
        ], check=True)
        return page.read_text()


def write_pages(result, output):
    """Update current pages only; preserve timestamps when content is unchanged."""
    output = Path(output)
    for category, records in result['categories'].items():
        folder = output / category
        first = folder / 'all/1.json'
        identity = dict(source=result.get('source', 'NeoDB'), profile=result.get('profile', ''))
        unavailable = bool(result.get('unavailable'))
        previous = None
        if first.is_file():
            previous = json.loads(first.read_text())
            old_records = [item for page in range(1, previous['pages'] + 1)
                           for item in json.loads((folder / 'all' / f'{page}.json').read_text())['items']]
            if (old_records == records and all(previous.get(k) == v for k, v in identity.items())
                    and bool(previous.get('unavailable')) == unavailable):
                continue
        stamp = result.get('updated_at') or datetime.now(timezone.utc).isoformat()
        shelves = result.get('shelves', ['wishlist', 'progress', 'complete', 'dropped'])
        expected = set()
        with tempfile.TemporaryDirectory(prefix='ruri-collection-') as directory:
            stage = Path(directory)
            for shelf in ['all'] + shelves:
                items = [item for item in records if shelf == 'all' or item['status'] == shelf]
                pages = max(1, (len(items) + 23) // 24)
                for page in range(1, pages + 1):
                    relative = Path(shelf) / f'{page}.json'
                    expected.add(relative)
                    target = stage / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    payload = dict(identity, updated_at=stamp, total=len(items), pages=pages,
                                   items=items[(page - 1) * 24:page * 24])
                    if unavailable:
                        payload['unavailable'] = True
                    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
            for relative in expected:
                target = folder / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_suffix('.tmp')
                temporary.write_bytes((stage / relative).read_bytes())
                temporary.replace(target)
            for old in folder.rglob('*.json'):
                if old.relative_to(folder) not in expected:
                    old.unlink()
