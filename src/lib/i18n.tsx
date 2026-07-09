import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActiveLanguage } from "./dom-translate";

export type Lang = "en" | "ar" | "ur";

export const LANG_META: Record<Lang, { label: string; native: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", native: "English", dir: "ltr" },
  ar: { label: "Arabic", native: "العربية", dir: "rtl" },
  ur: { label: "Urdu", native: "اردو", dir: "rtl" },
};

type Dict = Record<string, string>;

const en: Dict = {
  "nav.discover": "Discover",
  "nav.library": "Library",
  "nav.admin": "Admin",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "home.status": "System Status · Active",
  "home.title.1": "Professional grade",
  "home.title.2": "digital assets.",
  "admin.status": "Admin Console · Restricted",
  "admin.title": "Admin control",
  "admin.signedInAs": "Signed in as",
  "tab.products": "Products",
  "tab.methods": "Payment",
  "tab.orders": "Orders",
  "tab.accounts": "Accounts",
  "tab.requests": "Requests",
  "tab.admins": "Admins",
  "tab.users": "Users",
  "tab.posts": "Posts",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
  "lang.label": "Language",
};

const ar: Dict = {
  "nav.discover": "استكشف",
  "nav.library": "المكتبة",
  "nav.admin": "الإدارة",
  "nav.signIn": "تسجيل الدخول",
  "nav.signOut": "تسجيل الخروج",
  "home.status": "حالة النظام · نشط",
  "home.title.1": "أصول رقمية",
  "home.title.2": "بجودة احترافية.",
  "admin.status": "لوحة الإدارة · مقيدة",
  "admin.title": "التحكم الإداري",
  "admin.signedInAs": "تم تسجيل الدخول بـ",
  "tab.products": "المنتجات",
  "tab.methods": "الدفع",
  "tab.orders": "الطلبات",
  "tab.accounts": "الحسابات",
  "tab.requests": "الطلبات المقدمة",
  "tab.admins": "المشرفون",
  "tab.users": "المستخدمون",
  "tab.posts": "المنشورات",
  "theme.light": "فاتح",
  "theme.dark": "داكن",
  "theme.system": "النظام",
  "lang.label": "اللغة",
};

const ur: Dict = {
  "nav.discover": "دریافت",
  "nav.library": "لائبریری",
  "nav.admin": "ایڈمن",
  "nav.signIn": "سائن ان",
  "nav.signOut": "سائن آؤٹ",
  "home.status": "سسٹم اسٹیٹس · فعال",
  "home.title.1": "پیشہ ورانہ معیار کے",
  "home.title.2": "ڈیجیٹل اثاثے۔",
  "admin.status": "ایڈمن کنسول · محدود",
  "admin.title": "ایڈمن کنٹرول",
  "admin.signedInAs": "بطور سائن ان",
  "tab.products": "پروڈکٹس",
  "tab.methods": "ادائیگی",
  "tab.orders": "آرڈرز",
  "tab.accounts": "اکاؤنٹس",
  "tab.requests": "درخواستیں",
  "tab.admins": "ایڈمنز",
  "tab.users": "صارفین",
  "tab.posts": "پوسٹس",
  "theme.light": "روشن",
  "theme.dark": "گہرا",
  "theme.system": "سسٹم",
  "lang.label": "زبان",
};

const DICTS: Record<Lang, Dict> = { en, ar, ur };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "app-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && saved in DICTS) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const dir = LANG_META[lang].dir;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    setActiveLanguage(lang);
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: LANG_META[lang].dir,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {
          /* ignore */
        }
      },
      t: (key) => DICTS[lang][key] ?? DICTS.en[key] ?? key,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}