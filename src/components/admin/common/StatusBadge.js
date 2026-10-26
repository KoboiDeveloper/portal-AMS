import React from "react";
import { Badge } from "reactstrap";

const StatusBadge = ({ active }) => {
  const isActive = active === true || active === 1 || active === "1" || String(active).toLowerCase() === "true";
  return <Badge color={isActive ? "success" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>;
};

export default StatusBadge;
