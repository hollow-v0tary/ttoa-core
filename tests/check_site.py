"""Static release audit. Run from any directory: python tests/check_site.py"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, re, sys
ROOT = Path(__file__).resolve().parents[1]
class Scan(HTMLParser):
    def __init__(self): super().__init__(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in {'a','link','img','script','source'}:
            v=a.get('href') or a.get('src')
            if v: self.refs.append((tag, v))

problems=[]
files=list(ROOT.glob('*.html'))
for f in files:
    content=f.read_text(encoding='utf8')
    parser=Scan();parser.feed(content)
    if len(re.findall(r'src="\./js/common\.js(?:\?[^"]+)?"', content)) != 1:problems.append((f.name, 'common.js should be included once'))
    for tag, ref in parser.refs:
        if ref.startswith(('#','mailto:','tel:','data:','javascript:','https:','http:','//')):continue
        path=unquote(urlsplit(ref).path)
        if not path:continue
        if not (f.parent / path).is_file(): problems.append((f.name,ref))
    for img in re.findall(r"\.\/assets\/[^'\"\s)]+",content):
        if img.endswith('...'):continue  # editor placeholder text, not a real URL
        if not (f.parent / img).is_file():problems.append((f.name,img))

try:
    lore=json.loads((ROOT/'data/world-lore.json').read_text(encoding='utf8'))
    count=sum(len(k.get('holidays',[])) for k in lore.values())
    assert len(lore)==5 and count == 26, (len(lore),count)
except Exception as e:problems.append(('world-lore.json',str(e)))

# CSS responsive breakpoints lost in a previous draft; explicitly guard them.
style=(ROOT/'css/styles.css').read_text(encoding='utf8')
for fragment in ['@media(max-width:1100px)','@media(max-width:760px)','prefers-reduced-motion:reduce','thaos-ash-sway']:
    if fragment not in style:problems.append(('styles.css',fragment))

print(f'Pages: {len(files)}; lore: 5 states, 26 holiday records; missing references: {len(problems)}')
for f,m in problems:print('ERROR',f,m)
sys.exit(bool(problems))
