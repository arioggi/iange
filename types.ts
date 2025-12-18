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
  dashboard: boolean;
  contactos: boolean;
  propiedades: boolean;
  progreso: boolean;
  reportes: boolean;
  crm: boolean;
  equipo: boolean;
  billing_edit: boolean; 
}

export interface User {
  id: number | string;
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
  // --- CAMPOS DE SUSCRIPCIÓN ---
  subscriptionStatus?: string;  
  planId?: string | null;       
  currentPeriodEnd?: string | null; 
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
  id: number;
  token_publico?: string;
  propietarioId: number;
  compradorId?: number | null;
  asesorId: number | string;
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
  imageUrls?: string[];
  fecha_captacion: string;
  fecha_venta: string | null;
  fichaTecnicaPdf: string;
  progreso: number;
  checklist: ChecklistStatus;
  fuente_captacion: string;
  status: 'Validación Pendiente' | 'En Promoción' | 'Separada' | 'Vendida';
  visitas: Visita[];
  comisionCaptacionOficina?: number;
  comisionCaptacionAsesor?: number;
  compartirComisionCaptacion?: boolean; 
  comisionVentaOficina?: number;
  comisionVentaAsesor?: number;
  compartirComisionVenta?: boolean; 
  comisionOficina?: number;
  comisionAsesor?: number;
  comisionCompartida?: number;
  tenant_id?: string;
}

export interface OfferData {
  compradorId: string;
  precioOfrecido: string;
  formaPago: 'Contado' | 'Crédito Bancario' | 'Infonavit' | 'Cofinavit' | 'Otro';
  institucionFinanciera?: string;
  montoApartado: string;
  montoEnganche: string;
  saldoAFirma: string;
  vigenciaOferta: string;
  observaciones?: string;
}

export interface Interes {
    propiedadId: number;
    tipoRelacion: 'Propuesta de compra' | 'Propiedad Separada' | 'Venta finalizada';
    ofertaFormal?: OfferData; 
    fechaInteres: string;
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
  fechaCita?: string; 
  horaCita?: string;  
  notasCita?: string;
  asesorId?: number | string; 
  ofertaFormal?: OfferData; 
  intereses?: Interes[]; 
}

export interface Propietario extends KycData {
  id: number;
}

export interface Comprador extends KycData {
  id: number;
  propiedadId?: number | null;
}

export interface CompanySettings {
  name?: string;
  onboarded?: boolean;
  requiereAprobacionPublicar?: boolean;
  requiereAprobacionCerrar?: boolean;
  integracionWhatsapp?: boolean;
  integracionCorreo?: boolean;
  integracionPortales?: boolean;
  logo_url?: string | null;
}

export interface Tenant {
  id: string;
  nombre: string;
  ownerEmail: string;
  telefono?: string;
  logo_url?: string;
  fechaRegistro: string;
  estado: 'Activo' | 'Suspendido';
}

export interface Empresa {
  id: string | number;
  nombre: string;
  ownerEmail: string;
  telefono: string;
  fechaRegistro: string;
  estado: 'Activo' | 'Suspendido';
  propiedadesRegistradas: number;
  dominio: string;
  logo_url?: string;
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
  stripePriceId?: string;
}

export interface Log {
  id: number;
  fecha: string;
  usuario: string;
  rol: string;
  accion: string;
  resultado: 'Éxito' | 'Error';
}