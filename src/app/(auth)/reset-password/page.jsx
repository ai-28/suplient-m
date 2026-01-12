import { Suspense } from "react";
import ResetPassword from "@/app/pages/ResetPassword";
import { Card, CardContent } from "@/app/components/ui/card";
import { Loader2 } from "lucide-react";

function ResetPasswordLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPassword />
    </Suspense>
  );
}

