import os
from google import genai

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", "AIzaSyBVOr9Xx9jMK9o9UEI0EGoGNfJiHga5dPc"))

models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.0-pro"]
for m in models:
    try:
        response = client.models.generate_content(
            model=m,
            contents='Tell me a joke.'
        )
        print(f"SUCCESS with {m}: {response.text}")
        break
    except Exception as e:
        print(f"FAILED with {m}: {e}")
