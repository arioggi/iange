import { supabase } from '../supabaseClient';

// ==========================================
// 1. GESTIÓN DE EMPRESAS (TENANTS)
// ==========================================

// Actualizado para recibir todos los datos del formulario nuevo
export const createTenant = async (dataObj: { nombre: string, ownerEmail: string, telefono: string, direccion: string, rfc: string, plan: string }) => {
  const { data, error } = await supabase
    .from('tenants')
    .insert([{ 
        name: dataObj.nombre, 
        owner_email: dataObj.ownerEmail, 
        telefono: dataObj.telefono,
        direccion: dataObj.direccion,
        rfc: dataObj.rfc,
        plan: dataObj.plan,
        status: 'active' 
    }])
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

// NUEVO: Función para borrar empresas
export const deleteTenant = async (tenantId: string) => {
    const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
    
    if (error) throw error;
};

// ==========================================
// 2. GESTIÓN DE USUARIOS
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

export const createGlobalUserProfile = async (profileData: any) => {
    const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

/**
 * NUEVO: Elimina un usuario completamente (Auth + Perfil)
 * Requiere la función RPC 'delete_user_by_admin' en Supabase y ON DELETE CASCADE en la BD.
 */
export const deleteUserSystem = async (userId: string) => {
  const { data, error } = await supabase.rpc('delete_user_by_admin', { 
    user_id: userId 
  });

  if (error) {
    console.error('Error eliminando usuario:', error);
    throw error;
  }
  return data;
};

// ==========================================
// 3. PROPIEDADES, CONTACTOS Y FOTOS
// ==========================================

export const uploadPropertyImage = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('propiedades')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('propiedades').getPublicUrl(filePath);
  return data.publicUrl;
};

// NUEVO: Crear Contacto (Propietario/Comprador)
export const createContact = async (contactData: any, tenantId: string, tipo: 'propietario' | 'comprador') => {
    const { data, error } = await supabase
        .from('contactos')
        .insert([{
            tenant_id: tenantId,
            nombre: contactData.nombreCompleto,
            email: contactData.email,
            telefono: contactData.telefono,
            tipo: tipo
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

// ACTUALIZADO: Crear Propiedad vinculada a contacto y tenant
export const createProperty = async (propertyData: any, tenantId: string, ownerId: string) => {
  const { 
    titulo, direccion, valor_operacion, tipo_inmueble, status, 
    fotos, // Sacamos fotos del objeto json
    ...restDetails 
  } = propertyData;

  const dbPayload = {
    tenant_id: tenantId,
    contacto_id: ownerId,
    titulo: `${propertyData.calle} ${propertyData.numero_exterior}`,
    direccion: `${propertyData.colonia}, ${propertyData.municipio}, ${propertyData.estado}`,
    precio: parseFloat(String(valor_operacion).replace(/[^0-9.]/g, '')) || 0,
    tipo: tipo_inmueble,
    estatus: 'disponible',
    features: { ...restDetails, calle: propertyData.calle, numero_exterior: propertyData.numero_exterior },
    images: propertyData.imageUrls || []
  };

  const { data, error } = await supabase
    .from('propiedades')
    .insert([dbPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// IMPLEMENTADO: Leer propiedades reales
export const getPropertiesByTenant = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('propiedades')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  return data.map((p: any) => ({
    id: p.id,
    propietarioId: p.contacto_id,
    valor_operacion: p.precio?.toString(),
    tipo_inmueble: p.tipo,
    status: p.estatus === 'disponible' ? 'En Promoción' : p.estatus,
    ...p.features,
    fotos: [], // La UI espera Files, pero usaremos imageUrls para mostrar
    imageUrls: p.images
  }));
};

// IMPLEMENTADO: Leer contactos reales
export const getContactsByTenant = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  
  const propietarios = data.filter((c: any) => c.tipo === 'propietario').map((c: any) => ({ ...c, id: c.id, nombreCompleto: c.nombre }));
  const compradores = data.filter((c: any) => c.tipo === 'comprador').map((c: any) => ({ ...c, id: c.id, nombreCompleto: c.nombre }));
  
  return { propietarios, compradores };
  
};

// ==========================================
// 4. ESTADÍSTICAS Y DASHBOARD
// ==========================================

// Estadísticas para SUPER ADMIN
export const getSuperAdminStats = async () => {
    // 1. Contar Empresas
    const { count: totalCompanies, error: errorCompanies } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

    // 2. Contar Usuarios
    const { count: totalUsers, error: errorUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 3. Contar Propiedades Totales
    const { count: totalProperties, error: errorProps } = await supabase
        .from('propiedades')
        .select('*', { count: 'exact', head: true });

    // 4. Calcular Ventas Globales (Suma de precios de propiedades vendidas)
    const { data: salesData, error: errorSales } = await supabase
        .from('propiedades')
        .select('precio')
        .eq('estatus', 'Vendida');

    if (errorCompanies || errorUsers || errorProps || errorSales) {
        console.error("Error obteniendo stats");
        throw new Error("Error de base de datos");
    }

    const totalSalesValue = salesData?.reduce((sum, item) => sum + (item.precio || 0), 0) || 0;
    const totalSalesCount = salesData?.length || 0;

    // Distribución de Roles (Para la gráfica de pastel)
    const { data: rolesData } = await supabase
        .from('profiles')
        .select('role');
    
    const rolesDistribution = rolesData?.reduce((acc: any, curr: any) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1;
        return acc;
    }, {}) || {};

    return {
        totalCompanies: totalCompanies || 0,
        totalUsers: totalUsers || 0,
        totalProperties: totalProperties || 0,
        globalSalesCount: totalSalesCount,
        globalSalesValue: totalSalesValue,
        rolesDistribution
    };
};

// ==========================================
// 5. FUNCIONES PARA PERSONAL EMPRESA (NUEVO)
// ==========================================

/**
 * Obtiene los empleados de un tenant específico
 */
export const getUsersByTenant = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching tenant users:', error);
    throw error;
  }

  // Mapeamos los datos de la BD al formato que espera tu UI
  return data.map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email?.split('@')[0] || 'Sin Nombre',
    email: p.email,
    role: p.role,
    tenantId: p.tenant_id,
    permissions: p.permissions || [],
    avatar: p.avatar_url,
    phone: p.phone
  }));
};

/**
 * Crea un usuario nuevo en Supabase (Auth + Perfil)
 * Intenta registrar al usuario y asegura que se cree el perfil correctamente
 */
export const createTenantUser = async (email: string, password: string, tenantId: string, role: string, name: string) => {
    // 1. Crear el usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                tenant_id: tenantId, 
                role: role
            }
        }
    });

    if (authError) throw authError;

    // 2. Asegurar que el perfil tenga los datos correctos
    if (authData.user) {
        // Upsert para asegurar que si el trigger falló, esto lo arregle
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
                id: authData.user.id,
                email: email,
                full_name: name,
                tenant_id: tenantId,
                role: role
            });
        
        if (profileError) console.warn("Aviso al actualizar perfil:", profileError);
    }

    return authData.user;
};