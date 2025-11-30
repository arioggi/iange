import React from 'react';
import { Oportunidad, DocumentoStatus, ChecklistStatus, User, Plan, Log, UserPermissions, Empresa, Propiedad, Propietario } from './types';
import { BuildingOfficeIcon, PresentationChartLineIcon, ChartBarIcon, ClipboardDocumentCheckIcon, UsersIcon, UserGroupIcon, BanknotesIcon, DocumentTextIcon, ShieldCheckIcon } from './components/Icons';
import { initialKycState } from './components/clientes/KycPldForm';

export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  IANGE_ADMIN: 'iangeadmin',
  EMPRESA: 'empresa',
  ADMIN_EMPRESA: 'adminempresa',
  ADMINISTRADOR: 'administrador', // Kept for logic that might differentiate
  ASESOR: 'asesor',
  GESTOR: 'gestor',
  NOTARIA: 'notaria',
};

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.IANGE_ADMIN]: 'IANGE Admin',
  [ROLES.EMPRESA]: 'Empresa',
  [ROLES.ADMIN_EMPRESA]: 'Admin Empresa',
  [ROLES.ADMINISTRADOR]: 'Administrador',
  [ROLES.ASESOR]: 'Asesor',
  [ROLES.GESTOR]: 'Gestor',
  [ROLES.NOTARIA]: 'Notaría',
};

export const ROLE_MIGRATION_MAP: Record<string, string> = {
  'Super Admin': ROLES.SUPER_ADMIN,
  'superadmin': ROLES.SUPER_ADMIN,
  'IANGE Admin': ROLES.IANGE_ADMIN,
  'iangeadmin': ROLES.IANGE_ADMIN,
  'Cuenta Empresa': ROLES.EMPRESA,
  'cuentaempresa': ROLES.EMPRESA,
  'Admin Empresa': ROLES.ADMIN_EMPRESA,
  'adminempresa': ROLES.ADMIN_EMPRESA,
  'Administrador': ROLES.ADMIN_EMPRESA, // Mapping old "Administrador" to "Admin Empresa"
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
  [ROLES.EMPRESA]: '/oportunidades',
  [ROLES.ADMIN_EMPRESA]: '/oportunidades',
  [ROLES.ADMINISTRADOR]: '/oportunidades',
  [ROLES.ASESOR]: '/catalogo',
  [ROLES.GESTOR]: '/progreso',
  [ROLES.NOTARIA]: '/reportes',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  [ROLES.SUPER_ADMIN]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: true, equipo: true },
  [ROLES.IANGE_ADMIN]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: true, equipo: true },
  [ROLES.EMPRESA]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: true, equipo: true },
  [ROLES.ADMIN_EMPRESA]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: true, equipo: true },
  [ROLES.ADMINISTRADOR]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: true, equipo: false },
  [ROLES.ASESOR]: { propiedades: true, contactos: true, operaciones: true, documentosKyc: true, reportes: false, equipo: false },
  [ROLES.GESTOR]: { propiedades: false, contactos: false, operaciones: true, documentosKyc: true, reportes: false, equipo: false },
  [ROLES.NOTARIA]: { propiedades: false, contactos: false, operaciones: true, documentosKyc: true, reportes: false, equipo: false },
};

export const PERMISSION_PATH_MAP: Record<keyof UserPermissions, string[]> = {
  propiedades: ['/catalogo'],
  contactos: ['/clientes'],
  operaciones: ['/oportunidades', '/progreso'],
  documentosKyc: [], // No tiene una ruta directa en el menú, se controla dentro de las vistas.
  reportes: ['/reportes'],
  equipo: ['/configuraciones/personal'],
};

const ALL_PATHS = [
    '/', '/oportunidades', '/clientes', '/catalogo', '/progreso', '/reportes', '/crm',
    '/configuraciones', '/configuraciones/mi-perfil', '/configuraciones/perfil', '/configuraciones/personal', '/configuraciones/facturacion',
    '/superadmin', '/superadmin/empresas', '/superadmin/usuarios-globales', '/superadmin/planes', '/superadmin/configuracion', '/superadmin/reportes-globales', '/superadmin/logs'
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
}

