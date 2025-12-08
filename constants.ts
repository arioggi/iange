import React from 'react';
import {
  Oportunidad,
  DocumentoStatus,
  ChecklistStatus,
  User,
  Plan,
  Log,
  UserPermissions,
  Empresa,
  Propiedad,
  Propietario
} from './types';
import {
  BuildingOfficeIcon,
  PresentationChartLineIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  UserGroupIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  UserIcon
} from './components/Icons';
import { initialKycState } from './components/clientes/KycPldForm';

// =================== ROLES ===================

// Valores canon de roles
export const ROLES = {
  // Panel global IANGE
  SUPER_ADMIN: 'superadmin',
  IANGE_ADMIN: 'iangeadmin',

  // Roles dentro de una empresa
  CUENTA_EMPRESA: 'cuentaempresa',   // Cuenta de Empresa
  ADMIN_EMPRESA: 'adminempresa',     // Administrador de Empresa
  ASESOR: 'asesor',
  GESTOR: 'gestor',
  NOTARIA: 'notaria',

  // --- Aliases legacy para no romper código viejo ---
  // Antes se usaba ROLES.EMPRESA => lo mapeamos a CUENTA_EMPRESA
  EMPRESA: 'cuentaempresa',
  // Antes se usaba ROLES.ADMINISTRADOR => lo mapeamos a ADMIN_EMPRESA
  ADMINISTRADOR: 'adminempresa',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.IANGE_ADMIN]: 'IANGE Admin',
  [ROLES.CUENTA_EMPRESA]: 'Cuenta de Empresa',
  [ROLES.ADMIN_EMPRESA]: 'Administrador de Empresa',
  [ROLES.ASESOR]: 'Asesor',
  [ROLES.GESTOR]: 'Gestor',
  [ROLES.NOTARIA]: 'Notaría',
};

// Para normalizar textos viejos o mal escritos a los valores canon de ROLES
export const ROLE_MIGRATION_MAP: Record<string, string> = {
  // Super Admin
  'Super Admin': ROLES.SUPER_ADMIN,
  'superadmin': ROLES.SUPER_ADMIN,
  'SUPER_ADMIN': ROLES.SUPER_ADMIN,

  // IANGE Admin
  'IANGE Admin': ROLES.IANGE_ADMIN,
  'iangeadmin': ROLES.IANGE_ADMIN,
  'IANGE_ADMIN': ROLES.IANGE_ADMIN,

  // Cuenta de Empresa / Empresa
  'Cuenta de Empresa': ROLES.CUENTA_EMPRESA,
  'Cuenta Empresa': ROLES.CUENTA_EMPRESA,
  'Empresa': ROLES.CUENTA_EMPRESA,
  'empresa': ROLES.CUENTA_EMPRESA,
  'cuentaempresa': ROLES.CUENTA_EMPRESA,

  // Admin Empresa / Administrador
  'Admin Empresa': ROLES.ADMIN_EMPRESA,
  'Administrador de Empresa': ROLES.ADMIN_EMPRESA,
  'Administrador': ROLES.ADMIN_EMPRESA,
  'adminempresa': ROLES.ADMIN_EMPRESA,
  'administrador': ROLES.ADMIN_EMPRESA,

  // Asesor
  'Asesor': ROLES.ASESOR,
  'asesor': ROLES.ASESOR,

  // Gestor
  'Gestor': ROLES.GESTOR,
  'gestor': ROLES.GESTOR,

  // Notaría
  'Notaría': ROLES.NOTARIA,
  'Notaria': ROLES.NOTARIA,
  'notaria': ROLES.NOTARIA,
};

// =================== RUTAS POR DEFECTO ===================

export const DEFAULT_ROUTES: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: '/superadmin',
  [ROLES.IANGE_ADMIN]: '/iange-admin',
  [ROLES.CUENTA_EMPRESA]: '/oportunidades',
  [ROLES.ADMIN_EMPRESA]: '/oportunidades',
  [ROLES.ASESOR]: '/catalogo',
  [ROLES.GESTOR]: '/progreso',
  [ROLES.NOTARIA]: '/reportes',
};

