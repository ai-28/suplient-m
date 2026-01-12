import { Users, Award, Shield } from "lucide-react";

export const TrustBadge = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-8 border-t border-b border-border/50">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">500+</strong> Mental Health Professionals
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">95%</strong> Client Success Rate
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">
          HIPAA Compliant & Secure
        </span>
      </div>
    </div>
  );
};
