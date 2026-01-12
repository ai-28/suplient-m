import { useTranslation } from "@/app/context/LanguageContext";
import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";

export const DemoCTA = ({
  onClick,
  text,
  variant = "default",
  size = "lg",
}) => {
  const t = useTranslation();
  
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className="group"
    >
      {text || t('hero.ctaPrimary')}
      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Button>
  );
};
