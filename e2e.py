import asyncio
from playwright.async_api import async_playwright
async def login(p,email):
    b=await p.chromium.launch(headless=True); pg=await b.new_page(viewport={"width":1280,"height":1800})
    await pg.goto("http://localhost:8080/auth"); await pg.wait_for_timeout(2500)
    await pg.fill("#email",email); await pg.fill("#password","CrimeDemo@2026"); await pg.click("button:has-text('Secure Login')"); await pg.wait_for_timeout(7000); return pg
async def main():
  async with async_playwright() as p:
    u=await login(p,"user@crimeconnect.demo"); print("user ->",u.url)
    await u.goto("http://localhost:8080/principal-dashboard"); await u.wait_for_timeout(4000); print("user tries principal ->",u.url)
    await u.goto("http://localhost:8080/report"); await u.wait_for_timeout(4000)
    await u.fill("#title","Suspicious Activity (Demo)"); await u.fill("#description","Suspicious activity reported near college parking area around 6 pm, near the two-wheeler stand.")
    await u.click("text=Continue"); await u.set_input_files("input[multiple]",["p0.jpg","p1.jpg"]); await u.wait_for_timeout(1500)
    await u.click("text=Continue"); await u.wait_for_timeout(1500); await u.click("text=Continue"); await u.click("text=Submit Report"); await u.wait_for_timeout(8000)
    print("submitted:", await u.locator("h2").first.inner_text())
    pr=await login(p,"principal@crimeconnect.demo"); print("principal ->",pr.url)
    await pr.wait_for_timeout(25000); await pr.goto("http://localhost:8080/principal-dashboard?view=all"); await pr.wait_for_timeout(4000)
    await pr.locator("button:has-text('Suspicious Activity (Demo)')").first.click(); await pr.wait_for_timeout(4000)
    await pr.screenshot(path="pr.png"); print("ai card:", await pr.locator("text=Evidence Level").count(), "photos:", await pr.locator("img[alt='Private incident evidence']").count())
asyncio.run(main())
