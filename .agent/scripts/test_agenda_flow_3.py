import os
import time
import sys
import traceback
from playwright.sync_api import sync_playwright

def run_tests():
    output = []
    def log(msg):
        output.append(msg)
        print(msg)
        
    log("Starting tests...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            page = context.new_page()

            # 1. Login as SDR
            log("Logging in as SDR...")
            page.goto("http://localhost:3000/login", wait_until="commit")
            page.fill('input[type="email"]', 'teste@gmail.com')
            page.fill('input[type="password"]', '123456')
            page.click('button[type="submit"]')
            
            page.wait_for_timeout(3000)
            log(f"URL after SDR login attempt: {page.url}")
            
            if "login" in page.url:
                log("Failed to login as SDR. Check credentials.")
            else:
                # Wait for h1 directly instead of url navigation state
                page.wait_for_selector('h1:has-text("Painel")', timeout=15000)
                log("Successfully logged in as SDR (Kanban Loaded).")
                
                # 3. Check Agenda
                log("Navigating to Agenda as SDR...")
                page.goto("http://localhost:3000/agenda", wait_until="commit")
                page.wait_for_selector('h1:has-text("Agenda")', timeout=15000)
                log("Agenda loaded successfully.")
                page.wait_for_timeout(2000) # Give it time to render events

            # 4. Logout
            log("Logging out SDR...")
            context.clear_cookies()
            page.evaluate("window.localStorage.clear()")
            page.evaluate("window.sessionStorage.clear()")
            page.goto("http://localhost:3000/login", wait_until="commit")
            page.wait_for_timeout(2000)
            
            # 5. Login as Closer
            log("Logging in as Closer...")
            page.fill('input[type="email"]', 'closer@gmail.com')
            page.fill('input[type="password"]', '123456')
            page.click('button[type="submit"]')
            
            page.wait_for_timeout(3000)
            log(f"URL after Closer login attempt: {page.url}")
            
            if "login" in page.url:
                log("Failed to login as Closer. Check credentials.")
            else:
                page.wait_for_selector('h1:has-text("Painel")', timeout=15000)
                log("Successfully logged in as Closer (Kanban Loaded).")
                
                # 7. Check Closer Agenda
                log("Navigating to Agenda as Closer...")
                page.goto("http://localhost:3000/agenda", wait_until="commit")
                page.wait_for_selector('h1:has-text("Agenda")', timeout=15000)
                log("Closer Agenda loaded successfully.")
                page.wait_for_timeout(2000)

            log("All UI render tests passed successfully!")
            
    except Exception as e:
        log(f"Test failed: {str(e)}")
        log(traceback.format_exc())
        
    finally:
        browser.close()
        
    with open("playwright_debug.log", "w", encoding="utf-8") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    run_tests()
