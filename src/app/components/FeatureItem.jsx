import { Card, CardContent } from "@/app/components/ui/card";

export const FeatureItem = ({ icon: Icon, title, description }) => {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
