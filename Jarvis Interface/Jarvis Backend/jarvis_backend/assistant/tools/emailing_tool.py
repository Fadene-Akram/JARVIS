
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import Field
from .base_tool import BaseTool

class EmailingTool(BaseTool):
    """
    A tool for sending emails using Gmail. Accepts recipient email directly.
    """
    recipient_name: str = Field(default=None, description='Name of the email recipient (optional if email is given)')
    recipient_email: str = Field(default=None, description='Direct email of the recipient')
    subject: str = Field(description='Subject of the email')
    body: str = Field(description='Body content of the email')

    def send_email_with_gmail(self, recipient_email):
        """
        Sends an email using Gmail SMTP
        """
        try:
            sender_email = os.getenv("GMAIL_MAIL")
            app_password = os.getenv("GMAIL_APP_PASSWORD")

            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            msg['Subject'] = self.subject
            msg.attach(MIMEText(self.body, 'plain'))

            server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
            server.login(sender_email, app_password)
            text = msg.as_string()
            server.sendmail(sender_email, recipient_email, text)
            server.quit()
            return "Email sent successfully."
        except Exception as e:
            return f"Email was not sent successfully, error: {e}"

    def run(self):
        if self.recipient_email:
            return self.send_email_with_gmail(self.recipient_email)
        else:
            return "Recipient email must be provided."
