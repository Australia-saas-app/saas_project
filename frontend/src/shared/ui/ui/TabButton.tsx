"use client";

import React from "react";
import { Button } from "./button";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "outline"}
    >
      {label}
    </Button>
  );
};

export default TabButton;
