import { Calendar, Users, Mail, Search, BookOpen } from "lucide-react";

export const GROUPS = [
  { key: "calendar", label: "Calendar", desc: "Schedule", Icon: Calendar },
  { key: "contacts", label: "Contacts", desc: "People", Icon: Users },
  { key: "email", label: "Email", desc: "Messages", Icon: Mail },
  { key: "search", label: "Web Search", desc: "Internet", Icon: Search },
  { key: "knowledge", label: "Knowledge", desc: "Your notes", Icon: BookOpen },
];

// Keys are the backend tool class names
const TOOL_META = {
  CreateEventTool: { group: "calendar", verb: "Creating calendar event" },
  ListEventsTool: { group: "calendar", verb: "Reading your calendar" },
  AddContactTool: { group: "contacts", verb: "Adding contact" },
  FetchContactTool: { group: "contacts", verb: "Looking up contact" },
  SendEmailTool: { group: "email", verb: "Sending email" },
  SearchWebTool: { group: "search", verb: "Searching the web" },
  KnowledgeSearchTool: { group: "knowledge", verb: "Searching your notes" },
};

export const metaFor = (name) => TOOL_META[name] ?? { group: null, verb: name };
export const groupOf = (key) => GROUPS.find((g) => g.key === key);
