# import os
# import datetime
# from google.auth.transport.requests import Request
# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from googleapiclient.discovery import build
# from googleapiclient.errors import HttpError
# from pydantic import Field
# from .base_tool import BaseTool
# from .utils import SCOPES

# class CalendarTool(BaseTool):
#     """
#     A tool for booking events on Google Calendar
#     """
#     event_name: str = Field(description='Name of the event to be created')
#     event_datetime: str = Field(
#         description='Date and time of the event. This must be converted into a Python datetime.datetime object before use.'
#     )
#     event_description: str = Field(default="", description='Optional description of the event')

#     def get_credentials(self):
#         """
#         Get and refresh Google Calendar API credentials
#         """
#         creds = None
#         if os.path.exists("token.json"):
#             creds = Credentials.from_authorized_user_file("token.json", SCOPES)
#         if not creds or not creds.valid:
#             if creds and creds.expired and creds.refresh_token:
#                 creds.refresh(Request())
#             else:
#                 flow = InstalledAppFlow.from_client_secrets_file(
#                     "credentials.json", SCOPES
#                 )
#                 creds = flow.run_local_server(port=0)
#             with open("token.json", "w") as token:
#                 token.write(creds.to_json())
#         return creds

#     def create_event(self):
#         """
#         Creates an event on Google Calendar
#         """
#         try:
#             creds = self.get_credentials()
#             service = build("calendar", "v3", credentials=creds)
            
#             # Convert the string to a datetime object
#             event_datetime = datetime.datetime.fromisoformat(self.event_datetime)

#             event = {
#                 'summary': self.event_name,
#                 'description': self.event_description,
#                 'start': {
#                     'dateTime': event_datetime.isoformat(),
#                     'timeZone': 'UTC',
#                 },
#                 'end': {
#                     'dateTime': (event_datetime + datetime.timedelta(hours=1)).isoformat(),
#                     'timeZone': 'UTC',
#                 },
#             }

#             event = service.events().insert(calendarId='primary', body=event).execute()
#             return f"Event created successfully. Event ID: {event.get('id')}"

#         except HttpError as error:
#             return f"An error occurred: {error}"

#     def run(self):
#         return self.create_event()
from datetime import datetime, timedelta
from typing import ClassVar
from zoneinfo import ZoneInfo
from django.conf import settings
from pydantic import Field
from .base_tool import BaseTool
from .google_auth import service

TZ = lambda: ZoneInfo(settings.TIME_ZONE)

class CreateEventTool(BaseTool):
    """Create an event in the user's Google Calendar."""
    requires_confirmation: ClassVar[bool] = True
    title: str
    start: datetime = Field(description="ISO 8601 start time, e.g. 2026-11-23T14:00:00")
    duration_minutes: int = Field(60, ge=5, le=1440)
    description: str = ""

    def run(self) -> str:
        start = self.start if self.start.tzinfo else self.start.replace(tzinfo=TZ())
        end = start + timedelta(minutes=self.duration_minutes)
        body = {
            "summary": self.title,
            "description": self.description,
            "start": {"dateTime": start.isoformat(), "timeZone": settings.TIME_ZONE},
            "end": {"dateTime": end.isoformat(), "timeZone": settings.TIME_ZONE},
        }
        ev = service("calendar", "v3").events().insert(calendarId="primary", body=body).execute()
        return f"Event created: {self.title} at {start:%a %d %b %H:%M} (id {ev['id']})"

class ListEventsTool(BaseTool):
    """List the user's upcoming calendar events."""
    days_ahead: int = Field(7, ge=1, le=60)

    def run(self) -> str:
        now = datetime.now(TZ())
        res = service("calendar", "v3").events().list(
            calendarId="primary", timeMin=now.isoformat(),
            timeMax=(now + timedelta(days=self.days_ahead)).isoformat(),
            singleEvents=True, orderBy="startTime", maxResults=20,
        ).execute()
        lines = [f"{e['start'].get('dateTime', e['start'].get('date'))} | {e.get('summary', '(untitled)')}"
                 for e in res.get("items", [])]
        return "\n".join(lines) or "No upcoming events."