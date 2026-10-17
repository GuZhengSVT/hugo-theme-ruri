"""Public shelf parsing, complete pagination, and failed-import snapshot preservation."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('neodb_import', ROOT / 'scripts/import-neodb.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture(category, number=1, next_page=False):
    return f'''<main class="grid__main"><article class="item-card">
<div class="cover"><img src="/cover.jpg"/></div>
<hgroup><h5><a href="/{category}/item{number}">Title &amp; {number}</a></h5></hgroup>
<div class="brief"><div class="multi-fields"><span>Author</span></div></div>
<div class="full">Work synopsis, not the user's review</div>
<div class="card-rating"><b>★ 8.6</b></div>
<footer><div class="mark-line"><span class="rating-star" data-rating="9.0"></span>
<span class="mark-date">2026-10-17</span></div>
<div class="mark-comment"><p>My comment &lt;script&gt; text</p></div></footer>
</article>{'<a href="?page=2">Next</a>' if next_page else ''}</main>'''


items, next_url = module.parse_shelf(fixture('book', next_page=True),
                                    'https://example.org/users/test/complete/book/', 'book', 'complete')
assert next_url == 'https://example.org/users/test/complete/book/?page=2'
assert items[0]['title'] == 'Title & 1'
assert items[0]['cover'] == 'https://example.org/cover.jpg'
assert items[0]['rating'] == 9 and items[0]['community_rating'] == 8.6
assert items[0]['comment'] == 'My comment <script> text'
assert items[0]['status'] == 'complete'
assert module.parse_shelf('<main class="grid__main">Nothing so far.</main>', next_url, 'book', 'complete') == ([], None)
try:
    module.parse_shelf('<h1>Challenge / Login</h1>', next_url, 'book', 'complete')
    raise AssertionError('Unexpected page accepted as empty collection')
except ValueError:
    pass

calls = []


def read(url):
    calls.append(url)
    if '/complete/' in url:
        return fixture('book', number=2) if '?page=2' in url else fixture('book', next_page=True)
    return '<main class="grid__main">Nothing so far.</main>'


result = module.import_profile('https://example.org/users/test/', ['book'], read)
assert len(calls) == 5
assert [item['id'] for item in result['categories']['book']] == ['item1', 'item2']
with tempfile.TemporaryDirectory() as directory:
    output = Path(directory) / 'collections'
    result['categories']['music'] = []
    module.write_pages(result, output)
    snapshot = output / 'book/all/1.json'
    assert len(json.loads(snapshot.read_text())['items']) == 2
    assert json.loads((output / 'music/all/1.json').read_text())['total'] == 0
    original = snapshot.read_bytes()
    result['updated_at'] = '2099-01-01T00:00:00+00:00'
    module.write_pages(result, output)
    assert snapshot.read_bytes() == original
    old = output / 'book/all/99.json'
    old.write_text('{}')
    result['categories']['book'][0]['title'] = 'Updated title'
    module.write_pages(result, output)
    assert not old.exists()
    result['categories']['game'] = [dict(items[0], id=str(n)) for n in range(25)]
    module.write_pages(result, output)
    assert len(json.loads((output / 'game/all/1.json').read_text())['items']) == 24
    assert len(json.loads((output / 'game/all/2.json').read_text())['items']) == 1
    snapshot.write_text('{"preserve":true}')
    process = subprocess.run(['python3', str(ROOT / 'scripts/import-neodb.py'), '--profile',
                              'http://invalid.example/users/test/', '--output-dir', str(output)], capture_output=True)
    assert process.returncode == 1 and json.loads(snapshot.read_text()) == {'preserve': True}
print('PASS NeoDB import: public cards, ratings, comments, empty/error distinction, full pagination, preserved snapshot')
