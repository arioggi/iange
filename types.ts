import React from 'react';

// Fix: Removed incorrect import of 'Oportunidad' from './constants' to resolve a circular dependency.
// The 'Oportunidad' interface is defined within this file.

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

export interface User {
  id: number;
  photo: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
  empresaId?: number; // Legacy, tenantId is now the source of truth
  tenantId?: string | null; // Null for superadmins
  permissions?: UserPermissions;
  zona?: string;
  mustChangePassword?: boolean;
}

export interface ChecklistStatus {
  // Etapa 1: Captación
  propiedadRegistrada: boolean;
  propietarioRegistrado: boolean;
  documentacionCompleta: boolean;
  entrevistaPLD: boolean;
  propiedadVerificada: boolean;
  // Etapa 2: Promoción
  fichaTecnicaGenerada: boolean;
  publicadaEnPortales: boolean;
  campanasMarketing: boolean;
  seguimientoEnCurso: boolean;
  // Etapa 3: Separación
  compradorInteresado: boolean;
  documentosCompradorCompletos: boolean;
  propiedadSeparada: boolean;
  checklistTramitesIniciado: boolean;
  // Etapa 4: Venta concluida
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
  id: number;
  propietarioId: number;
  compradorId?: number | null;
  asesorId: number;
  // Datos de la propiedad
  calle: string;
  numero_exterior: string;
  numero_interior?: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigo_postal: string;
  pais: string;
  // Detalles adicionales para ficha técnica
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
  fichaTecnicaPdf: string; // Almacenará el PDF como Data URL
  // Sistema de Progreso
  progreso: number; // 0, 25, 50, 75, 100
  checklist: ChecklistStatus;
  fuente_captacion: string;
  status: 'Validación Pendiente' | 'En Promoción' | 'Separada' | 'Vendida';
  // Visitas
  visitas: Visita[];
  // Comisiones
  comisionOficina?: number;
  comisionAsesor?: number;
  comisionCompartida?: number;
}


export interface KycData {
  // Datos de identificación (Persona Física)
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

  // Datos de identificación (Persona Moral)
  esPersonaMoral: boolean;
  razonSocial?: string;
  rfcPm?: string;
  fechaConstitucion?: string;
  domicilioFiscal?: string;
  representanteLegal?: string;

  // Beneficiario Final
  actuaPorCuentaPropia: boolean;
  beneficiarioFinalNombre?: string;

  // Origen y Destino de los Recursos
  origenRecursos: string;
  destinoRecursos: string;

  // Declaración PEP
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

// --- Super Admin Types ---

export interface CompanySettings {
  onboarded?: boolean;
  // Integrations, preferences, etc. would go here
  requiereAprobacionPublicar?: boolean;
  requiereAprobacionCerrar?: boolean;
  integracionWhatsapp?: boolean;
  integracionCorreo?: boolean;
  integracionPortales?: boolean;
}

export interface Tenant {
  id: string; // Unique tenant identifier (e.g., timestamp)
  nombre: string;
  ownerEmail: string;
  telefono?: string;
  fechaRegistro: string;
  estado: 'Activo' | 'Suspendido';
  // The following fields can be calculated on-the-fly when needed
  // usuariosActivos: number;
  // propiedadesRegistradas: number;
}


// Fix: Added Empresa interface to be used with mock data.
export interface Empresa {
  id: number;
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