interface DashboardButton {
  label: string;
  path: string;
  name: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', path: '/oportunidades', permissionKey: 'operaciones' },
  { name: 'Alta de clientes', path: '/clientes', permissionKey: 'contactos' },
  { name: 'Catálogo', path: '/catalogo', permissionKey: 'propiedades' },
  { name: 'Progreso', path: '/progreso', permissionKey: 'operaciones' },
  { name: 'Reportes', path: '/reportes', permissionKey: 'reportes' },
  { name: 'CRM', path: '/crm' },
];

export const SETTINGS_MENU_ITEM: MenuItem = {
    name: 'Configuraciones',
    path: '/configuraciones',
};

export const SETTINGS_MENU_ITEMS: MenuItem[] = [
    { name: 'Configuración de mi perfil', path: '/configuraciones/mi-perfil' },
    { name: 'Perfil de empresa', path: '/configuraciones/perfil' },
    { name: 'Personal', path: '/configuraciones/personal', permissionKey: 'equipo' },
    { name: 'Facturación', path: '/configuraciones/facturacion' },
];

// --- SUPER ADMIN CONSTANTS ---

export const SUPERADMIN_MENU_ITEMS: MenuItem[] = [
    { name: 'Inicio', path: '/superadmin' },
    { name: 'Empresas', path: '/superadmin/empresas' },
    { name: 'Usuarios Globales', path: '/superadmin/usuarios-globales' },
    { name: 'Planes y Facturación', path: '/superadmin/planes' },
    { name: 'Configuración del Sistema', path: '/superadmin/configuracion' },
    { name: 'Reportes Globales', path: '/superadmin/reportes-globales' },
    { name: 'Logs y Auditoría', path: '/superadmin/logs' },
];

export const SUPERADMIN_REPORTS_LIST = [
  { id: 'actividad-empresas', title: 'Actividad de Empresas', description: 'Analiza captaciones, propiedades y usuarios activos por empresa.', icon: BuildingOfficeIcon },
  { id: 'actividad-usuarios', title: 'Actividad de Usuarios Globales', description: 'Monitorea inicios de sesión, creaciones de propiedades y cierres.', icon: UserGroupIcon },
  { id: 'top-empresas', title: 'Top 5 Empresas por Volumen', description: 'Ranking de empresas con mayor cantidad de propiedades gestionadas.', icon: ChartBarIcon },
  { id: 'top-asesores', title: 'Top 5 Asesores con Más Cierres', description: 'Ranking de los asesores más efectivos en todas las empresas.', icon: UsersIcon },
];


export const MOCK_PLANS: Plan[] = [
    { id: 1, nombre: 'Starter', precio: '$0', limiteUsuarios: 5, limitePropiedades: 50, estado: 'Activo' },
    { id: 2, nombre: 'Business', precio: '$99 / mes', limiteUsuarios: 25, limitePropiedades: 500, estado: 'Activo' },
    { id: 3, nombre: 'Enterprise', precio: '$299 / mes', limiteUsuarios: 100, limitePropiedades: 'Ilimitado', estado: 'Activo' },
];

export const MOCK_LOGS: Log[] = [
    { id: 1, fecha: '2024-10-26 10:00:15', usuario: 'Ariel Poggi', rol: 'superadmin', accion: 'Creó la empresa "Asesores y Casas"', resultado: 'Éxito' },
    { id: 2, fecha: '2024-10-26 10:05:22', usuario: 'Katya Huitrón', rol: 'adminempresa', accion: 'Creó al usuario "Juan Pérez"', resultado: 'Éxito' },
    { id: 3, fecha: '2024-10-26 11:30:00', usuario: 'Juan Pérez', rol: 'asesor', accion: 'Registró propiedad en Calle Ibiza', resultado: 'Éxito' },
    { id: 4, fecha: '2024-10-25 15:12:45', usuario: 'Ariel Poggi', rol: 'superadmin', accion: 'Actualizó el Plan Business', resultado: 'Éxito' },
    { id: 5, fecha: '2024-10-25 09:00:00', usuario: 'Ariel Poggi', rol: 'superadmin', accion: 'Suspendió la empresa "Propiedades del Norte"', resultado: 'Éxito' },
    { id: 6, fecha: '2024-10-24 18:20:10', usuario: 'María García', rol: 'asesor', accion: 'Cerró la venta de Privada Constanza', resultado: 'Éxito' },
    { id: 7, fecha: '2024-10-24 14:03:50', usuario: 'Carlos Fernández', rol: 'adminempresa', accion: 'Intento de eliminar usuario fallido', resultado: 'Error' },
];

