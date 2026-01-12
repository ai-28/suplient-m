"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useLanguage, useTranslation } from '@/app/context/LanguageContext';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';

// Supported languages array
const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' }
];

export function LanguageSelector({ variant = 'card', className }) {
  const { language, changeLanguage } = useLanguage();
  const t = useTranslation();
  const [pendingLanguage, setPendingLanguage] = useState(language);

  useEffect(() => {
    setPendingLanguage(language);
  }, [language]);

  const handleLanguageChange = (value) => {
    setPendingLanguage(value);
    // Apply language change immediately for all variants
    changeLanguage(value);
    // Show success message with the selected language name
    const selectedLang = supportedLanguages.find(lang => lang.code === value);
    const message = value === 'da' 
      ? `Sprog skiftet til ${selectedLang?.nativeName || 'Dansk'}`
      : `Language changed to ${selectedLang?.nativeName || 'English'}`;
    toast.success(message);
  };

  const handleSaveLanguage = () => {
    changeLanguage(pendingLanguage);
    const savedMessage = t('settings.language.saved', 'Language saved');
    toast.success(savedMessage);
  };

  // Header variant - compact language switcher for top bar
  if (variant === 'header') {
    return (
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[140px] h-9">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {supportedLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <Label htmlFor="language-select">{t('settings.language.title', 'Language')}</Label>
        <div className="space-y-3">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder={t('settings.language.current', 'Current Language')} />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('settings.language.current', 'Current Language')}: {supportedLanguages.find(lang => lang.code === language)?.nativeName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('settings.language.title', 'Language')}</CardTitle>
        <CardDescription>{t('settings.language.select', 'Select your language')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="language-select">{t('settings.language.current', 'Current Language')}</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder={t('settings.language.current', 'Current Language')} />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            {t('settings.language.current', 'Current Language')}: {supportedLanguages.find(lang => lang.code === language)?.nativeName}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}