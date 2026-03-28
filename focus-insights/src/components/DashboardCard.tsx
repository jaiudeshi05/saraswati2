import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  warm?: boolean;
  glass?: boolean;
}

const DashboardCard = ({ children, className, warm, glass }: DashboardCardProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-4 card-shadow card-hover",
        glass ? "glass-card" : warm ? "bg-card-warm" : "bg-card",
        className
      )}
    >
      {children}
    </div>
  );
};

export default DashboardCard;