// =================== PERMISOS POR ROL ===================

export const ROLE_DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  [ROLES.SUPER_ADMIN]: {
    dashboard: true,
    contactos: true,
    propiedades: true,
    progreso: true,
    reportes: true,
    crm: true,
    equipo: true,
  },
  [ROLES.IANGE_ADMIN]: {
    dashboard: true,
    contactos: true,
    propiedades: true,
    progreso: true,
    reportes: true,
    crm: true,
    equipo: true,
  },
  [ROLES.CUENTA_EMPRESA]: {
    dashboard: true,
    contactos: true,
    propiedades: true,
    progreso: true,
    reportes: true,
    crm: true,
    equipo: true,
  },
  [ROLES.ADMIN_EMPRESA]: {
    dashboard: true,
    contactos: true,
    propiedades: true,
    progreso: true,
    reportes: true,
    crm: true,
    equipo: true,
  },
  [ROLES.ASESOR]: {
    dashboard: true,
    contactos: true,
    propiedades: true,
    progreso: true,
    reportes: false,
    crm: true,
    equipo: false,
  },
  [ROLES.GESTOR]: {
    dashboard: true,
    contactos: false,
    propiedades: false,
    progreso: true,
    reportes: false,
    crm: false,
    equipo: false,
  },
  [ROLES.NOTARIA]: {
    dashboard: false,
    contactos: false,
    propiedades: false,
    progreso: true,
    reportes: false,
    crm: false,
    equipo: false,
  },
};

export const PERMISSION_PATH_MAP: Record<keyof UserPermissions, string[]> = {
  dashboard: ['/oportunidades'],
  contactos: ['/clientes'],
  propiedades: ['/catalogo'],
  progreso: ['/progreso'],
  reportes: ['/reportes'],
  crm: ['/crm'],
  equipo: ['/configuraciones/personal'],
};

const ALL_PATHS = [
  '/',
  '/oportunidades',
  '/clientes',
  '/catalogo',
  '/progreso',
  '/reportes',
  '/crm',
  '/configuraciones',
  '/configuraciones/mi-perfil',
  '/configuraciones/perfil',
  '/configuraciones/personal',
  '/configuraciones/facturacion',
  '/superadmin',
  '/superadmin/empresas',
  '/superadmin/usuarios-globales',
  '/superadmin/planes',
  '/superadmin/configuracion',
  '/superadmin/reportes-globales',
  '/superadmin/logs',
];

// Este objeto se mantiene para roles que no usan el nuevo sistema de permisos (superadmin)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PATHS,
  // Los roles de empresa ahora se gestionan con `user.permissions`
};

interface MenuItem {
  name: string;
  path: string;
  permissionKey?: keyof UserPermissions;
  icon?: React.FC<{ className?: string }>;
}

interface DashboardButton {
  label: string;
  path: string;
  name: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', path: '/oportunidades', permissionKey: 'dashboard', icon: ChartBarIcon },
  { name: 'Alta de clientes', path: '/clientes', permissionKey: 'contactos', icon: UserGroupIcon },
  { name: 'Catálogo', path: '/catalogo', permissionKey: 'propiedades', icon: BuildingOfficeIcon },
  { name: 'Progreso', path: '/progreso', permissionKey: 'progreso', icon: PresentationChartLineIcon },
  { name: 'Reportes', path: '/reportes', permissionKey: 'reportes', icon: DocumentTextIcon },
  { name: 'CRM', path: '/crm', permissionKey: 'crm', icon: UsersIcon }, 
];

export const SETTINGS_MENU_ITEM: MenuItem = {
  name: 'Configuraciones',
  path: '/configuraciones',
  icon: Cog6ToothIcon
};

