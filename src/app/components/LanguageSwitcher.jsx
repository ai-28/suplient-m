import { useLanguage } from "@/app/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en')}
        className={`h-8 w-8 p-0 rounded-full transition-all ${
          currentLanguage === 'en' 
            ? 'ring-2 ring-primary ring-offset-2' 
            : 'opacity-60 hover:opacity-100'
        }`}
        aria-label="Switch to English"
      >
        <span className="text-2xl">🇬🇧</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('da')}
        className={`h-8 w-8 p-0 rounded-full transition-all ${
          currentLanguage === 'da' 
            ? 'ring-2 ring-primary ring-offset-2' 
            : 'opacity-60 hover:opacity-100'
        }`}
        aria-label="Skift til dansk"
      >
        <span className="text-2xl">🇩🇰</span>
      </Button>
    </div>
  );
};
