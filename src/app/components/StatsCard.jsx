import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";


export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = "text-muted-foreground", 
  badge, 
  subtitle,
  trend 
}) {
  return (
    <Card className="card-hover bg-muted/30">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
            </div>
            {badge}
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1">
                <trend.icon className={`h-3 w-3 ${trend.color}`} />
                <span className={`text-xs font-medium ${trend.color}`}>{trend.text}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}