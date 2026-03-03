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
            page.goto("http://localhost:3000/login")
            page.fill('input[type="email"]', 'teste@gmail.com')
            page.fill('input[type="password"]', '123456')
            page.click('button[type="submit"]')
            
            page.wait_for_timeout(3000)
            log(f"URL after SDR login attempt: {page.url}")
            
            if "login" in page.url:
                log("Failed to login as SDR. Check credentials.")
                err_loc = page.locator('.text-red-500, .bg-red-50').first
                if err_loc.is_visible():
                    log(f"Error on screen: {err_loc.text_content()}")
            else:
                page.wait_for_url("**/sdr/kanban**", timeout=15000)
                log("Successfully logged in as SDR.")
                
            browser.close()
            log("Browser closed cleanly.")
            
    except Exception as e:
        log(f"Test failed: {str(e)}")
        log(traceback.format_exc())
        
    with open("playwright_debug.log", "w", encoding="utf-8") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    run_tests()
