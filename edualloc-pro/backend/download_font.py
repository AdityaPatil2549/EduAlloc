"""Download NotoSansDevanagari-Regular.ttf using Google Fonts API."""
import urllib.request
import os

# Google Fonts API gives the correct CDN URL
API_URL = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari&display=swap"
headers = {"User-Agent": "Mozilla/5.0"}

req = urllib.request.Request(API_URL, headers=headers)
with urllib.request.urlopen(req) as r:
    css = r.read().decode()

# Extract .ttf URL from the CSS
import re
ttf_urls = re.findall(r"url\((https://fonts.gstatic.com/[^)]+\.ttf)\)", css)
if not ttf_urls:
    ttf_urls = re.findall(r"src: url\((https://[^)]+)\)", css)

print("Found URLs:", ttf_urls)

if ttf_urls:
    font_url = ttf_urls[0]
    print(f"Downloading: {font_url}")
    os.makedirs("utils/fonts", exist_ok=True)
    req2 = urllib.request.Request(font_url, headers=headers)
    with urllib.request.urlopen(req2) as r2:
        data = r2.read()
    with open("utils/fonts/NotoSansDevanagari-Regular.ttf", "wb") as f:
        f.write(data)
    print(f"Saved {len(data)} bytes to utils/fonts/NotoSansDevanagari-Regular.ttf")
else:
    print("No TTF URL found in CSS, trying direct download...")
    direct = "https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGoUUFzXI5FBtUq5a8bjKYTZjtgKqD6x6bNEV3dn0c.ttf"
    req3 = urllib.request.Request(direct, headers=headers)
    with urllib.request.urlopen(req3) as r3:
        data = r3.read()
    with open("utils/fonts/NotoSansDevanagari-Regular.ttf", "wb") as f:
        f.write(data)
    print(f"Saved {len(data)} bytes")
