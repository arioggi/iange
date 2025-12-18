import React from 'react';
import {
  Oportunidad,
  DocumentoStatus,
  ChecklistStatus,
  UserPermissions,
  Empresa,
  Propiedad,
  Propietario,
  Plan,
  Log,
  KycData,
  User,
  OfferData 
} from './types';
import {
  BuildingOfficeIcon,
  PresentationChartLineIcon,
  ChartBarIcon,
  UsersIcon,
  UserGroupIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  UserIcon,
  ClipboardDocumentCheckIcon
} from './components/Icons';

// =================== ROLES ===================
export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  IANGE_ADMIN: 'iangeadmin',
  CUENTA_EMPRESA: 'cuentaempresa',
  ADMIN_EMPRESA: 'adminempresa',
  ASESOR: 'asesor',
  GESTOR: 'gestor',
  NOTARIA: 'notaria',
  EMPRESA: 'cuentaempresa',
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

export const ROLE_MIGRATION_MAP: Record<string, string> = {
  'Super Admin': ROLES.SUPER_ADMIN,
  'superadmin': ROLES.SUPER_ADMIN,
  'SUPER_ADMIN': ROLES.SUPER_ADMIN,
  'IANGE Admin': ROLES.IANGE_ADMIN,
  'iangeadmin': ROLES.IANGE_ADMIN,
  'IANGE_ADMIN': ROLES.IANGE_ADMIN,
  'Cuenta de Empresa': ROLES.CUENTA_EMPRESA,
  'Cuenta Empresa': ROLES.CUENTA_EMPRESA,
  'Empresa': ROLES.CUENTA_EMPRESA,
  'empresa': ROLES.CUENTA_EMPRESA,
  'cuentaempresa': ROLES.CUENTA_EMPRESA,
  'Admin Empresa': ROLES.ADMIN_EMPRESA,
  'Administrador de Empresa': ROLES.ADMIN_EMPRESA,
  'Administrador': ROLES.ADMIN_EMPRESA,
  'adminempresa': ROLES.ADMIN_EMPRESA,
  'administrador': ROLES.ADMIN_EMPRESA,
  'Asesor': ROLES.ASESOR,
  'asesor': ROLES.ASESOR,
  'Gestor': ROLES.GESTOR,
  'gestor': ROLES.GESTOR,
  'Notaría': ROLES.NOTARIA,
  'Notaria': ROLES.NOTARIA,
  'notaria': ROLES.NOTARIA,
};

export const DEFAULT_ROUTES: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: '/superadmin',
  [ROLES.IANGE_ADMIN]: '/iange-admin',
  [ROLES.CUENTA_EMPRESA]: '/oportunidades',
  [ROLES.ADMIN_EMPRESA]: '/oportunidades',
  [ROLES.ASESOR]: '/catalogo',
  [ROLES.GESTOR]: '/progreso',
  [ROLES.NOTARIA]: '/reportes',
};

// --- CORRECCIÓN CLAVE: Agregamos billing_edit a todos los roles ---
export const ROLE_DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  [ROLES.SUPER_ADMIN]: { dashboard: true, contactos: true, propiedades: true, progreso: true, reportes: true, crm: true, equipo: true, billing_edit: true },
  [ROLES.IANGE_ADMIN]: { dashboard: true, contactos: true, propiedades: true, progreso: true, reportes: true, crm: true, equipo: true, billing_edit: true },
  [ROLES.CUENTA_EMPRESA]: { dashboard: true, contactos: true, propiedades: true, progreso: true, reportes: true, crm: true, equipo: true, billing_edit: true },
  [ROLES.ADMIN_EMPRESA]: { dashboard: true, contactos: true, propiedades: true, progreso: true, reportes: true, crm: true, equipo: true, billing_edit: true },
  [ROLES.ASESOR]: { dashboard: true, contactos: true, propiedades: true, progreso: true, reportes: false, crm: true, equipo: false, billing_edit: false },
  [ROLES.GESTOR]: { dashboard: true, contactos: false, propiedades: false, progreso: true, reportes: false, crm: false, equipo: false, billing_edit: false },
  [ROLES.NOTARIA]: { dashboard: false, contactos: false, propiedades: false, progreso: true, reportes: false, crm: false, equipo: false, billing_edit: false },
};

export const PERMISSION_PATH_MAP: Record<keyof UserPermissions, string[]> = {
  dashboard: ['/oportunidades'],
  contactos: ['/clientes'],
  propiedades: ['/catalogo'],
  progreso: ['/progreso'],
  reportes: ['/reportes'],
  crm: ['/crm'],
  equipo: ['/configuraciones/personal'],
  billing_edit: ['/configuraciones/facturacion'], // Agregamos el mapeo de ruta
};