export const SETTINGS_MENU_ITEMS: MenuItem[] = [
  { name: 'Mi perfil', path: '/configuraciones/mi-perfil', icon: UserIcon },
  { name: 'Perfil de empresa', path: '/configuraciones/perfil', icon: BuildingOfficeIcon },
  { name: 'Personal', path: '/configuraciones/personal', permissionKey: 'equipo', icon: UserGroupIcon },
  { name: 'Facturación', path: '/configuraciones/facturacion', icon: BanknotesIcon },
];

// --- SUPER ADMIN CONSTANTS ---

export const SUPERADMIN_MENU_ITEMS: MenuItem[] = [
  { name: 'Inicio', path: '/superadmin', icon: ChartBarIcon },
  { name: 'Empresas', path: '/superadmin/empresas', icon: BuildingOfficeIcon },
  { name: 'Usuarios Globales', path: '/superadmin/usuarios-globales', icon: GlobeAltIcon },
  { name: 'Planes y Facturación', path: '/superadmin/planes', icon: BanknotesIcon },
  { name: 'Configuración', path: '/superadmin/configuracion', icon: Cog6ToothIcon },
  { name: 'Reportes Globales', path: '/superadmin/reportes-globales', icon: DocumentTextIcon },
  { name: 'Logs y Auditoría', path: '/superadmin/logs', icon: ShieldCheckIcon },
];

export const SUPERADMIN_REPORTS_LIST = [
  {
    id: 'actividad-empresas',
    title: 'Actividad de Empresas',
    description: 'Analiza captaciones, propiedades y usuarios activos por empresa.',
    icon: BuildingOfficeIcon,
  },
  {
    id: 'actividad-usuarios',
    title: 'Actividad de Usuarios Globales',
    description: 'Monitorea inicios de sesión, creaciones de propiedades y cierres.',
    icon: UserGroupIcon,
  },
  {
    id: 'top-empresas',
    title: 'Top 5 Empresas por Volumen',
    description: 'Ranking de empresas con mayor cantidad de propiedades gestionadas.',
    icon: ChartBarIcon,
  },
  {
    id: 'top-asesores',
    title: 'Top 5 Asesores con Más Cierres',
    description: 'Ranking de los asesores más efectivos en todas las empresas.',
    icon: UsersIcon,
  },
];

export const MOCK_PLANS: Plan[] = [
  { id: 1, nombre: 'Starter', precio: '$0', limiteUsuarios: 5, limitePropiedades: 50, estado: 'Activo' },
  { id: 2, nombre: 'Business', precio: '$99 / mes', limiteUsuarios: 25, limitePropiedades: 500, estado: 'Activo' },
  { id: 3, nombre: 'Enterprise', precio: '$299 / mes', limiteUsuarios: 100, limitePropiedades: 'Ilimitado', estado: 'Activo' },
];

export const MOCK_LOGS: Log[] = [
  {
    id: 1,
    fecha: '2024-10-26 10:00:15',
    usuario: 'Ariel Poggi',
    rol: 'superadmin',
    accion: 'Creó la empresa "Asesores y Casas"',
    resultado: 'Éxito',
  },
  {
    id: 2,
    fecha: '2024-10-26 10:05:22',
    usuario: 'Katya Huitrón',
    rol: 'adminempresa',
    accion: 'Creó al usuario "Juan Pérez"',
    resultado: 'Éxito',
  },
  {
    id: 3,
    fecha: '2024-10-26 11:30:00',
    usuario: 'Juan Pérez',
    rol: 'asesor',
    accion: 'Registró propiedad en Calle Ibiza',
    resultado: 'Éxito',
  },
  {
    id: 4,
    fecha: '2024-10-25 15:12:45',
    usuario: 'Ariel Poggi',
    rol: 'superadmin',
    accion: 'Actualizó el Plan Business',
    resultado: 'Éxito',
  },
  {
    id: 5,
    fecha: '2024-10-25 09:00:00',
    usuario: 'Ariel Poggi',
    rol: 'superadmin',
    accion: 'Suspendió la empresa "Propiedades del Norte"',
    resultado: 'Éxito',
  },
  {
    id: 6,
    fecha: '2024-10-24 18:20:10',
    usuario: 'María García',
    rol: 'asesor',
    accion: 'Cerró la venta de Privada Constanza',
    resultado: 'Éxito',
  },
  {
    id: 7,
    fecha: '2024-10-24 14:03:50',
    usuario: 'Carlos Fernández',
    rol: 'adminempresa',
    accion: 'Intento de eliminar usuario fallido',
    resultado: 'Error',
  },
];

