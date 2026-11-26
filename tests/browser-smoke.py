from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,time
root=Path(__file__).resolve().parents[1]
p=subprocess.Popen(['python','-m','http.server','8767','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(.8)
try:
 with sync_playwright() as play:
  browser=play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
  page=browser.new_page(viewport={'width':1366,'height':900})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('http://127.0.0.1:8767/class.html?id=rogue',wait_until='domcontentloaded',timeout=12000)
  page.locator('.class-skill-chip',has_text='Слабое место').click()
  assert '1 наложения на одну цель за раунд' in page.locator('#peekSkillDescription').inner_text()
  page.locator('#openClassSkills').click()
  page.locator('#baseSkillNodes button.class-skill-node').nth(1).click()
  assert 'Механика:' in page.locator('#classSkillInspector').inner_text()
  assert 'Тестовая баланс-редакция' in page.locator('#classSkillInspector').inner_text()
  page.goto('http://127.0.0.1:8767/class.html?id=summoner',wait_until='domcontentloaded',timeout=12000)
  page.locator('.class-skill-chip',has_text='Призыв Слуги').click()
  assert 'автоматически' in page.locator('#peekSkillDescription').inner_text()
  page.goto('http://127.0.0.1:8767/core-combat.html',wait_until='domcontentloaded',timeout=12000)
  assert page.locator('text=Защита по типам бонусов').count()>=1
  assert page.locator('text=Баланс V1 · индивидуальные ограничения').count()>=1
  print('BROWSER: Rogue/Summoner skills, inspector, Core rules rendered.')
  print('JS page errors:',errors)
  if errors: raise RuntimeError(str(errors))
  browser.close()
finally:
 p.terminate();p.wait()
