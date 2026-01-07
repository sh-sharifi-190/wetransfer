import { Select } from "@mantine/core";
import { getCookie, setCookie } from "cookies-next";
import { useState } from "react";
import useTranslate from "../../hooks/useTranslate.hook";
import { LOCALES } from "../../i18n/locales";

const LanguagePicker = () => {
  const t = useTranslate();

  // 1. Get the current cookie
  const currentCookie = getCookie("language")?.toString();

  // 2. Check if the cookie matches our new clean list (English or Persian)
  // If the user had French/German selected before, we force them back to English
  const isCookieValid = Object.values(LOCALES).some((l) => l.code === currentCookie);
  
  // Default to English if cookie is missing or invalid
  const defaultLang = isCookieValid ? currentCookie : LOCALES.ENGLISH.code;

  const [selectedLanguage, setSelectedLanguage] = useState(defaultLang);

  const languages = Object.values(LOCALES).map((locale) => ({
    value: locale.code,
    label: locale.name,
  }));

  return (
    <Select
      label={t("account.card.language.title")}
      value={selectedLanguage}
      description={t("account.card.language.description")}
      onChange={(value) => {
        // Fallback to English if something goes wrong
        const newValue = value ?? LOCALES.ENGLISH.code;
        
        setSelectedLanguage(newValue);
        setCookie("language", newValue, {
          sameSite: "lax",
          expires: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          ),
        });
        location.reload();
      }}
      data={languages}
    />
  );
};

export default LanguagePicker;