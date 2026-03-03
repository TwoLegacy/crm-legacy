import os
import time
import sys
from playwright.sync_api import sync_playwright

def run_tests():
    print("Starting tests...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            # 1. Login as SDR
            print("Logging in as SDR...")
            page.goto("http://localhost:3000/login")
            page.fill('input[type="email"]', 'teste@gmail.com')
            page.fill('input[type="password"]', '123456')
            page.click('button[type="submit"]')
            
            # Wait a bit and check url
            page.wait_for_timeout(3000)
            print(f"URL after SDR login attempt: {page.url}")
            
            if "login" in page.url:
                print("Failed to login as SDR. Check credentials.")
                # Maybe there is an error message on screen
                err_loc = page.locator('.text-red-500, .bg-red-50').first
                if err_loc.is_visible():
                    print(f"Error on screen: {err_loc.text_content()}")
            else:
                # Wait for dashboard/kanban to load
                page.wait_for_url("**/sdr/kanban**", timeout=15000)
                print("Successfully logged in as SDR.")
                
                page.wait_for_selector('h1', timeout=5000)
                print(f"SDR Page h1: {page.locator('h1').first.text_content()}")
                
                # 3. Check Agenda
                print("Navigating to Agenda...")
                page.goto("http://localhost:3000/agenda")
                page.wait_for_selector('h1', timeout=10000)
                print("Agenda loaded successfully.")
            
            # 4. Logout
            print("Logging out...")
            context.clear_cookies()
            page.evaluate("window.localStorage.clear()")
            page.evaluate("window.sessionStorage.clear()")
            page.goto("http://localhost:3000/login", wait_until="networkidle")
            
            # 5. Login as Closer
            print("Logging in as Closer...")
            page.fill('input[type="email"]', 'closer@gmail.com')
            page.fill('input[type="password"]', '123456')
            page.click('button[type="submit"]')
            
            page.wait_for_timeout(3000)
            print(f"URL after Closer login attempt: {page.url}")
            
            if "login" in page.url:
                print("Failed to login as Closer. Check credentials.")
                err_loc = page.locator('.text-red-500, .bg-red-50').first
                if err_loc.is_visible():
                    print(f"Error on screen: {err_loc.text_content()}")
            else:
                page.wait_for_url("**/closer/kanban**", timeout=15000)
                print("Successfully logged in as Closer.")
                
                page.wait_for_selector('h1', timeout=5000)
                print(f"Closer Page h1: {page.locator('h1').first.text_content()}")
                
                # 7. Open Agenda
                print("Navigating to Agenda...")
                page.goto("http://localhost:3000/agenda")
                page.wait_for_selector('h1', timeout=10000)
                print("Closer Agenda loaded successfully.")
            
            print("All test steps completed!")
            
        except Exception as e:
            print(f"Test failed: {str(e)}")
            page.screenshot(path="error_screenshot_verbose.png")
            print("Saved error screenshot to error_screenshot_verbose.png")
            
        finally:
            browser.close()

if __name__ == "__main__":
    run_tests()