const ALL_PATHS = [
  '/', '/oportunidades', '/clientes', '/catalogo', '/progreso', '/reportes', '/crm',
  '/configuraciones', '/configuraciones/mi-perfil', '/configuraciones/perfil',
  '/configuraciones/personal', '/configuraciones/facturacion',
  '/superadmin', '/superadmin/empresas', '/superadmin/usuarios-globales',
  '/superadmin/planes', '/superadmin/configuracion', '/superadmin/reportes-globales', '/superadmin/logs',
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PATHS,
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
  { name: 'Facturación', path: '/configuraciones/facturacion', permissionKey: 'billing_edit', icon: BanknotesIcon },
];

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
  { id: 'actividad-empresas', title: 'Actividad de Empresas', description: 'Analiza captaciones, propiedades y usuarios activos por empresa.', icon: BuildingOfficeIcon },
  { id: 'actividad-usuarios', title: 'Actividad de Usuarios Globales', description: 'Monitorea inicios de sesión, creaciones de propiedades y cierres.', icon: UserGroupIcon },
  { id: 'top-empresas', title: 'Top 5 Empresas por Volumen', description: 'Ranking de empresas con mayor cantidad de propiedades gestionadas.', icon: ChartBarIcon },
  { id: 'top-asesores', title: 'Top 5 Asesores con Más Cierres', description: 'Ranking de los asesores más efectivos en todas las empresas.', icon: UsersIcon },
];

// --- PLANES ---
export const MOCK_PLANS: Plan[] = [
  { 
    id: 1, 
    nombre: 'Starter', 
    precio: '$499 MXN', 
    limiteUsuarios: 5, 
    limitePropiedades: 50, 
    estado: 'Activo',
    stripePriceId: 'price_1Sfl2DJxBv7KwQkgeHBjM8Fj' 
  },
  { 
    id: 2, 
    nombre: 'Business', 
    precio: '$1,999 MXN / mes', 
    limiteUsuarios: 25, 
    limitePropiedades: 500, 
    estado: 'Activo',
    stripePriceId: 'price_1Sfl47JxBv7KwQkgCFgM7oyg' 
  },
  { 
    id: 3, 
    nombre: 'Enterprise', 
    precio: '$5,999 MXN / mes', 
    limiteUsuarios: 100, 
    limitePropiedades: 'Ilimitado', 
    estado: 'Activo',
    stripePriceId: 'price_1Sfl4xJxBv7KwQkgLrvbK4zV'
  },
];

export const MOCK_LOGS: Log[] = [
  { id: 1, fecha: '2024-10-26 10:00:15', usuario: 'Ariel Poggi', rol: 'superadmin', accion: 'Creó la empresa "Asesores y Casas"', resultado: 'Éxito' },
];

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
  'Adquisición del Cliente', 'Formularios y Documentos', 'Validación de Datos', 'Visita y Análisis',
  'Marketing', 'Validación Comprador', 'Tramitología', 'Venta Concluida',
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
  { id: 'captacion', title: 'Captación de Propiedades', description: 'Analiza eficiencia en la adquisición.', icon: BuildingOfficeIcon },
  { id: 'promocion', title: 'Promoción y Marketing', description: 'Mide rendimiento de promoción.', icon: PresentationChartLineIcon },
  { id: 'operaciones', title: 'Avance de Operaciones', description: 'Visualiza embudo de ventas.', icon: ChartBarIcon },
  { id: 'tramitologia', title: 'Tramitología', description: 'Sigue estado de procesos legales.', icon: ClipboardDocumentCheckIcon },
  { id: 'asesor', title: 'Desempeño por Asesor', description: 'Evalúa métricas de captación y ventas.', icon: UsersIcon },
  { id: 'compradores', title: 'Compradores', description: 'Gestiona compradores registrados.', icon: UserGroupIcon },
  { id: 'ventas', title: 'Ventas', description: 'Resumen financiero de ventas.', icon: BanknotesIcon },
  { id: 'documentacion', title: 'Documentación', description: 'Identifica cuellos de botella.', icon: DocumentTextIcon },
  { id: 'cumplimiento', title: 'Cumplimiento (KYC / PLD)', description: 'Monitorea cumplimiento normativo.', icon: ShieldCheckIcon },
];

export const MOCK_OPORTUNIDAD: Oportunidad = {
  id: 1,
  nombrePropiedad: 'Casa en Cumbres',
  vendedor: { nombre: 'Juan Pérez' },
  etapa: 2,
  documentosVendedor: [],
  documentosComprador: [],
  validacionVendedor: { curp: false, rfc: false, listasNegras: false },
  validacionComprador: { curp: false, rfc: false, listasNegras: false },
};

export const initialKycState: KycData = {
    nombreCompleto: '', curp: '', rfc: '', fechaNacimiento: '', nacionalidad: 'Mexicana', estadoCivil: 'Soltero(a)', profesion: '', domicilio: '', colonia: '', municipio: '', cp: '', estado: '', telefono: '', email: '', identificacionOficialTipo: 'INE', identificacionOficialNumero: '',
    esPersonaMoral: false,
    actuaPorCuentaPropia: true,
    origenRecursos: 'Salario', destinoRecursos: 'Uso personal',
    esPep: false,
    fechaCita: '',
    horaCita: '',
    notasCita: '',
    asesorId: '',
};

export const DEMO_SEED = {
  empresas: [] as Empresa[],
  users: [] as User[], 
  propietarios: [] as Propietario[],
  propiedades: [] as Propiedad[],
};

export const MOCK_EMPRESAS = DEMO_SEED.empresas;
export const USERS = DEMO_SEED.users;

// --- NUEVO ESTADO INICIAL PARA OFERTA ---
export const initialOfferState: OfferData = {
  compradorId: '', 
  precioOfrecido: '',
  formaPago: 'Contado',
  institucionFinanciera: '',
  montoApartado: '',
  montoEnganche: '',
  saldoAFirma: '',
  vigenciaOferta: '',
  observaciones: ''
};