// --- END SUPER ADMIN ---


export const PRIMARY_DASHBOARD_BUTTONS: DashboardButton[] = [
    { label: "Dashboard", path: '/oportunidades', name: 'Dashboard' },
    { label: "Alta de Clientes", path: '/clientes', name: 'Alta de clientes' },
    { label: "Catálogo", path: '/catalogo', name: 'Catálogo' },
    { label: "Progreso", path: '/progreso', name: 'Progreso' },
    { label: "Reportes", path: '/reportes', name: 'Reportes' },
    { label: "CRM", path: '/crm', name: 'CRM' },
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
    'Venta Concluida'
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
    ] as { key: keyof ChecklistStatus, label: string }[],
  },
  {
    nombre: '2. Promoción',
    items: [
      { key: 'fichaTecnicaGenerada', label: 'Ficha técnica generada' },
      { key: 'publicadaEnPortales', label: 'Publicada en portales' },
      { key: 'campanasMarketing', label: 'Campañas de marketing registradas' },
      { key: 'seguimientoEnCurso', label: 'Seguimiento en curso' },
    ] as { key: keyof ChecklistStatus, label: string }[],
  },
  {
    nombre: '3. Separación',
    items: [
      { key: 'compradorInteresado', label: 'Comprador interesado registrado' },
      { key: 'documentosCompradorCompletos', label: 'Documentos y KYC del comprador completados' },
      { key: 'propiedadSeparada', label: 'Propiedad marcada como "Separada"' },
      { key: 'checklistTramitesIniciado', label: 'Checklist de trámites iniciado' },
    ] as { key: keyof ChecklistStatus, label: string }[],
  },
  {
    nombre: '4. Venta concluida',
    items: [
      { key: 'contratoGenerado', label: 'Contrato generado' },
      { key: 'firmaCompletada', label: 'Firma Concluida' },
      { key: 'ventaConcluida', label: 'Venta marcada como “concluida”' },
      { key: 'seguimientoPostventa', label: 'Seguimiento postventa registrado' },
    ] as { key: keyof ChecklistStatus, label: string }[],
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
    description: 'Monitorea el estado de las validaciones de identidad y el cumplimiento normativo.',
    icon: ShieldCheckIcon,
  },
];