// --- END SUPER ADMIN ---

// --- ACTUALIZACIÓN AQUÍ: Se agregaron las permissionKeys ---
export const PRIMARY_DASHBOARD_BUTTONS: (DashboardButton & { permissionKey?: keyof UserPermissions })[] = [
  { label: 'Dashboard', path: '/oportunidades', name: 'Dashboard', permissionKey: 'dashboard' },
  { label: 'Alta de Clientes', path: '/clientes', name: 'Alta de clientes', permissionKey: 'contactos' },
  { label: 'Catálogo', path: '/catalogo', name: 'Catálogo', permissionKey: 'propiedades' },
  { label: 'Progreso', path: '/progreso', name: 'Progreso', permissionKey: 'progreso' },
  { label: 'Reportes', path: '/reportes', name: 'Reportes', permissionKey: 'reportes' },
  { label: 'CRM', path: '/crm', name: 'CRM', permissionKey: 'crm' },
];

export const SECONDARY_DASHBOARD_BUTTONS: DashboardButton[] = [];

export const ETAPAS_FLUJO = [
  'Adquisición del Cliente',
  'Formularios y Documentos',
  'Validación de Datos',
  'Visita y Análisis',
  'Marketing',
  'Validación Comprador',
  'Tramitología',
  'Venta Concluida',
];

export const FLUJO_PROGRESO = [
  {
    nombre: '1. Captación',
    items: [
      { key: 'propiedadRegistrada', label: 'Propiedad registrada' },
      { key: 'propietarioRegistrado', label: 'Propietario registrado' },
      { key: 'documentacionCompleta', label: 'Documentación completa y validada (KYC/PLD)' },
      { key: 'entrevistaPLD', label: 'Entrevista PLD completada' },
      { key: 'propiedadVerificada', label: 'Propiedad verificada y activada' },
    ] as { key: keyof ChecklistStatus; label: string }[],
  },
  {
    nombre: '2. Promoción',
    items: [
      { key: 'fichaTecnicaGenerada', label: 'Ficha técnica generada' },
      { key: 'publicadaEnPortales', label: 'Publicada en portales' },
      { key: 'campanasMarketing', label: 'Campañas de marketing registradas' },
      { key: 'seguimientoEnCurso', label: 'Seguimiento en curso' },
    ] as { key: keyof ChecklistStatus; label: string }[],
  },
  {
    nombre: '3. Separación',
    items: [
      { key: 'compradorInteresado', label: 'Comprador interesado registrado' },
      { key: 'documentosCompradorCompletos', label: 'Documentos y KYC del comprador completados' },
      { key: 'propiedadSeparada', label: 'Propiedad marcada como "Separada"' },
      { key: 'checklistTramitesIniciado', label: 'Checklist de trámites iniciado' },
    ] as { key: keyof ChecklistStatus; label: string }[],
  },
  {
    nombre: '4. Venta concluida',
    items: [
      { key: 'contratoGenerado', label: 'Contrato generado' },
      { key: 'firmaCompletada', label: 'Firma Concluida' },
      { key: 'ventaConcluida', label: 'Venta marcada como “concluida”' },
      { key: 'seguimientoPostventa', label: 'Seguimiento postventa registrado' },
    ] as { key: keyof ChecklistStatus; label: string }[],
  },
];

