from pathlib import Path
from django.conf import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/contacts",   # includes read access
]
SECRETS = Path(settings.BASE_DIR) / "secrets"
TOKEN = SECRETS / "token.json"
CLIENT = SECRETS / "credentials.json"

def get_credentials() -> Credentials:
    if not TOKEN.exists():
        raise RuntimeError("Google not linked. Run: python manage.py google_login")
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            TOKEN.write_text(creds.to_json())
        else:
            raise RuntimeError("Google token expired. Run: python manage.py google_login")
    return creds

def service(name: str, version: str):
    # build per call: httplib2 clients aren't thread-safe
    return build(name, version, credentials=get_credentials(), cache_discovery=False)