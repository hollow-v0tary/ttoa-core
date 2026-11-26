"""Local browser test for Director V1 offline demo (no Firebase)."""
import http.server, socketserver, subprocess, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
class Reuse(socketserver.TCPServer): allow_reuse_address=True
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
with Reuse(('127.0.0.1',0),Handler) as server:
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url=f'http://127.0.0.1:{server.server_address[1]}'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1366,'height':920},accept_downloads=True)
        errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(url+'/director-demo.html',wait_until='domcontentloaded');page.locator('#directorApp').wait_for(state='visible',timeout=20000)
        assert page.locator('#directorModeTag').inner_text()=='DEMO / ЛОКАЛЬНЫЕ ДАННЫЕ'
        assert page.locator('.director-stat').count()==4
        page.locator('[data-view="registry"]').click()
        assert page.locator('.director-draft-item').count()==2
        page.locator('#draftCreate').click()
        page.locator('#draftKind').select_option('artifact')
        page.locator('#draftTitle').fill('Артефакт проверок')
        page.locator('#draftSlug').fill('audit-artifact')
        page.locator('#draftSummary').fill('Демо-артефакт для проверки')
        page.locator('#draftMechanic').fill('+2 к подходящей проверке, не складывается с одинаковым типом')
        page.locator('#blockAdd').click()
        page.locator('#directorBlocks select').first.select_option('heading')
        page.locator('#directorBlocks textarea').first.fill('Подробности применения')
        page.locator('#draftPreviewToggle').click()
        assert 'Подробности' in page.locator('#draftPreview').inner_text()
        page.locator('#draftSave').click()
        page.get_by_text('Запись сохранена в реестре',exact=False).wait_for(timeout=5000)
        assert page.locator('.director-draft-item').count()==3
        page.reload(wait_until='domcontentloaded');page.locator('#directorApp').wait_for(state='visible')
        page.locator('[data-view="registry"]').click()
        assert page.locator('.director-draft-item').count()==3
        page.locator('[data-view="settings"]').click()
        with page.expect_download() as dl: page.locator('#directorExportAll').click()
        assert dl.value.suggested_filename=='THAOS-Director-Registry.json'
        assert not errors,errors
        print('DESKTOP PASS: creation, edit, preview, persist, export, navigation')
        mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
        mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
        mobile.goto(url+'/director-demo.html',wait_until='domcontentloaded');mobile.locator('#directorApp').wait_for(state='visible')
        overflow=mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth + 3')
        mobile.locator('[data-view="registry"]').click()
        overflow2=mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth + 3')
        assert not overflow and not overflow2,(overflow,overflow2)
        assert not mobile_errors,mobile_errors
        print('MOBILE PASS: 390px no horizontal overflow, no JS errors')
        live=browser.new_page(viewport={'width':1366,'height':900})
        live.goto(url+'/director.html',wait_until='domcontentloaded')
        assert live.locator('#directorApp').is_hidden(),'Live Director was exposed without login'
        print('ACCESS PASS: live page gated before Firebase login')
        browser.close()
    server.shutdown()
