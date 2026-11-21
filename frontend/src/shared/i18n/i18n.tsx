import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'ar';

const messages = {
  fr: {
    /* Brand & Footer */
    brandTagline: 'La fidélité, en toute simplicité',
    footer: 'Un compte. Vos commerces locaux préférés.',
    
    /* Navigation */
    back: 'Retour',
    backToDashboard: 'Retour au tableau de bord',
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    customers: 'Clients',
    programs: 'Programmes',
    branches: 'Succursales',
    scan: 'Scan',
    settings: 'Paramètres',
    qr: 'QR',
    myQr: 'Mon QR',
    activity: 'Activité',
    profile: 'Profil',
    more: 'Plus',
    help: 'Aide',
    
    /* Actions */
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    signIn: 'Se connecter',
    signUp: "S'inscrire",
    save: 'Enregistrer',
    cancel: 'Annuler',
    continue: 'Continuer',
    skip: 'Passer',
    next: 'Suivant',
    previous: 'Précédent',
    edit: 'Modifier',
    delete: 'Supprimer',
    create: 'Créer',
    add: 'Ajouter',
    view: 'Voir',
    manage: 'Gérer',
    actions: 'Actions',
    
    /* Authentication */
    customerSpace: 'Espace client',
    merchantSpace: 'Espace commerçant',
    customerLogin: 'Connexion client',
    merchantLogin: 'Connexion commerçant',
    email: 'Email',
    password: 'Mot de passe',
    phoneNumber: 'Numéro de téléphone',
    dateOfBirth: 'Date de naissance',
    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié ?',
    dontHaveAccount: "Vous n'avez pas de compte ?",
    alreadyHaveAccount: 'Vous avez déjà un compte ?',
    
    /* Home */
    homeTitle: 'Votre fidélité, réunie au même endroit.',
    homeCopy: 'Retrouvez vos commerces préférés avec un seul compte personnel.',
    manageYourProfile: 'Gérez votre profil',
    
    /* Settings */
    yourAccount: 'Votre compte',
    manageYourAccount: 'Gérez votre compte et vos préférences',
    accountSettings: 'Paramètres du compte',
    businessProfile: 'Profil de l\'entreprise',
    business: 'Entreprise',
    businessName: "Nom de l'entreprise",
    businessDescription: 'Description de l\'entreprise',
    businessPhone: 'Téléphone de l\'entreprise',
    businessLogo: 'Logo de l\'entreprise',
    phoneVisibility: 'Visibilité du téléphone',
    phonePubliclyDisplayed: 'Afficher publiquement',
    phoneKeptPrivate: 'Gardé privé',
    preferences: 'Préférences',
    language: 'Langue',
    notifications: 'Notifications',
    
    /* Business Profile */
    manageYourBusinessInformation: 'Gérez les informations de votre entreprise',
    businessUpdatedSuccessfully: 'Entreprise mise à jour avec succès',
    noChangesMade: 'Aucune modification apportée',
    logoUploadHint: 'Téléchargez votre logo commercial (JPG, PNG, max 5MB)',
    logoUploaded: 'Logo téléchargé',
    noLogoUploaded: 'Aucun logo téléchargé',
    logoMustBeImage: 'Le fichier doit être une image',
    logoTooLarge: 'Le fichier est trop grand (max 5MB)',
    notificationSettings: 'Paramètres de notification',
    subscription: 'Abonnement',
    subscriptionInfo: "Informations sur l'abonnement",
    security: 'Sécurité',
    securitySettings: 'Paramètres de sécurité',
    dangerZone: 'Zone de danger',
    signOutError: 'Erreur lors de la déconnexion',
    
    /* Customers */
    customersList: 'Liste des clients',
    allYourCustomers: 'Tous vos clients enregistrés',
    manageYourCustomers: 'Gérez vos clients et leur fidélité',
    searchCustomers: 'Rechercher des clients...',
    noCustomersFound: 'Aucun client trouvé',
    tryDifferentSearch: 'Essayez une autre recherche',
    totalBalance: 'Solde total',
    stamps: 'Timbres',
    points: 'Points',
    lastVisit: 'Dernière visite',
    scanCustomerQR: "Scanner le QR d'un client",
    
    /* Activity */
    yourRecentActivity: 'Vos dernières actions',
    noActivityYet: 'Aucune activité pour le moment',
    activityWillAppearHere: 'Vos transactions s\'afficheront ici',
    recentActivity: 'Activité récente',
    noTransactionsYet: 'Aucune transaction pour le moment',
    activityNotAvailable: 'Historique des transactions non disponible',
    noMembershipsMessage: 'Aucune adhésion trouvée',
    noActiveMembershipsMessage: 'Aucune adhésion active',
    
    /* QR */
    yourQRCode: 'Votre code QR',
    scanAtMerchant: 'À présenter chez les commerçants',
    showQRToMerchant: 'Montrez ce code QR au commerçant pour gagner des points',
    
    /* Onboarding */
    businessSetup: 'Configuration de l\'entreprise',
    yourBusiness: 'Votre entreprise',
    description: 'Description',
    phone: 'Téléphone',
    firstBranch: 'Première succursale',
    name: 'Nom',
    address: 'Adresse',
    setup: 'Configuration',
    createBusiness: 'Créer votre entreprise',
    continueSetup: 'Continuer',
    setupComplete: '✓ Configuration terminée',
    
    /* Dashboard */
    welcome: 'Bienvenue',
    merchantWorkspace: 'Espace commerçant',
    informationAndSetup: 'Informations et état de la configuration',
    businessOperations: 'Opérations clients',
    businessOperationsDesc: 'La gestion des programmes, l\'enregistrement des achats et les remboursements seront disponibles une fois les API complétées.',
    businessOperationsMerchant: 'Opérations commerciales',
    businessOperationsMerchantDesc: 'Suivez vos opérations et performances',
    setupStatus: 'Statut de la configuration',
    inProgress: 'En cours',
    complete: 'Complète',
    incomplete: 'Incomplet',
    status: 'Statut',
    ready: 'Prêt',
    setupRequired: 'Configuration requise',
    configured: 'Configuré',
    unavailable: 'N/A',
    noProgram: 'Aucun',
    active: 'Actif',
    loyaltyProgram: 'Programme de fidélité',
    configureLoyalty: 'Configurer votre programme',
    createProgram: 'Créer un programme',
    quickActions: 'Actions rapides',
    noBusiness: 'Aucune entreprise configurée',
    setupBusinessToContinue: 'Veuillez configurer votre entreprise pour continuer',
    setupBusiness: 'Configurer l\'entreprise',
    merchantQrScanningDesc: 'Scannez les codes QR des clients pour accéder à leurs cartes de fidélité',
    merchantLoyaltyWalletDesc: 'Gérez les cartes de fidélité de vos clients',
    
    /* Features */
    availableFeatures: 'Fonctionnalités disponibles',
    whatYouCanDo: 'Ce que vous pouvez faire avec FIDELIY',
    qrScanning: 'Scan QR et adhésions',
    qrScanningDesc: 'Scannez votre code QR unique chez les commerces participants pour accéder à leurs programmes de fidélité.',
    loyaltyWallet: 'Portefeuille de fidélité',
    loyaltyWalletDesc: 'Vos programmes, points et récompenses s\'afficheront ici.',
    
    /* Membership Details */
    membershipDetails: 'Détails de l\'adhésion',
    businessInformation: 'Informations sur le commerce',
    currentBalance: 'Solde actuel',
    progressTowards: 'Progression vers',
    availableRewards: 'Récompenses disponibles',
    rewards: 'Récompenses',
    transactionHistory: 'Historique des transactions',
    memberSince: 'Membre depuis',
    stampsProgram: 'Programme de timbres',
    pointsProgram: 'Programme de points',
    hybridProgram: 'Programme hybride',
    purchase: 'Achat',
    manualAdjustment: 'Ajustement manuel',
    reversal: 'Annulation',
    available: 'Disponible',
    notAvailable: 'Non disponible',
    rewardsNotAvailable: 'Récompenses non disponibles',
    transactionHistoryNotAvailable: 'Historique des transactions non disponible',
    noRewardsAvailable: 'Aucune récompense disponible',
    unknown: 'Inconnu',
    
    /* Feedback */
    skipToMainContent: 'Aller au contenu principal',
    loading: 'Chargement…',
    success: 'Succès',
    error: 'Erreur',
    comingSoon: 'Bientôt disponible',
    notSpecified: 'Non spécifié',
    failedToLoadMembership: 'Échec du chargement de l\'adhésion',
    membershipNotFound: 'Adhésion introuvable',
    notFound: 'Non trouvé',
    
    /* Form */
    required: 'Requis',
    optional: 'Optionnel',
    
    /* Programme Types */
    stampCard: 'Carte de timbres',
    pointsSystem: 'Système de points',
    combined: 'Combiné (Timbres + Points)',
    programmeType: 'Type de programme',
    programmeName: "Nom du programme",
    programmeDescription: 'Description du programme',
    
    /* Programme Configuration */
    stampsPerPurchase: 'Timbres par achat',
    rewardName: 'Nom de la récompense',
    stampsRequired: 'Timbres requis pour la récompense',
    pointsPerTND: 'Points par TND',
    pointsRequired: 'Points requis pour la récompense',
    expiration: 'Expiration',
    noExpiration: 'Pas d\'expiration',
    
    /* Programme Status */
    programmeStatus: 'Statut du programme',
    currentProgramme: 'Programme actuel',
    programmeHistory: 'Historique des programmes',
    previousVersions: 'Versions précédentes',
    
    /* Actions */
    createLoyaltyProgramme: 'Créer un programme de fidélité',
    setupRewardsSystem: 'Configurer votre système de récompenses',
    deactivateProgramme: 'Désactiver le programme',
    deactivating: 'Désactivation...',
    
    /* Branch Management */
    id: 'ID',
    branchCount: 'Nombre de succursales',
    activeBranch: 'Succursale active',
    setAsActive: 'Définir comme active',
    addNewBranch: 'Ajouter une nouvelle succursale',
    branchName: 'Nom de la succursale',
    branchAddress: 'Adresse de la succursale',
    branchPhone: 'Téléphone de la succursale',
    createBranch: 'Créer une succursale',
    updateBranch: 'Mettre à jour la succursale',
    deleteBranch: 'Supprimer la succursale',
    confirmDeleteBranch: 'Confirmer la suppression de cette succursale ?',
    cannotDeleteOnlyBranch: 'Impossible de supprimer la seule succursale. Au moins une succursale est requise.',
    branchDeletedSuccessfully: 'Succursale supprimée avec succès',
    branchCreatedSuccessfully: 'Succursale créée avec succès',
    branchUpdatedSuccessfully: 'Succursale mise à jour avec succès',
    branchInfo: 'Informations sur la succursale',
    noBranchesYet: 'Aucune succursale pour le moment',
    createFirstBranch: 'Créer votre première succursale',
    branchLimitReached: 'Limite de succursales atteinte',
    managingBranches: 'Gérer vos succursales',
    thisActionCannotBeUndone: 'Cette action ne peut pas être annulée',
    saving: 'Enregistrement',
    deleting: 'Suppression',
    be: 'être',
    cannot: 'ne peut pas',
    undone: 'annulée',
    hide: 'Masquer',
    show: 'Afficher',
    confirm: 'Confirmer',
    
    /* Account Settings */
    accountInformation: 'Informations du compte',
    accountName: 'Nom du compte',
    manageYourBranches: 'Gérer vos succursales',
    noSessionData: 'Aucune donnée de session disponible',
    failedToLoad: 'Échec du chargement des données',
  },
  ar: {
    /* Brand & Footer */
    brandTagline: 'الولاء ببساطة',
    footer: 'حساب واحد. أعمالك المحلية المفضلة.',
    
    /* Navigation */
    back: 'رجوع',
    backToDashboard: 'الرجوع إلى لوحة التحكم',
    home: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    customers: 'العملاء',
    programs: 'برامج',
    branches: 'الفروع',
    scan: 'مسح',
    settings: 'الإعدادات',
    qr: 'QR',
    myQr: 'رمز QR الخاص بي',
    activity: 'النشاط',
    profile: 'الملف الشخصي',
    more: 'المزيد',
    help: 'مساعدة',
    
    /* Actions */
    signOut: 'تسجيل الخروج',
    signingOut: 'جارٍ تسجيل الخروج…',
    signIn: 'تسجيل الدخول',
    signUp: 'انشاء حساب',
    save: 'حفظ',
    cancel: 'إلغاء',
    continue: 'متابعة',
    skip: 'تخطي',
    next: 'التالي',
    previous: 'السابق',
    edit: 'تعديل',
    delete: 'حذف',
    create: 'إنشاء',
    add: 'إضافة',
    view: 'عرض',
    manage: 'إدارة',
    actions: 'الإجراءات',
    
    /* Authentication */
    customerSpace: 'مساحة العميل',
    merchantSpace: 'مساحة التاجر',
    customerLogin: 'دخول العميل',
    merchantLogin: 'دخول التاجر',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    phoneNumber: 'رقم الهاتف',
    dateOfBirth: 'تاريخ الميلاد',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
    
    /* Home */
    homeTitle: 'ولاؤك في مكان واحد.',
    homeCopy: 'تابع أعمالك المفضلة بحساب شخصي واحد.',
    manageYourProfile: 'ادارة ملفك الشخصي',
    
    /* Settings */
    yourAccount: 'حسابك',
    manageYourAccount: 'ادارة حسابك وتفضيلاتك',
    accountSettings: 'إعدادات الحساب',
    businessProfile: 'ملف المؤسسة',
    business: 'المؤسسة',
    businessName: 'اسم العمل',
    businessDescription: 'وصف المؤسسة',
    businessPhone: 'هاتف المؤسسة',
    businessLogo: 'شعار المؤسسة',
    phoneVisibility: 'ظهور الهاتف',
    phonePubliclyDisplayed: 'عرض علنًا',
    phoneKeptPrivate: 'إبقاء خاصًا',
    preferences: 'التفضيلات',
    language: 'اللغة',
    notifications: 'الإشعارات',
    
    /* Business Profile */
    manageYourBusinessInformation: 'ادارة معلومات مؤسستك',
    businessUpdatedSuccessfully: 'تم تحديث المؤسسة بنجاح',
    noChangesMade: 'لم يتم أي تغيير',
    logoUploadHint: 'قم بتحميل شعار مؤسستك (JPG, PNG, حد أقصى 5MB)',
    logoUploaded: 'تم تحميل الشعار',
    noLogoUploaded: 'لم يتم تحميل أي شعار',
    logoMustBeImage: 'يجب أن يكون الملف صورة',
    logoTooLarge: 'الملف كبير جدًا (الحد الأقصى 5MB)',
    notificationSettings: 'إعدادات الإشعارات',
    subscription: 'الاشتراك',
    subscriptionInfo: 'معلومات الاشتراك',
    security: 'الأمان',
    securitySettings: 'إعدادات الأمان',
    dangerZone: 'منطقة الخطر',
    signOutError: 'خطأ اثناء تسجيل الخروج',
    
    /* Customers */
    customersList: 'قائمة العملاء',
    allYourCustomers: 'جميع عملائك المسجلين',
    manageYourCustomers: 'ادارة عملائك وولائهم',
    searchCustomers: 'بحث عن العملاء...',
    noCustomersFound: 'لم يتم العثور على أي عميل',
    tryDifferentSearch: 'حاول البحث مرة أخرى',
    totalBalance: 'الرصيد الإجمالي',
    stamps: 'طوابع',
    points: 'نقاط',
    lastVisit: 'آخر زيارة',
    scanCustomerQR: 'مسح رمز QR الخاص بالعميل',
    
    /* Activity */
    yourRecentActivity: 'آخر نشاطاتك',
    noActivityYet: 'لا يوجد نشاط حتى الآن',
    activityWillAppearHere: 'سيظهر نشاطك هنا',
    recentActivity: 'النشاط الأخير',
    noTransactionsYet: 'لا يوجد معاملات حتى الآن',
    activityNotAvailable: 'سجل المعاملات غير متاح',
    noMembershipsMessage: 'لم يتم العثور على أي عضويات',
    noActiveMembershipsMessage: 'لا توجد عضويات نشطة',
    
    /* QR */
    yourQRCode: 'رمز QR الخاص بك',
    scanAtMerchant: 'لتقديمي للتجار',
    showQRToMerchant: 'أظهر هذا الرموز QR للتجار لكسب النقاط',
    
    /* Onboarding */
    businessSetup: 'إعداد المؤسسة',
    yourBusiness: 'عملك',
    description: 'الوصف',
    phone: 'الهاتف',
    firstBranch: 'الفرع الأول',
    name: 'الاسم',
    address: 'العنوان',
    setup: 'الإعداد',
    createBusiness: 'إنشاء عملك',
    continueSetup: 'متابعة',
    setupComplete: '✓ تم الإعداد',
    
    /* Dashboard */
    welcome: 'مرحبا',
    merchantWorkspace: 'مساحة التاجر',
    informationAndSetup: 'المعلومات وحالة الإعداد',
    businessOperations: 'عمليات العملاء',
    businessOperationsDesc: 'ستكون إدارة البرامج ودخول المشتريات والاسترداد متاحة بمجرد اكتمال واجهات برمجة التطبيقات.',
    businessOperationsMerchant: 'العمليات التجارية',
    businessOperationsMerchantDesc: 'تتبع عملياتك وأدائك',
    setupStatus: 'حالة الإعداد',
    inProgress: 'قيد التنفيذ',
    complete: 'مكتمل',
    incomplete: 'غير مكتمل',
    status: 'الحالة',
    ready: 'جاهز',
    setupRequired: 'مطلوب إعداد',
    configured: 'مُدون',
    unavailable: 'غير متوفر',
    noProgram: 'لا يوجد برنامج',
    active: 'نشط',
    loyaltyProgram: 'برنامج الولاء',
    configureLoyalty: 'ضبط برنامجك',
    createProgram: 'إنشاء برنامج',
    quickActions: 'الإجراءات السريعة',
    noBusiness: 'لم يتم تكوين أي عمل',
    setupBusinessToContinue: 'الرجاء تكوين عملك للمتابعة',
    setupBusiness: 'تكوين العمل',
    merchantQrScanningDesc: 'امسح رموز QR للعملاء للوصول إلى بطاقات ولائهم',
    merchantLoyaltyWalletDesc: 'ادار بطاقات ولاء عملائك',
    
    /* Features */
    availableFeatures: 'الميزات المتاحة',
    whatYouCanDo: 'ما يمكنك فعله مع FIDELIY',
    qrScanning: 'مسح QR والعضويات',
    qrScanningDesc: 'امسح رمز QR الفريد الخاص بك في الشركات المشاركة للوصول إلى برامج الولاء الخاصة بهم.',
    loyaltyWallet: 'محفظة الولاء',
    loyaltyWalletDesc: 'ستظهر برامجك والنقاط والمكافآت هنا.',
    
    /* Feedback */
    skipToMainContent: 'انتقل إلى المحتوى الرئيسي',
    loading: 'جار التحميل…',
    success: 'نجاح',
    error: 'خطأ',
    comingSoon: 'قريبًا',
    notSpecified: 'غير محدد',
    
    /* Form */
    required: 'مطلوب',
    optional: 'اختياري',
    
    /* Programme Types */
    stampCard: 'بطاقة الطوابع',
    pointsSystem: 'نظام النقاط',
    combined: 'مجمع ( الطوابع + النقاط )',
    programmeType: 'نوع البرنامج',
    programmeName: 'اسم البرنامج',
    programmeDescription: 'وصف البرنامج',
    
    /* Programme Configuration */
    stampsPerPurchase: 'طوابع لكل عملية شراء',
    rewardName: 'اسم المكافأة',
    stampsRequired: 'الطوابع المطلوبة للمكافأة',
    pointsPerTND: 'النقاط لكل دينار تونسى',
    pointsRequired: 'النقاط المطلوبة للمكافأة',
    expiration: 'انتهاء الصلاحية',
    noExpiration: 'لا انتهاء صلاحية',
    
    /* Programme Status */
    programmeStatus: 'حالة البرنامج',
    currentProgramme: 'البرنامج الحالي',
    programmeHistory: 'سجل البرامج',
    previousVersions: 'الإصدارات السابقة',
    
    /* Actions */
    createLoyaltyProgramme: 'إنشاء برنامج ولاء',
    setupRewardsSystem: 'إعداد نظام المكافآت',
    deactivateProgramme: 'إلغاء تفعيل البرنامج',
    deactivating: 'جار إلغاء التفعيل...',
    
    /* Branch Management */
    id: 'المعرف',
    branchCount: 'عدد الفروع',
    activeBranch: 'الفرع النشط',
    setAsActive: 'تعيين كأктив',
    addNewBranch: 'إضافة فرع جديد',
    branchName: 'اسم الفرع',
    branchAddress: 'عنوان الفرع',
    branchPhone: 'هاتف الفرع',
    createBranch: 'إنشاء فرع',
    updateBranch: 'تحديث الفرع',
    deleteBranch: 'حذف الفرع',
    confirmDeleteBranch: 'تأكيد حذف هذا الفرع؟',
    cannotDeleteOnlyBranch: 'لا يمكن حذف الفرع الوحيد. يجب وجود فرع واحد على الأقل.',
    branchDeletedSuccessfully: 'تم حذف الفرع بنجاح',
    branchCreatedSuccessfully: 'تم إنشاء الفرع بنجاح',
    branchUpdatedSuccessfully: 'تم تحديث الفرع بنجاح',
    branchInfo: 'معلومات الفرع',
    noBranchesYet: 'لا يوجد فروع حتى الآن',
    createFirstBranch: 'إنشاء أول فرع لك',
    branchLimitReached: 'تم الوصول إلى الحد الأقصى للفروع',
    managingBranches: 'إدارة الفروع',
    thisActionCannotBeUndone: 'لا يمكن تراجع هذه العملية',
    saving: 'جار الحفظ',
    deleting: 'جار الحذف',
    be: 'يكون',
    cannot: 'لا يمكن',
    undone: 'تراجع',
    hide: 'إخفاء',
    show: 'عرض',
    confirm: 'تأكيد',
    
    /* Account Settings */
    accountInformation: 'معلومات الحساب',
    accountName: 'اسم الحساب',
    manageYourBranches: 'إدارة الفروع',
    noSessionData: 'لا توجد بيانات جلسة',
    failedToLoad: 'فشل في تحميل البيانات',
    
    /* Membership Details */
    membershipDetails: 'تفاصيل العضوية',
    businessInformation: 'معلومات التجار',
    currentBalance: 'الرصيد الحالي',
    progressTowards: 'التقدم نحو',
    availableRewards: 'المكافآت المتاحة',
    rewards: 'المكافآت',
    transactionHistory: 'سجل المعاملات',
    memberSince: 'عضو منذ',
    stampsProgram: 'برنامج الطوابع',
    pointsProgram: 'برنامج النقاط',
    hybridProgram: 'برنامج مختلط',
    purchase: 'شراء',
    manualAdjustment: 'تعديل يدوي',
    reversal: 'إلغاء',
    available: 'متاح',
    notAvailable: 'غير متاح',
    rewardsNotAvailable: 'المكافآت غير متاحة',
    transactionHistoryNotAvailable: 'سجل المعاملات غير متاح',
    noRewardsAvailable: 'لا توجد مكافآت متاحة',
    unknown: 'غير معروف',
    failedToLoadMembership: 'فشل في تحميل العضوية',
    membershipNotFound: 'العضوية غير موجودة',
    notFound: 'غير محود',
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
