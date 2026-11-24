
import os, smtplib
from email.message import EmailMessage
from typing import ClassVar
from pydantic import EmailStr, Field
from .base_tool import BaseTool

class SendEmailTool(BaseTool):
    """Send an email. 'to' must be an email address; use FetchContactTool first if you only know a name."""
    requires_confirmation: ClassVar[bool] = True
    to: EmailStr
    subject: str = Field(max_length=200)
    body: str

    def run(self) -> str:
        sender, pwd = os.environ["GMAIL_MAIL"], os.environ["GMAIL_APP_PASSWORD"]
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = sender, str(self.to), self.subject
        msg.set_content(self.body)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as s:
            s.login(sender, pwd)
            s.send_message(msg)
        return f"Email sent to {self.to}."