export const MOCK_OPORTUNIDAD: Oportunidad = {
  id: 1,
  nombrePropiedad: 'Casa en Cumbres',
  vendedor: { nombre: 'Juan Pérez' },
  etapa: 2,
  documentosVendedor: [
    { id: 1, nombre: 'Identificación Oficial', categoria: 'Identificación', status: DocumentoStatus.PENDIENTE, archivos: [] },
    { id: 2, nombre: 'Comprobante de Domicilio', categoria: 'Domicilio', status: DocumentoStatus.PENDIENTE, archivos: [] },
    { id: 3, nombre: 'Acta de Matrimonio', categoria: 'Estado Civil', status: DocumentoStatus.PENDIENTE, archivos: [] },
    { id: 4, nombre: 'Escrituras de la Propiedad', categoria: 'Propiedad', status: DocumentoStatus.VALIDADO, archivos: [] },
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

const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);

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
    empresas: [
        {
            id: 100,
            nombre: 'Empresa de Prueba (Demo)',
            ownerEmail: 'empresaprueba@iange.xyz',
            telefono: '8180123456',
            fechaRegistro: '2024-01-15T09:00:00Z',
            estado: 'Activo',
            propiedadesRegistradas: 5,
            dominio: 'https://www.empresaprueba.com',
            onboarded: true,
            requiereAprobacionPublicar: false,
            requiereAprobacionCerrar: true,
        },
    ] as Empresa[],
    users: [
        { id: 2, photo: 'EP', name: 'Usuario Prueba', email: 'empresaprueba@iange.xyz', phone: '8187654321', role: ROLES.EMPRESA, password: 'hashedpassword', tenantId: '1', permissions: ROLE_DEFAULT_PERMISSIONS.empresa },
        { id: 4, photo: 'JP', name: 'Juan Pérez', email: 'juan.perez@empresa.com', phone: '5587654321', role: ROLES.ASESOR, password: 'hashedpassword', tenantId: '1', permissions: ROLE_DEFAULT_PERMISSIONS.asesor },
    ] as User[],
    propietarios: [
        { ...initialKycState, id: 1, nombreCompleto: 'Juan Pérez', email: 'juan.perez@email.com', rfc: 'PEPJ800101' },
        { ...initialKycState, id: 2, nombreCompleto: 'María García', email: 'maria.garcia@email.com', rfc: 'GAGM850202' },
        { ...initialKycState, id: 3, nombreCompleto: 'Carlos Rodríguez', email: 'carlos.r@email.com', rfc: 'ROGC900303' },
        { ...initialKycState, id: 4, nombreCompleto: 'Ana Martínez', email: 'ana.martinez@email.com', rfc: 'MARA950404' },
        { ...initialKycState, id: 5, nombreCompleto: 'Luis Hernández', email: 'luis.h@email.com', rfc: 'HERL750505' },
    ] as Propietario[],
    propiedades: [
        { id: 101, propietarioId: 1, asesorId: 4, calle: 'Calle Ibiza', numero_exterior: '123', colonia: 'Cumbres', municipio: 'Monterrey', estado: 'Nuevo León', codigo_postal: '64610', pais: 'México', tipo_inmueble: 'Casa', valor_operacion: '3500000', fotos: [], fecha_captacion: '2024-05-10T10:00:00Z', fecha_venta: '2024-07-20T15:00:00Z', compradorId: 201, checklist: generateChecklist(100), progreso: 100, status: 'Vendida', fuente_captacion: 'Recomendación', visitas: [], comisionOficina: 70000, comisionAsesor: 35000, fichaTecnicaPdf: '' },
        { id: 102, propietarioId: 2, asesorId: 4, calle: 'Av. Fundidora', numero_exterior: '501', colonia: 'Obrera', municipio: 'Monterrey', estado: 'Nuevo León', codigo_postal: '64010', pais: 'México', tipo_inmueble: 'Departamento', valor_operacion: '2200000', fotos: [], fecha_captacion: '2024-06-15T11:00:00Z', fecha_venta: null, compradorId: null, checklist: generateChecklist(50), progreso: 50, status: 'En Promoción', fuente_captacion: 'Portal Web', visitas: [], comisionOficina: 44000, comisionAsesor: 22000, fichaTecnicaPdf: '' },
        { id: 103, propietarioId: 3, asesorId: 2, calle: 'Privada Constanza', numero_exterior: '45', colonia: 'Del Valle', municipio: 'San Pedro Garza García', estado: 'Nuevo León', codigo_postal: '66220', pais: 'México', tipo_inmueble: 'Casa', valor_operacion: '7800000', fotos: [], fecha_captacion: '2024-07-01T12:00:00Z', fecha_venta: null, compradorId: null, checklist: generateChecklist(25), progreso: 25, status: 'Validación Pendiente', fuente_captacion: 'Redes Sociales', visitas: [], comisionOficina: 156000, comisionAsesor: 78000, fichaTecnicaPdf: '' },
    ] as Propiedad[],
};

// Exporting these separately for components that might still use them directly during transition.
export const MOCK_EMPRESAS = DEMO_SEED.empresas;
export const USERS = DEMO_SEED.users;