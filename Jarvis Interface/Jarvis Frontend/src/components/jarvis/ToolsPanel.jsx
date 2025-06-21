import { Calendar, Users, Mail, Search } from "lucide-react";
import { Card } from "../ui/Card";
import "./ToolsPanel.css"; // CSS file

export default function ToolsPanel() {
  const tools = [
    {
      name: "Calendar",
      icon: <Calendar className="tool-icon" />,
      status: "active",
      description: "Schedule management",
    },
    {
      name: "Contacts",
      icon: <Users className="tool-icon" />,
      status: "active",
      description: "Contact management",
    },
    {
      name: "Email",
      icon: <Mail className="tool-icon" />,
      status: "active",
      description: "Email operations",
    },
    {
      name: "Web Search",
      icon: <Search className="tool-icon" />,
      status: "active",
      description: "Information retrieval",
    },
  ];

  return (
    <div className="tools-grid">
      {tools.map((tool) => (
        <Card key={tool.name} className="tool-card">
          <div className="tool-item">
            <div className="tool-icon-wrapper">{tool.icon}</div>
            <div className="tool-text">
              <p className="tool-name">{tool.name}</p>
              <p className="tool-description">{tool.description}</p>
            </div>
            <div
              className={`tool-status ${
                tool.status === "active" ? "status-active" : "status-inactive"
              }`}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
