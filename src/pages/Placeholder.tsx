import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Placeholder() {
  const { pathname } = useLocation();
  const name = pathname.split("/").filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" › ");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{name || "Page"}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-1">This module is part of a future phase and will be built next.</p>
        </CardContent>
      </Card>
    </div>
  );
}
