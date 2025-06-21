import * as React from "react";
import "./Button.css"; // Import the new CSS file

const Button = React.forwardRef(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      children, // <-- Add this line
      ...props
    },
    ref
  ) => {
    const classes = `btn btn-${variant} btn-${size} ${className}`;
    return (
      <button ref={ref} className={classes} {...props}>
        {children} {/* <-- This line is essential */}
      </button>
    );
  }
);

export { Button };
