import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'ar';

const messages = {
  fr: {
    brandTagline: 'La fidélité, en toute simplicité',
    footer: 'Un compte. Vos commerces locaux préférés.',
    back: 'Retour',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    customerSpace: 'Espace client',
    merchantSpace: 'Espace commerçant',
    homeTitle: 'Votre fidélité, réunie au même endroit.',
    homeCopy: 'Retrouvez vos commerces préférés avec un seul compte personnel.',
    customerLogin: 'Connexion client',
    merchantLogin: 'Connexion commerçant',
    language: 'Langue',
    unsupported: "Cette fonctionnalité dépend encore d'une API disponible prochainement.",
    businessSetup: "Configuration de l'entreprise",
    yourBusiness: 'Votre entreprise',
    businessName: "Nom de l'entreprise",
    description: 'Description',
    phone: 'Téléphone',
    branches: 'Succursales',
    setupStatus: 'Statut de la configuration',
    firstBranch: 'Première succursale',
    name: 'Nom',
    address: 'Adresse',
    setup: 'Configuration',
    createBusiness: 'Créer votre entreprise',
    continueSetup: 'Continuer',
    setupComplete: '✓ Configuration terminée',
    yourAccount: 'Votre compte',
    readyForLoyalty: 'Vous êtes prêt à participer aux programmes de fidélité.',
    availableFeatures: 'Fonctionnalités disponibles',
    qrScanning: 'Scan QR et adhésions',
    qrScanningDesc: 'Scannez votre code QR unique chez les commerces participants pour accéder à leurs programmes de fidélité.',
    loyaltyWallet: 'Portefeuille de fidélité (À venir)',
    loyaltyWalletDesc: "Vos programmes, points et récompenses s'afficheront ici dès que les API seront disponibles.",
    businessOperations: 'Opérations clients (À venir)',
    businessOperationsDesc: "La gestion des programmes, l'enregistrement des achats et les remboursements seront disponibles une fois les API complétées.",
  },
  ar: {
    brandTagline: 'الولاء ببساطة',
    footer: 'حساب واحد. أعمالك المحلية المفضلة.',
    back: 'رجوع',
    signOut: 'تسجيل الخروج',
    signingOut: 'جارٍ تسجيل الخروج…',
    customerSpace: 'مساحة العميل',
    merchantSpace: 'مساحة التاجر',
    homeTitle: 'ولاؤك في مكان واحد.',
    homeCopy: 'تابع أعمالك المفضلة بحساب شخصي واحد.',
    customerLogin: 'دخول العميل',
    merchantLogin: 'دخول التاجر',
    language: 'اللغة',
    unsupported: 'تتطلب هذه الميزة واجهة برمجة تطبيقات غير متاحة بعد.',
    businessSetup: 'إعداد المؤسسة',
    yourBusiness: 'عملك',
    businessName: 'اسم العمل',
    description: 'الوصف',
    phone: 'الهاتف',
    branches: 'الفروع',
    setupStatus: 'حالة الإعداد',
    firstBranch: 'الفرع الأول',
    name: 'الاسم',
    address: 'العنوان',
    setup: 'الإعداد',
    createBusiness: 'إنشاء عملك',
    continueSetup: 'متابعة',
    setupComplete: '✓ تم الإعداد',
    yourAccount: 'حسابك',
    readyForLoyalty: 'أنت جاهز للمشاركة في برامج الولاء.',
    availableFeatures: 'الميزات المتاحة',
    qrScanning: 'مسح QR والعضويات',
    qrScanningDesc: 'امسح رمز QR الفريد الخاص بك في الشركات المشاركة للوصول إلى برامج الولاء الخاصة بهم.',
    loyaltyWallet: 'محفظة الولاء (قادمة قريباً)',
    loyaltyWalletDesc: 'ستظهر برامجك والنقاط والمكافآت هنا عند توفر واجهات برمجة التطبيقات.',
    businessOperations: 'عمليات العملاء (قادمة قريباً)',
    businessOperationsDesc: 'ستكون إدارة البرامج وإدخال المشتريات والاسترداد متاحة بمجرد اكتمال واجهات برمجة التطبيقات.',
  },
} as const;

type MessageKey = keyof (typeof messages)['fr'];
type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  formatTnd: (value: number) => string;
  formatDate: (value: string | Date) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function getInitialLocale(): Locale {
  const stored = window.localStorage.getItem('fideliy-locale');
  return stored === 'ar' || stored === 'fr' ? stored : 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('fideliy-locale', locale);
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key) => messages[locale][key],
    formatTnd: (amount) => new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
      style: 'currency', currency: 'TND', minimumFractionDigits: 3,
    }).format(amount),
    formatDate: (date) => new Intl.DateTimeFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
      dateStyle: 'medium',
    }).format(new Date(date)),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider.');
  return value;
}
