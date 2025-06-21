import React from "react";
import "./Badge.css"; // Import the new styles

function Badge({ className = "", variant = "default", ...props }) {
  const classes = `badge badge-${variant} ${className}`;
  return <div className={classes} {...props} />;
}

export { Badge };
