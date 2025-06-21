import { Zap } from "lucide-react";
import { Badge } from "../ui/Badge";
import "./SystemStatus.css"; // CSS file

export default function SystemStatus({ isOnline }) {
  return (
    <div className="status-wrapper">
      <Badge
        variant="outline"
        className={`status-badge ${isOnline ? "online" : "offline"}`}
      >
        <Zap className="status-icon" />
        {isOnline ? "Online" : "Offline"}
      </Badge>
    </div>
  );
}
