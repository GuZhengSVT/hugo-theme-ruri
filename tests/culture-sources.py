"""Provider adapters and stale-data behavior without contacting external services."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from culture_sources import import_bangumi, parse_douban, import_douban
from collection_data import write_pages

spec = importlib.util.spec_from_file_location('culture_sync', Path(__file__).resolve().parents[1] / 'scripts/sync-culture.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

calls = []
def bangumi(url):
    calls.append(url)
    rows = [dict(subject_id=1, type=3, ep_status=4, rate=8, private=False,
                 subject=dict(name='Original', name_cn='Title', eps=12, images=dict(common='https://example.org/cover.jpg'))),
            dict(subject_id=2, type=2, private=True, subject={})]
    return json.dumps(dict(total=2, data=rows))

result = import_bangumi('fixture', ['anime'], bangumi)
assert len(result['categories']['anime']) == 1
assert result['categories']['anime'][0]['progress'] == {'watched': 4, 'total': 12}
assert result['categories']['anime'][0]['status'] == 'progress'
assert len(calls) == 1

html = '''<div class="article"><div class="item"><div class="pic"><img src="/cover.jpg"></div>
<h2><a href="https://movie.douban.com/subject/123/">Movie &amp; title</a></h2>
<span class="rating4-t"></span><span class="date">2026-10-17</span><p class="comment">My comment &lt;b&gt;</p></div>
<span class="next"><a href="?start=15">Next</a></span></div>'''
items, next_page = parse_douban(html, 'https://movie.douban.com/people/fixture/collect', 'movie', 'complete')
assert items[0]['rating'] == 8 and items[0]['title'] == 'Movie & title'
assert items[0]['comment'] == 'My comment <b>'
assert next_page.endswith('?start=15')
assert parse_douban('<title>User played (0)</title><div class="article"></div>', 'https://www.douban.com/people/fixture/games?action=collect', 'game', 'complete') == ([], None)
try:
    parse_douban('<div class="article">请登录 / 验证码</div>', next_page, 'movie', 'complete')
    raise AssertionError('Challenge page accepted')
except ValueError:
    pass

with tempfile.TemporaryDirectory() as directory:
    site = Path(directory)
    export = site / 'douban.json'
    export.write_text(json.dumps(dict(categories=dict(movie=items))))
    imported = import_douban('fixture', ['movie'], export)
    assert imported['categories']['movie'] == items
    raw = site / 'raw.json'
    raw.write_text(json.dumps([dict(media='movie', status='看过', title='Raw export', subjectId='456', link='https://movie.douban.com/subject/456/', myRating='4')]))
    converted = import_douban('fixture', ['movie'], raw)['categories']['movie'][0]
    assert converted['rating'] == 8 and converted['status'] == 'complete'
    config = dict(enable=True, categories=['movie'], sources=dict(movie='douban'),
                  douban=dict(user='fixture', exportfile='douban.json'))
    assert sync.sync(config, site) == []
    first = site / 'static/collections/douban/movie/all/1.json'
    before = first.read_bytes()
    def fail(*args):
        raise RuntimeError('Upstream unavailable')
    assert sync.sync(config, site, {'douban': fail}) == ['douban']
    assert first.read_bytes() == before
    config['douban']['user'] = 'different-account'
    sync.sync(config, site, {'douban': fail})
    assert json.loads(first.read_text())['unavailable'] is True
    assert json.loads(first.read_text())['items'] == []
    assert sync.sync(dict(enable=False), site, {'douban': fail}) == []
print('PASS source adapters: Bangumi privacy/progress, Douban ratings/pagination/export/challenge, stale snapshots, account changes, disabled feature')
