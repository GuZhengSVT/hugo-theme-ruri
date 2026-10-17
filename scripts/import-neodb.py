#!/usr/bin/env python3
"""Import anonymous public NeoDB shelves into paginated static JSON."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import re
import sys
from urllib.parse import parse_qs, quote, urljoin, urlsplit
from collection_data import Document, fetch, write_pages

def parse_shelf(html, page_url, category, shelf):
    root = Document(html).root
    if not root.first(cls='grid__main').tag:
        raise ValueError('NeoDB did not return a public shelf page')
    items = []
    for card in root.find('article', 'item-card'):
        heading = card.first('hgroup').first('h5').first('a')
        href = heading.attrs.get('href', '')
        if not href.startswith('/' + category + '/') or not heading.text():
            raise ValueError('Unrecognized NeoDB collection card')
        cover = card.first(cls='cover').first('img').attrs.get('src', '')
        community = card.first(cls='card-rating').first('b').text()
        stars = card.first(cls='mark-line').first(cls='rating-star').attrs.get('data-rating')
        # Mark comments are separate from the work's synopsis in .full.
        footer = card.first('footer')
        comments = [n.text() for n in footer.find(cls='mark-comment')]
        brief = card.first(cls='brief').first(cls='multi-fields')
        first_field = brief.first('span').text()
        match = re.search(r'[0-9]+(?:\.[0-9]+)?', community)
        items.append(dict(
            id=href.rstrip('/').split('/')[-1], title=heading.text(),
            url=urljoin(page_url, href), cover=urljoin(page_url, cover) if cover else '',
            subtitle=first_field, status=shelf,
            rating=float(stars) if stars else None,
            community_rating=float(match.group()) if match else None,
            comment='\n'.join(comments), marked_at=card.first(cls='mark-date').text(),
        ))
    current = int(parse_qs(urlsplit(page_url).query).get('page', ['1'])[0])
    candidates = []
    for link in root.find('a'):
        target = urljoin(page_url, link.attrs.get('href', ''))
        if urlsplit(target).path != urlsplit(page_url).path:
            continue
        value = parse_qs(urlsplit(target).query).get('page', [''])[0]
        if value.isdigit() and int(value) > current:
            candidates.append((int(value), target))
    return items, min(candidates)[1] if candidates else None


def import_profile(profile, categories, read=fetch):
    parsed = urlsplit(profile)
    match = re.fullmatch(r'/users/([^/]+)/?', parsed.path)
    if parsed.scheme != 'https' or not parsed.netloc or not match or parsed.query or parsed.fragment:
        raise ValueError('Expected an HTTPS NeoDB profile URL: https://instance/users/username/')
    origin = f'https://{parsed.netloc}'
    username = match.group(1)
    result = dict(source='NeoDB', profile=profile,
                  updated_at=datetime.now(timezone.utc).isoformat(), categories={})
    for category in categories:
        records = []
        for shelf in ['wishlist', 'progress', 'complete', 'dropped']:
            url = f'{origin}/users/{quote(username)}/{shelf}/{category}/'
            visited = set()
            while url:
                if url in visited:
                    raise ValueError('Repeated NeoDB pagination URL')
                visited.add(url)
                print(f'Reading {category}/{shelf}, page {len(visited)}', flush=True)
                items, url = parse_shelf(read(url), url, category, shelf)
                records.extend(items)
        result['categories'][category] = records
        print(f'{category}: {len(records)} public records', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', required=True)
    parser.add_argument('--output-dir', type=Path, default=Path('static/collections/neodb'))
    parser.add_argument('--categories', nargs='+', choices=['book', 'movie', 'music', 'game'], default=['book', 'movie', 'game'])
    args = parser.parse_args()
    try:
        result = import_profile(args.profile, args.categories)
        write_pages(result, args.output_dir)
        print(f'Saved paginated collections to {args.output_dir}')
    except Exception as error:
        print(f'NeoDB import failed; existing snapshot preserved: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
