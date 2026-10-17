"""Bangumi public API and Douban public collections/export adapters."""
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import quote, urljoin, urlsplit
from collection_data import Document, fetch

BANGUMI_TYPES = {'book': 1, 'anime': 2, 'music': 3, 'game': 4}
BANGUMI_SHELVES = {1: 'wishlist', 2: 'complete', 3: 'progress', 4: 'onhold', 5: 'dropped'}
DOUBAN_HOSTS = {'book': 'book.douban.com', 'movie': 'movie.douban.com',
                'music': 'music.douban.com', 'game': 'www.douban.com'}
DOUBAN_SHELVES = {'wish': 'wishlist', 'do': 'progress', 'collect': 'complete'}


def import_bangumi(username, categories, read=fetch):
    if not username:
        raise ValueError('culture.bangumi.username is empty')
    result = dict(source='Bangumi', profile='https://bgm.tv/user/' + quote(username),
                  updated_at=datetime.now(timezone.utc).isoformat(), categories={},
                  shelves=list(BANGUMI_SHELVES.values()))
    for category in categories:
        records, offset = [], 0
        while True:
            url = f'https://api.bgm.tv/v0/users/{quote(username)}/collections?subject_type={BANGUMI_TYPES[category]}&limit=50&offset={offset}'
            page = json.loads(read(url))
            if not isinstance(page.get('data'), list) or not isinstance(page.get('total'), int):
                raise ValueError('Invalid Bangumi collection response')
            for row in page['data']:
                if row.get('private'):
                    continue
                subject = row.get('subject') or {}
                records.append(dict(id=str(row['subject_id']),
                    title=subject.get('name_cn') or subject.get('name') or str(row['subject_id']),
                    url=f'https://bgm.tv/subject/{row["subject_id"]}',
                    cover=(subject.get('images') or {}).get('common', ''),
                    subtitle=subject.get('name', ''), status=BANGUMI_SHELVES[row['type']],
                    rating=row.get('rate') or None, community_rating=subject.get('score') or None,
                    comment=row.get('comment') or '', marked_at=row.get('updated_at', ''),
                    progress=dict(watched=row.get('ep_status', 0), total=subject.get('eps', 0))
                    if category == 'anime' and row['type'] == 3 else None))
            offset += len(page['data'])
            if offset >= page['total']:
                break
            if not page['data']:
                raise ValueError('Bangumi pagination ended before total')
        result['categories'][category] = records
    return result


def douban_profile(username):
    return 'https://www.douban.com/people/' + quote(username) + '/'


def parse_douban(html, page_url, category, shelf):
    root = Document(html).root
    # Login/challenge/error pages must never become successful empty collections.
    main = root.first(cls='article')
    if not main.tag:
        raise ValueError('Douban did not return a public collection page (login/challenge may be required)')
    cards = [node for node in main.find() if any(cls in node.attrs.get('class', '').split()
             for cls in ['item', 'subject-item'])]
    records, seen = [], set()
    for card in cards:
        links = [a for a in card.find('a') if re.search(r'/(?:subject|game)/\d+', a.attrs.get('href', ''))]
        heading = next((a for a in links if a.text()), None)
        if heading is None:
            continue
        url = urljoin(page_url, heading.attrs['href'])
        identity = re.search(r'/(?:subject|game)/(\d+)', url).group(1)
        if identity in seen:
            continue
        seen.add(identity)
        image = card.first('img').attrs.get('src', '')
        stars = next((re.search(r'rating([1-5])-t', n.attrs.get('class', ''))
                      for n in card.find('span') if re.search(r'rating([1-5])-t', n.attrs.get('class', ''))), None)
        records.append(dict(id=identity, title=heading.text(), url=url,
            cover=urljoin(page_url, image) if image else '',
            subtitle=card.first(cls='intro').text() or card.first(cls='pub').text(),
            status=shelf, rating=int(stars.group(1)) * 2 if stars else None,
            community_rating=None, comment=card.first(cls='comment').text(),
            marked_at=card.first(cls='date').text()))
    zero_count = any(re.search(r'[（(]\s*0\s*[）)]', root.first(tag).text()) for tag in ['title', 'h1'])
    if not records and not zero_count and not any(value in main.text() for value in ['还没有', '暂无', '没有找到', '0部', '0本', '0张', '0个']):
        raise ValueError('Unrecognized or incomplete Douban collection page')
    next_container = root.first(cls='next')
    next_link = next_container if next_container.tag == 'a' else next_container.first('a')
    return records, urljoin(page_url, next_link.attrs['href']) if next_link.attrs.get('href') else None


def import_douban(username, categories, export_file=None, read=fetch):
    if not username:
        raise ValueError('culture.douban.user is empty')
    result = dict(source='Douban', profile=douban_profile(username),
                  updated_at=datetime.now(timezone.utc).isoformat(), categories={})
    if export_file:
        data = json.loads(Path(export_file).read_text())
        # Raw JSON from the public douban-books-movies-music-exporter userscript.
        if isinstance(data, list):
            grouped = {}
            states = {'想读': 'wishlist', '想看': 'wishlist', '想听': 'wishlist', '想玩': 'wishlist',
                      '在读': 'progress', '在看': 'progress', '在听': 'progress', '在玩': 'progress',
                      '读过': 'complete', '看过': 'complete', '听过': 'complete', '玩过': 'complete'}
            for row in data:
                category = row.get('media')
                state = states.get(row.get('status'))
                if category not in DOUBAN_HOSTS or not state:
                    raise ValueError('Unknown Douban export media/status')
                grouped.setdefault(category, []).append(dict(id=str(row.get('subjectId', '')),
                    title=row.get('title', ''), url=row.get('link', ''), cover=row.get('cover', ''),
                    status=state, rating=float(row['myRating']) * 2 if row.get('myRating') else None,
                    community_rating=float(row['doubanRating']) if row.get('doubanRating') else None,
                    subtitle=row.get('creators') or row.get('intro', ''),
                    comment=row.get('comment', ''), marked_at=row.get('markedAt', '')))
            data = dict(categories=grouped)
        if 'categories' not in data:
            raise ValueError('Douban export must contain a categories object; see the documented JSON schema')
        for category in categories:
            rows = data['categories'].get(category)
            if not isinstance(rows, list):
                raise ValueError(f'Douban export has no {category} list')
            for row in rows:
                if not all(key in row for key in ['id', 'title', 'url', 'status']) or row['status'] not in ['wishlist', 'progress', 'complete', 'dropped']:
                    raise ValueError('Invalid Douban export item')
                host = urlsplit(row['url']).hostname or ''
                if urlsplit(row['url']).scheme != 'https' or not (host == 'douban.com' or host.endswith('.douban.com')):
                    raise ValueError('Douban export item must link to Douban over HTTPS')
            result['categories'][category] = rows
        return result
    for category in categories:
        records = []
        for status, shelf in DOUBAN_SHELVES.items():
            path = f'/people/{quote(username)}/{status}' if category != 'game' else f'/people/{quote(username)}/games?action={status}'
            url, visited = f'https://{DOUBAN_HOSTS[category]}{path}', set()
            while url:
                if url in visited:
                    raise ValueError('Repeated Douban pagination URL')
                visited.add(url)
                items, url = parse_douban(read(url), url, category, shelf)
                records.extend(items)
        result['categories'][category] = records
    return result
