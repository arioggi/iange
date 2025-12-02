import { supabase } from '../supabaseClient';

// ==========================================
// EMPRESAS
// ==========================================

export const createTenant = async (name: string, ownerEmail: string) => {
  const { data, error } = await supabase
    .from('tenants')
    .insert([{ name, owner_email: ownerEmail, status: 'active' }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAllTenants = async () => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// ==========================================
// USUARIOS
// ==========================================

export const getAllGlobalUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, tenants(name)');

  if (error) throw error;

  return data.map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    name: profile.full_name || 'Usuario Sin Nombre',
    role: profile.role,
    photo: profile.avatar_url || 'U',
    tenantId: profile.tenant_id,
    tenantName: profile.tenants?.name || 'Global / Sin Asignar',
    permissions: profile.permissions,
    phone: profile.phone,
  }));
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Función para intentar crear perfil manual (solo funcionará si el ID auth existe o si quitamos la restricción,
// pero por ahora la usamos para actualizar datos si el perfil ya existe)
export const createGlobalUserProfile = async (profileData: any) => {
    // Intentamos UPSERT (Insertar o Actualizar si existe)
    const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

// ... (Resto de funciones de propiedades/fotos que ya tenías)
export const uploadPropertyImage = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage.from('propiedades').upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('propiedades').getPublicUrl(filePath);
  return data.publicUrl;
};

export const createProperty = async (propertyData: any, tenantId: string) => {
  // Lógica simplificada para crear propiedad
  const dbPayload = {
    tenant_id: tenantId,
    titulo: propertyData.calle, // Usamos calle como título simple
    direccion: `${propertyData.colonia}, ${propertyData.municipio}`,
    precio: parseFloat(String(propertyData.valor_operacion).replace(/[^0-9.]/g, '')) || 0,
    tipo: propertyData.tipo_inmueble,
    estatus: 'disponible',
    features: propertyData, // Guardamos todo el objeto JSON por flexibilidad
    images: propertyData.fotos || [] // Asumiendo que ya son URLs
  };
  const { data, error } = await supabase.from('propiedades').insert([dbPayload]).select().single();
  if (error) throw error;
  return data;
};

export const getPropertiesByTenant = async (tenantId: string) => { /* ... lógica previa ... */ return []; };
export const getContactsByTenant = async (tenantId: string) => { return { propietarios: [], compradores: [] }; };