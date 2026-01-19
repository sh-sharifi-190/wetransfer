import english from "./translations/en-US";
// Make sure you created fa.ts in the translations folder as discussed!
import persian from "./translations/fa"; 

export const LOCALES = {
  ENGLISH: {
    name: "English",
    code: "en-US",
    messages: english,
  },
  PERSIAN: {
    name: "فارسی",
    code: "fa-IR",
    messages: persian,
  },
};