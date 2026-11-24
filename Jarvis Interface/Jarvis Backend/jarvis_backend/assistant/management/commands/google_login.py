# yourapp/management/commands/google_login.py
from django.core.management.base import BaseCommand
from google_auth_oauthlib.flow import InstalledAppFlow
from ...tools.google_auth import SCOPES, CLIENT, TOKEN

class Command(BaseCommand):
    def handle(self, *args, **opts):
        TOKEN.parent.mkdir(exist_ok=True)
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), SCOPES)
        creds = flow.run_local_server(port=0, prompt="consent")
        TOKEN.write_text(creds.to_json())
        self.stdout.write("Google linked.")