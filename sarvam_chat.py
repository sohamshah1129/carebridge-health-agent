import os
from pathlib import Path

from sarvamai import SarvamAI

for line in Path(__file__).with_name(".env").read_text().splitlines():
    name, separator, value = line.partition("=")
    if separator and name.strip() == "SARVAM_API_KEY":
        os.environ.setdefault(name.strip(), value.strip().strip("\"'"))

api_key = os.getenv("SARVAM_API_KEY")
if not api_key:
    raise SystemExit("Set SARVAM_API_KEY in .env before running this script.")

client = SarvamAI(api_subscription_key=api_key)
response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Reply with a brief greeting."}],
)
print(response.choices[0].message.content)
