"""Static test for THAOS Director V1 (no Firebase access required)."""
from pathlib import Path
from html.parser import HTMLParser
import re, json, subprocess
root=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag in ('script','link','a') and (a.get('src') or a.get('href')):self.refs.append(a.get('src') or a.get('href'))
for file in ('director.html','director-demo.html','account.html','admin.html'):
 page=Links();page.feed((root/file).read_text());missing=[]
 for url in page.refs:
  if url.startswith(('https:','http:','#','mailto:','data:')):continue
  if not (root/url.split('?',1)[0].split('#',1)[0]).exists():missing.append(url)
 assert not missing,(file,missing)
 assert len(page.ids)==len(set(page.ids)),('duplicate IDs',file)
for file in ('js/director.js','js/director-demo.js','js/admin.js','js/account-page.js'):
 result=subprocess.run(['node','--check',str(root/file)],capture_output=True,text=True)
 assert result.returncode==0,(file,result.stderr)
html=(root/'director.html').read_text();demo=(root/'director-demo.html').read_text();rules=(root/'firestore.rules').read_text();code=(root/'js/director.js').read_text()
assert 'data-director-demo="true"' not in html
assert 'data-director-demo="true"' in demo
assert 'type="module" src="./js/director.js"' in html
assert '<script src="./js/director-demo.js"' in demo
for path in ('siteAdmins','directorDrafts','siteContent'):
 assert path in rules,path
assert 'allow get, list: if siteAdmin();' in rules
assert "allow create, update: if siteAdmin()" in rules
assert "allow delete: if siteAdmin();" in rules
assert "allow list, create, update, delete: if false;" in rules # cannot self-assign role
assert 'state.allowed=true' in code and 'onAuthStateChanged' in code
assert 'textContent' in code and 'innerHTML' not in code # no HTML injection in draft preview
assert 'localStorage' in (root/'js/director-demo.js').read_text()
assert 'directorAccountLink' in (root/'account.html').read_text()
print('DIRECTOR STATIC PASS: pages, references, IDs, JS syntax, role rules, safe preview, demo mode')