export const REPORTS_LIST = [
  {
    id: 'captacion',
    title: 'Captación de Propiedades',
    description: 'Analiza la eficiencia en la adquisición de nuevas propiedades por mes, asesor y fuente.',
    icon: BuildingOfficeIcon,
  },
  {
    id: 'promocion',
    title: 'Promoción y Marketing',
    description: 'Mide el rendimiento de las propiedades en promoción y el resultado de tus campañas.',
    icon: PresentationChartLineIcon,
  },
  {
    id: 'operaciones',
    title: 'Avance de Operaciones',
    description: 'Visualiza el embudo de ventas y el tiempo promedio en cada etapa del proceso.',
    icon: ChartBarIcon,
  },
  {
    id: 'tramitologia',
    title: 'Tramitología',
    description: 'Sigue el estado de los procesos legales y la documentación de cada operación.',
    icon: ClipboardDocumentCheckIcon,
  },
  {
    id: 'asesor',
    title: 'Desempeño por Asesor',
    description: 'Evalúa las métricas de captación, ventas y tiempos de cierre por cada asesor.',
    icon: UsersIcon,
  },
  {
    id: 'compradores',
    title: 'Compradores',
    description: 'Gestiona y analiza el estatus y la calificación de los compradores registrados.',
    icon: UserGroupIcon,
  },
  {
    id: 'ventas',
    title: 'Ventas',
    description: 'Obtén un resumen financiero de las ventas por periodo, ingresos y valor promedio.',
    icon: BanknotesIcon,
  },
  {
    id: 'documentacion',
    title: 'Documentación',
    description: 'Identifica cuellos de botella en la recolección y validación de documentos.',
    icon: DocumentTextIcon,
  },
  {
    id: 'cumplimiento',
    title: 'Cumplimiento (KYC / PLD)',
    description:
      'Monitorea el estado de las validaciones de identidad y el cumplimiento normativo.',
    icon: ShieldCheckIcon,
  },
];

export const MOCK_OPORTUNIDAD: Oportunidad = {
  id: 1,
  nombrePropiedad: 'Casa en Cumbres',
  vendedor: { nombre: 'Juan Pérez' },
  etapa: 2,
  documentosVendedor: [
    {
      id: 1,
      nombre: 'Identificación Oficial',
      categoria: 'Identificación',
      status: DocumentoStatus.PENDIENTE,
      archivos: [],
    },
    {
      id: 2,
      nombre: 'Comprobante de Domicilio',
      categoria: 'Domicilio',
      status: DocumentoStatus.PENDIENTE,
      archivos: [],
    },
    {
      id: 3,
      nombre: 'Acta de Matrimonio',
      categoria: 'Estado Civil',
      status: DocumentoStatus.PENDIENTE,
      archivos: [],
    },
    {
      id: 4,
      nombre: 'Escrituras de la Propiedad',
      categoria: 'Propiedad',
      status: DocumentoStatus.VALIDADO,
      archivos: [],
    },
  ],
  documentosComprador: [],
  validacionVendedor: {
    curp: false,
    rfc: false,
    listasNegras: false,
  },
  validacionComprador: {
    curp: false,
    rfc: false,
    listasNegras: false,
  },
};

// --- MOCK DATA FOR DEMO TENANT ---

const totalChecklistItems = FLUJO_PROGRESO.reduce(
  (acc, etapa) => acc + etapa.items.length,
  0
);

const generateChecklist = (progressPercentage: number): ChecklistStatus => {
  const itemsToComplete = Math.floor((progressPercentage / 100) * totalChecklistItems);
  let completedCount = 0;
  const checklist: Partial<ChecklistStatus> = {};
  for (const etapa of FLUJO_PROGRESO) {
    for (const item of etapa.items) {
      if (completedCount < itemsToComplete) {
        checklist[item.key] = true;
        completedCount++;
      } else {
        checklist[item.key] = false;
      }
    }
  }
  return checklist as ChecklistStatus;
};

export const DEMO_SEED = {
  empresas: [] as Empresa[],
  users: [] as User[],
  propietarios: [] as Propietario[],
  propiedades: [] as Propiedad[],
};

// Exporting these separately for components that might still use them directly during transition.
export const MOCK_EMPRESAS = DEMO_SEED.empresas;
export const USERS = DEMO_SEED.users;