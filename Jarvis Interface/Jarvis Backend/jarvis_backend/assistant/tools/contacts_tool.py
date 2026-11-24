from typing import ClassVar, Optional

from pydantic import EmailStr  # needs: pip install "pydantic[email]"

from .base_tool import BaseTool
from .google_auth import service

_warmed = False


class AddContactTool(BaseTool):
    """Add a new contact to Google Contacts."""

    requires_confirmation: ClassVar[bool] = True
    name: str
    phone: str
    email: Optional[EmailStr] = None

    def run(self) -> str:
        given, _, family = self.name.strip().partition(" ")
        body = {
            "names": [{"givenName": given, "familyName": family}],
            "phoneNumbers": [{"value": self.phone}],
        }
        if self.email:
            body["emailAddresses"] = [{"value": str(self.email)}]
        c = service("people", "v1").people().createContact(body=body).execute()
        return f"Contact added: {self.name} ({c['resourceName']})"


class FetchContactTool(BaseTool):
    """Look up a contact's phone numbers and emails by name (partial names work)."""

    contact_name: str

    def run(self) -> str:
        global _warmed
        svc = service("people", "v1")
        if not _warmed:  # Google's documented warm-up for searchContacts
            svc.people().searchContacts(query="", readMask="names").execute()
            _warmed = True
        res = svc.people().searchContacts(
            query=self.contact_name,
            pageSize=10,
            readMask="names,phoneNumbers,emailAddresses",
        ).execute()
        out = []
        for r in res.get("results", []):
            p = r["person"]
            name = (p.get("names") or [{}])[0].get("displayName", "?")
            phones = ", ".join(x["value"] for x in p.get("phoneNumbers", [])) or "-"
            mails = ", ".join(x["value"] for x in p.get("emailAddresses", [])) or "-"
            out.append(f"{name} | phone: {phones} | email: {mails}")
        return "\n".join(out) or f"No contact found for '{self.contact_name}'."