import { Card, CardContent } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Quote } from "lucide-react";

export const TestimonialCard = ({
  quote,
  name,
  credentials,
  result,
  image,
}) => {
  return (
    <Card className="border-border/50 hover:border-primary/20 transition-all duration-300">
      <CardContent className="pt-6">
        <Quote className="h-8 w-8 text-primary/20 mb-4" />
        <p className="text-muted-foreground mb-6 italic">"{quote}"</p>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={image ? image : "/assets/logo.png"} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{credentials}</p>
            <p className="text-sm text-primary font-medium mt-1">{result}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
