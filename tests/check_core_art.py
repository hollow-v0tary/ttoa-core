from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
MODULES=('checks','character','movement','combat','magic','states','gear','progression')
class Parser(HTMLParser):
    def __init__(self): super().__init__();self.images=[]
    def handle_starttag(self,tag,attrs):
        if tag=='img': self.images.append(dict(attrs))
for page in ('core.html',*(f'core-{m}.html' for m in MODULES)):
    p=Parser();p.feed((ROOT/page).read_text())
    assert all((ROOT/img['src'].split('?')[0]).exists() for img in p.images if img.get('src','').startswith('./assets/core/')), page
    if page=='core.html':
        assert len([i for i in p.images if 'rule-module__art' in i.get('class','')])==8,page
    else:
        mod=page[5:-5]
        assert any(f'assets/core/{mod}.webp' in i.get('src','') and 'rule-hero__art' in i.get('class','') for i in p.images),page
print('All eight card and eight hero image elements resolve to local WebP files.')
