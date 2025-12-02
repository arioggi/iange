import React from 'react';

export enum UserRole {
  ASESOR = 'Asesor',
  ADMINISTRADOR = 'Administrador',
}

export enum DocumentoStatus {
  PENDIENTE = 'Pendiente',
  VALIDADO = 'Validado',
  RECHAZADO = 'Rechazado',
}

export interface Documento {
  id: number;
  nombre: string;
  categoria: string;
  status: DocumentoStatus;
  archivos: File[];
}

export interface Validacion {
  curp: boolean;
  rfc: boolean;
  listasNegras: boolean;
}

export interface Oportunidad {
  id: number;
  nombrePropiedad: string;
  vendedor: { nombre: string };
  comprador?: { nombre: string };
  etapa: number;
  documentosVendedor: Documento[];
  documentosComprador: Documento[];
  validacionVendedor: Validacion;
  validacionComprador: Validacion;
}

export interface UserPermissions {
  propiedades: boolean;
  contactos: boolean;
  operaciones: boolean;
  documentosKyc: boolean;
  reportes: boolean;
  equipo: boolean;
}

// --- ACTUALIZACIÓN CLAVE: IDs AHORA SON STRING | NUMBER ---
export interface User {
  id: number | string; // <--- CAMBIO AQUÍ (Soporta UUID de Supabase)
  photo: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
  empresaId?: number; 
  tenantId?: string | null; 
  permissions?: UserPermissions;
  zona?: string;
  mustChangePassword?: boolean;
}

export interface ChecklistStatus {
  propiedadRegistrada: boolean;
  propietarioRegistrado: boolean;
  documentacionCompleta: boolean;
  entrevistaPLD: boolean;
  propiedadVerificada: boolean;
  fichaTecnicaGenerada: boolean;
  publicadaEnPortales: boolean;
  campanasMarketing: boolean;
  seguimientoEnCurso: boolean;
  compradorInteresado: boolean;
  documentosCompradorCompletos: boolean;
  propiedadSeparada: boolean;
  checklistTramitesIniciado: boolean;
  contratoGenerado: boolean;
  firmaCompletada: boolean;
  ventaConcluida: boolean;
  seguimientoPostventa: boolean;
}

export interface Visita {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  formaPago: 'Contado' | 'Crédito Bancario' | 'Infonavit' | 'ISSSTE' | 'FOVISSSTE';
  ofertaCompra?: File;
  ofertaCompraUrl?: string;
  fecha: string;
}

export interface Propiedad {
  id: number; // Las propiedades locales siguen siendo number por ahora
  propietarioId: number;
  compradorId?: number | null;
  asesorId: number | string; // <--- CAMBIO AQUÍ (El asesor puede venir de Supabase)
  calle: string;
  numero_exterior: string;
  numero_interior?: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigo_postal: string;
  pais: string;
  tipo_inmueble: string; 
  valor_operacion: string;
  terreno_m2?: string;
  construccion_m2?: string;
  frente_m?: string;
  fondo_m?: string;
  recamaras?: number;
  banos_completos?: number;
  medios_banos?: number;
  cochera_autos?: number;
  descripcion_general?: string;
  caracteristicas_principales?: string;
  descripcion_breve?: string;
  forma_pago?: string;
  notas_adicionales?: string;
  ubicacion_destacada?: string;
  fotos: File[];
  fecha_captacion: string;
  fecha_venta: string | null;
  fichaTecnicaPdf: string;
  progreso: number;
  checklist: ChecklistStatus;
  fuente_captacion: string;
  status: 'Validación Pendiente' | 'En Promoción' | 'Separada' | 'Vendida';
  visitas: Visita[];
  comisionOficina?: number;
  comisionAsesor?: number;
  comisionCompartida?: number;
}

export interface KycData {
  nombreCompleto: string;
  curp: string;
  rfc: string;
  fechaNacimiento: string;
  nacionalidad: string;
  estadoCivil: string;
  regimenPatrimonial?: string;
  profesion: string;
  domicilio: string;
  colonia: string;
  municipio: string;
  cp: string;
  estado: string;
  telefono: string;
  email: string;
  identificacionOficialTipo: string;
  identificacionOficialNumero: string;
  esPersonaMoral: boolean;
  razonSocial?: string;
  rfcPm?: string;
  fechaConstitucion?: string;
  domicilioFiscal?: string;
  representanteLegal?: string;
  actuaPorCuentaPropia: boolean;
  beneficiarioFinalNombre?: string;
  origenRecursos: string;
  destinoRecursos: string;
  esPep: boolean;
  pepNombre?: string;
  pepCargo?: string;
}

export interface Propietario extends KycData {
  id: number;
}

export interface Comprador extends KycData {
  id: number;
  propiedadId?: number | null;
}

export interface CompanySettings {
  onboarded?: boolean;
  requiereAprobacionPublicar?: boolean;
  requiereAprobacionCerrar?: boolean;
  integracionWhatsapp?: boolean;
  integracionCorreo?: boolean;
  integracionPortales?: boolean;
}

export interface Tenant {
  id: string; // Tenants siempre han sido string (uuid simulado o real)
  nombre: string;
  ownerEmail: string;
  telefono?: string;
  fechaRegistro: string;
  estado: 'Activo' | 'Suspendido';
}

// --- ACTUALIZACIÓN CLAVE: Empresa soporta string en ID ---
export interface Empresa {
  id: string | number; // <--- CAMBIO AQUÍ
  nombre: string;
  ownerEmail: string;
  telefono: string;
  fechaRegistro: string;
  estado: 'Activo' | 'Suspendido';
  propiedadesRegistradas: number;
  dominio: string;
  onboarded?: boolean;
  requiereAprobacionPublicar?: boolean;
  requiereAprobacionCerrar?: boolean;
  integracionWhatsapp?: boolean;
  integracionCorreo?: boolean;
  integracionPortales?: boolean;
  rfc?: string;
  correoFacturacion?: string;
  clabe?: string;
  direccionCompleta?: string;
  zona?: string;
  moneda?: string;
  zonaHoraria?: string;
  idioma?: string;
}

export interface Plan {
  id: number;
  nombre: string;
  precio: string;
  limiteUsuarios: number | string;
  limitePropiedades: number | string;
  estado: 'Activo' | 'Inactivo';
}

export interface Log {
  id: number;
  fecha: string;
  usuario: string;
  rol: string;
  accion: string;
  resultado: 'Éxito' | 'Error';
}