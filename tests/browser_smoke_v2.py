"""Optional browser smoke tests: pip install playwright; chromium required."""
import asyncio,re,os
from pathlib import Path
from playwright.async_api import async_playwright
W=Path(__file__).resolve().parents[1]
async def prepare(page):
 html=(W/'builder-demo.html').read_text()
 html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S)
 html=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>','',html)
 css='\n'.join((W/name).read_text() for name in ['css/styles.css','css/player.css','css/builder-v2.css'])
 await page.set_content(html.replace('</head>','<style>'+css+'</style></head>'),wait_until='domcontentloaded')
 for name in ['js/class-data.js','js/path-descriptions.js','js/race-data.js','js/world-data.js','js/balance-rules.js','js/thaos-builder-data.js','js/thaos-builder-engine.js','js/player-app-demo.js']:
  js=(W/name).read_text()
  if name.endswith('player-app.js'): js=re.sub(r'^import .*?;\n','',js,flags=re.M)
  await page.add_script_tag(content=js+'\n//# sourceURL='+name)
async def demo():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'), args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1365,'height':920},accept_downloads=True)
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  await prepare(page)
  assert await page.locator('.b2-step').count()==7
  await page.locator('#field-name').fill('Арден Ночной')
  await page.get_by_role('button',name='Продолжить').click()
  await page.locator('[data-action=level-direct][data-level="4"]').click()
  await page.get_by_role('button',name='Продолжить').click()
  await page.locator('[data-action=pick-race][data-id="elf"]').click()
  await page.get_by_role('button',name='Продолжить').click();await page.wait_for_timeout(230)
  await page.locator('[data-action=pick-class][data-id="warrior"]').click()
  await page.get_by_role('button',name='Продолжить').click()
  for i in [0,1,2]:
   await page.locator(f'[data-action=preview-base][data-skill="{i}"]').click()
   await page.locator(f'[data-action=toggle-base][data-skill="{i}"]').click()
  await page.locator('[data-action=choose-path][data-path="0"]').click()
  await page.locator('[data-action=preview-path][data-skill="0"]').click()
  await page.locator('[data-action=toggle-path][data-skill="0"]').click()
  await page.get_by_role('button',name='Продолжить').click()
  for name,target in [('Сила',3),('Ловкость',3),('Телосложение',2),('Интеллект',2)]:
   for _ in range(target-1):await page.locator(f'.b2-attr:has(span:text-is("{name}")) [data-action=attr-up]').click()
  await page.get_by_role('button',name='Продолжить').click()
  assert not await page.get_by_role('button',name='Сохранить персонажа?').is_disabled()
  async with page.expect_download() as downloaded: await page.get_by_role('button',name='Сохранить персонажа?').click()
  d=await downloaded.value
  await d.save_as('/tmp/thaos-v2-saved.json')
  import json
  char=json.load(open('/tmp/thaos-v2-saved.json'))
  assert char['schemaVersion']==2 and char['level']==4
  assert char['healthMax']==30 and char['manaMax']==8 and char['defense']==26
  assert char['progression']['levelHistory'][0]['kitId']=='warrior_guard'
  await page.get_by_role('button',name='Пересобрать').click()
  assert await page.locator('#field-name').input_value()=='Арден Ночной'
  assert not errors,errors
  await page.set_viewport_size({'width':390,'height':844})
  await page.locator('[data-action=edit-step][data-step="2"]').click()
  assert await page.locator('.b2-art-card').count()==12
  assert await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
  await page.locator('[data-action=edit-step][data-step="3"]').click()
  await page.wait_for_timeout(250)
  assert await page.locator('.b2-art-card').count()==13
  assert await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
  await page.locator('[data-action=edit-step][data-step="4"]').click()
  await page.locator('[data-action=edit-step][data-step="5"]').click()
  assert await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
  # Separate high-level summoner: automatic invocation, 7/8/9 progression and provisional True Class.
  await page.set_viewport_size({'width':1365,'height':920})
  await page.get_by_role('button',name='Отменить').click()
  await page.locator('[data-action=back-characters]').click()
  await page.locator('[data-action=new-character]').first.click()
  await page.locator('#field-name').fill('Наследник Уз')
  await page.get_by_role('button',name='Продолжить').click()
  await page.locator('[data-action=level-direct][data-level="10"]').click()
  await page.get_by_role('button',name='Продолжить').click()
  await page.locator('[data-action=pick-race][data-id="human"]').click()
  await page.get_by_role('button',name='Продолжить').click();await page.wait_for_timeout(240)
  await page.locator('[data-action=pick-class][data-id="summoner"]').click()
  await page.get_by_role('button',name='Продолжить').click()
  assert 'Призыв Слуги' in await page.locator('.b2-auto-skill').inner_text()
  assert await page.locator('[data-action=preview-base]').count()==4
  for i in [0,1,2]:
   await page.locator(f'[data-action=preview-base][data-skill="{i}"]').click()
   await page.locator(f'[data-action=toggle-base][data-skill="{i}"]').click()
  await page.locator('[data-action=choose-path][data-path="0"]').click()
  for i in [0,1]:
   await page.locator(f'[data-action=preview-path][data-skill="{i}"]').click()
   await page.locator(f'[data-action=toggle-path][data-skill="{i}"]').click()
  assert await page.locator('.b2-true-class').count()==1
  await page.get_by_role('button',name='Продолжить').click()
  for name,target in [('Сила',3),('Ловкость',3),('Телосложение',2),('Интеллект',2)]:
   for _ in range(target-1):await page.locator(f'.b2-attr:has(span:text-is("{name}")) [data-action=attr-up]').click()
  for level,attr in [(5,'Сила'),(7,'Ловкость'),(9,'Мудрость')]:
   await page.locator(f'select[data-boost-level="{level}"]').select_option(attr)
  await page.get_by_role('button',name='Продолжить').click()
  assert await page.locator('.b2-warning').count()>=1
  assert not await page.get_by_role('button',name='Сохранить персонажа?').is_disabled()
  async with page.expect_download() as downloaded2: await page.get_by_role('button',name='Сохранить персонажа?').click()
  d2=await downloaded2.value
  await d2.save_as('/tmp/thaos-v2-summoner.json')
  summoner=json.load(open('/tmp/thaos-v2-summoner.json'))
  assert summoner['level']==10
  assert summoner['progression']['breakthroughCompleted'] is False
  assert 'Призыв Слуги' not in summoner['baseSkills']
  assert summoner['attributes']['Сила']==4 and summoner['attributes']['Ловкость']==4
  assert summoner['manaMax']==27
  print('Browser smoke: 7 steps, 13 classes, 12 races, JSON V2, V2 edit, lvl10 Summoner, mobile: PASS')
  await browser.close()
if __name__=='__main__':asyncio.run(demo())
