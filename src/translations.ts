/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranslationSet {
  search_placeholder: string;
  secure_sign_out: string;
  complete_profile: string;
  verify_identity: string;
  switch_access_role: string;
  dashboard: string;
  products: string;
  categories: string;
  cash_register: string;
  orders: string;
  sales: string;
  customers: string;
  suppliers: string;
  payments: string;
  reports: string;
  settings: string;
  ai_forecast: string;
  profile: string;
  todays_sales: string;
  available_categories: string;
  expired_medicines: string;
  system_users: string;
  growth_rate: string;
  percentage_growth: string;
  active: string;
  staff: string;
  recent_sales: string;
  save_changes: string;
  cancel: string;
  edit: string;
  delete: string;
  loading: string;
  empty_state: string;
  error_occurred: string;
  add_product: string;
  stock_safety: string;
  clinical_copilot: string;
  audit_logs: string;
  notification_preferences: string;
  personal_info: string;
  phone_number: string;
  med_specialty: string;
  language_label: string;
  choose_language: string;
}

export const translations: Record<string, TranslationSet> = {
  EN: {
    search_placeholder: "Search drugs, generic names, SKU, invoice...",
    secure_sign_out: "Secure Sign Out",
    complete_profile: "Complete Profile",
    verify_identity: "Verify Identity",
    switch_access_role: "Switch Access Role",
    dashboard: "Dashboard Hub",
    products: "Products",
    categories: "Categories",
    cash_register: "Cash Register",
    orders: "Supplier Orders",
    sales: "POS Counter",
    customers: "Patient Profiles",
    suppliers: "Suppliers Directory",
    payments: "Finance & Sales",
    reports: "Reports Matrix",
    settings: "System Settings",
    ai_forecast: "AI Clincial Copilot",
    profile: "My Profile Node",
    todays_sales: "Todays Sales",
    available_categories: "Available Categories",
    expired_medicines: "Expired Medicines",
    system_users: "System Users",
    growth_rate: "growth rate today",
    percentage_growth: "growth cycle predicted",
    active: "Active",
    staff: "Staff Operators",
    recent_sales: "Recent Counter Transactions",
    save_changes: "Save Changes",
    cancel: "Cancel Operations",
    edit: "Edit Profile",
    delete: "Delete Record",
    loading: "Executing neural analytics...",
    empty_state: "No results matched query index.",
    error_occurred: "Transaction registry connection failure.",
    add_product: "Register New Product",
    stock_safety: "Threshold level verified.",
    clinical_copilot: "Clinical Intelligence Forecasts",
    audit_logs: "Security Event Audit Logs",
    notification_preferences: "Dispatches & Alert Targets",
    personal_info: "Personnel Identity Specifications",
    phone_number: "Phone Contact",
    med_specialty: "Clinical Area/Bio",
    language_label: "Selected Language",
    choose_language: "Select Language Structure"
  },
  ES: {
    search_placeholder: "Buscar medicamentos, genéricos, SKU, facturas...",
    secure_sign_out: "Cerrar Sesión de Forma Segura",
    complete_profile: "Completar Perfil",
    verify_identity: "Verificar Identidad",
    switch_access_role: "Cambiar Rol de Acceso",
    dashboard: "Panel Principal",
    products: "Productos",
    categories: "Categorías",
    cash_register: "Caja Registradora",
    orders: "Órdenes de Proveedor",
    sales: "Terminal POS",
    customers: "Perfiles de Pacientes",
    suppliers: "Directorio de Proveedores",
    payments: "Finanzas y Ventas",
    reports: "Matriz de Reportes",
    settings: "Configuración del Sistema",
    ai_forecast: "Copiloto Clínico IA",
    profile: "Mi Perfil de Usuario",
    todays_sales: "Ventas de Hoy",
    available_categories: "Categorías Activas",
    expired_medicines: "Fármacos Vencidos",
    system_users: "Usuarios del Sistema",
    growth_rate: "tasa de crecimiento hoy",
    percentage_growth: "ciclo de crecimiento previsto",
    active: "Activo",
    staff: "Personal de Turno",
    recent_sales: "Transacciones Recientes de Caja",
    save_changes: "Guardar Cambios",
    cancel: "Cancelar Operaciones",
    edit: "Editar Perfil",
    delete: "Eliminar Registro",
    loading: "Ejecutando análisis neuronal...",
    empty_state: "Ningún registro coincide con la consulta.",
    error_occurred: "Fallo de conexión en el registro comercial.",
    add_product: "Registrar Nuevo Producto",
    stock_safety: "Límites de stock verificados.",
    clinical_copilot: "Pronósticos de Inteligencia Clínica",
    audit_logs: "Registros de Eventos de Seguridad",
    notification_preferences: "Preferencias de Alertas",
    personal_info: "Datos de Identidad del Personal",
    phone_number: "Contacto Telefónico",
    med_specialty: "Área Clínica / Biografía",
    language_label: "Idioma Seleccionado",
    choose_language: "Seleccionar Idioma"
  },
  FR: {
    search_placeholder: "Rechercher médicaments, SKU, factures...",
    secure_sign_out: "Déconnexion Sécurisée",
    complete_profile: "Compléter le Profil",
    verify_identity: "Vérifier l'Identité",
    switch_access_role: "Changer de Rôle",
    dashboard: "Tableau de Bord",
    products: "Produits",
    categories: "Catégories",
    cash_register: "Caisse Enregistreuse",
    orders: "Commandes Fournisseurs",
    sales: "Terminal de Vente POS",
    customers: "Dossiers Patients",
    suppliers: "Répertoire Fournisseurs",
    payments: "Finances & Ventes",
    reports: "Rapports d'Activité",
    settings: "Paramètres Système",
    ai_forecast: "Copilote Clinique IA",
    profile: "Mon Profil Utilisateur",
    todays_sales: "Ventes d'Aujourd'hui",
    available_categories: "Catégories Disponibles",
    expired_medicines: "Médicaments Expired",
    system_users: "Opérateurs Système",
    growth_rate: "taux de croissance aujourd'hui",
    percentage_growth: "cycle de croissance prévu",
    active: "Actif",
    staff: "Opérateurs en Ligne",
    recent_sales: "Transactions Récentes",
    save_changes: "Enregistrer les modifications",
    cancel: "Annuler l'Opération",
    edit: "Modifier le Profil",
    delete: "Supprimer le Dossier",
    loading: "Analyse neuronale en cours...",
    empty_state: "Aucun résultat ne correspond à la recherche.",
    error_occurred: "Rupture de connexion du registre.",
    add_product: "Enregistrer Nouveau Produit",
    stock_safety: "Seuils de sécurité validés.",
    clinical_copilot: "Prévisions d'Intelligence Clinique",
    audit_logs: "Journaux d'Audit de Sécurité",
    notification_preferences: "Préférences d'Alertes",
    personal_info: "Identité de l'Opérateur",
    phone_number: "Numéro de Téléphone",
    med_specialty: "Domaine Clinique / Bio",
    language_label: "Langue Sélectionnée",
    choose_language: "Choisir la Langue"
  },
  KISW: {
    search_placeholder: "Tafuta dawa, majina ya kawaida, SKU, ankara...",
    secure_sign_out: "Ondoka Salama",
    complete_profile: "Kamilisha Wasifu",
    verify_identity: "Thibitisha Identity",
    switch_access_role: "Badilisha Jukumu la Ufikiaji",
    dashboard: "Dashibodi Kuu",
    products: "Bidhaa",
    categories: "Kategoria",
    cash_register: "Mashine ya Fedha",
    orders: "Maagizo ya Wasambazaji",
    sales: "POS ya Mauzo",
    customers: "Wasifu wa Wagonjwa",
    suppliers: "Saraka ya Wasambazaji",
    payments: "Fedha na Mauzo",
    reports: "Ripoti za Mfumo",
    settings: "Mipangilio ya Mfumo",
    ai_forecast: "Utabiri wa AI",
    profile: "Wasifu Wangu",
    todays_sales: "Mauzo ya Leo",
    available_categories: "Kategoria Zinazopatikana",
    expired_medicines: "Dawa Zilizopita Muda",
    system_users: "Watumiaji wa Mfumo",
    growth_rate: "kiwango cha ukuaji leo",
    percentage_growth: "mzunguko wa ukuaji uliotabiriwa",
    active: "Inafanya kazi",
    staff: "Wafanyakazi wa Zamu",
    recent_sales: "Miamala ya Hivi Karibuni",
    save_changes: "Hifadhi Mabadiliko",
    cancel: "Ghairi Shughuli",
    edit: "Hariri Wasifu",
    delete: "Futa Rekodi",
    loading: "Uchambuzi unaendelea...",
    empty_state: "Hakuna matokeo yaliyopatikana.",
    error_occurred: "Hitilafu ya unganisho la miamala.",
    add_product: "Sajili Bidhaa Mpya",
    stock_safety: "Kiwango cha akiba kimethibitishwa.",
    clinical_copilot: "Utabiri wa AI ya Kliniki",
    audit_logs: "Kumbukumbu za Usalama",
    notification_preferences: "Mipangilio ya Arifa",
    personal_info: "Taarifa Binafsi",
    phone_number: "Nambari ya Simu",
    med_specialty: "Eneo la Kliniki / Wasifu",
    language_label: "Lugha Iliyochaguliwa",
    choose_language: "Chagua Lugha"
  }
};
