import { supabase } from '../supabaseClient';
import { ROLE_DEFAULT_PERMISSIONS } from '../constants';
import { User } from '../types'; // Importante para tipado

// ==========================================
// 0. UTILIDADES (COMPRESIÓN DE IMÁGENES)
// ==========================================

export const compressImage = async (file: File, quality = 0.7, maxWidth = 1280): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                }

                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, {
                                type: outputType,
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        } else {
                            reject(new Error('Error al comprimir la imagen'));
                        }
                    },
                    outputType,
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// ==========================================
// 1. GESTIÓN DE EMPRESAS (TENANTS)
// ==========================================

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

export const deleteTenant = async (tenantId: string) => {
    const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
    
    if (error) throw error;
};

export const deleteTenantFully = async (tenantId: string) => {
  const { error } = await supabase.rpc('delete_tenant_fully', { 
    target_tenant_id: tenantId 
  });

  if (error) {
    console.error('Error eliminando empresa y usuarios:', error);
    throw error;
  }
};

// ==========================================
// 2. GESTIÓN DE USUARIOS GLOBALES
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

export const updateUserProfile = async (userId: string, updates: { 
    full_name?: string; 
    phone?: string; 
    avatar_url?: string;
    role?: string;       
    permissions?: any;   
}) => {
    const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

    if (profileError) throw profileError;

    if (updates.phone) {
        await supabase.auth.updateUser({ phone: updates.phone });
    }
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

export const createSystemUser = async (userData: {
    email: string;
    password?: string;
    fullName: string;
    role: string;
    tenantId: string | null;
    phone?: string;
}) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || 'temp12345',
        options: {
            data: {
                full_name: userData.fullName,
            }
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("No se pudo crear el usuario en Auth.");

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: userData.fullName,
            role: userData.role,
            tenant_id: userData.tenantId,
            phone: userData.phone,
            permissions: ROLE_DEFAULT_PERMISSIONS[userData.role] || getDefaultPermissions(userData.role)
        })
        .eq('id', authData.user.id)
        .select()
        .single();

    if (profileError) {
        console.error("Error actualizando perfil:", profileError);
        throw new Error("Usuario Auth creado, pero falló la asignación de Rol/Empresa.");
    }

    return profileData;
};

const getDefaultPermissions = (role: string) => {
    return {
        propiedades: role !== 'gestor',
        contactos: role !== 'gestor',
        operaciones: true,
        documentosKyc: true,
        reportes: role === 'superadmin' || role === 'adminempresa',
        equipo: role === 'superadmin' || role === 'adminempresa',
        crm: true
    };
};

// ==========================================
// 3. PROPIEDADES, CONTACTOS Y FOTOS
// ==========================================

export const uploadPropertyImage = async (file: File) => {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileExt = cleanName.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  // 1. Definimos el nombre del archivo
  const filePath = `${fileName}`; 

  const { error: uploadError } = await supabase.storage
    .from('propiedades') 
    .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
    });

  if (uploadError) throw uploadError;

  // 2. CAMBIO IMPORTANTE: Devolvemos SOLO el nombre del archivo (Clean Path)
  // En lugar de devolver data.publicUrl
  return filePath; 
};

export const createContact = async (contactData: any, tenantId: string, tipo: 'propietario' | 'comprador') => {
    const { data, error } = await supabase
        .from('contactos')
        .insert([{
            tenant_id: tenantId,
            nombre: contactData.nombreCompleto,
            email: contactData.email,
            telefono: contactData.telefono,
            tipo: tipo,
            datos_kyc: contactData 
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const createProperty = async (propertyData: any, tenantId: string, ownerId: string) => {
  const { 
    titulo, direccion, valor_operacion, tipo_inmueble, status, 
    fotos, 
    imageUrls, 
    fichaTecnicaPdf, 
    ...restDetails 
  } = propertyData;

  const precioNumerico = parseFloat(String(valor_operacion).replace(/[^0-9.]/g, '')) || 0;

  const dbPayload = {
    tenant_id: tenantId,
    contacto_id: ownerId,
    titulo: `${propertyData.calle} ${propertyData.numero_exterior}`,
    direccion: `${propertyData.colonia}, ${propertyData.municipio}, ${propertyData.estado}`,
    precio: precioNumerico,
    tipo: tipo_inmueble,
    estatus: 'disponible', 
    features: { 
        ...restDetails, 
        calle: propertyData.calle, 
        numero_exterior: propertyData.numero_exterior,
        colonia: propertyData.colonia,
        municipio: propertyData.municipio,
        estado: propertyData.estado
    },
    images: imageUrls || [] 
  };

  const { data, error } = await supabase
    .from('propiedades')
    .insert([dbPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPropertiesByTenant = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('propiedades')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((p: any) => {
    const dbStatus = p.estatus ? p.estatus.toLowerCase() : 'disponible';
    
    let uiStatus = 'En Promoción'; 
    if (dbStatus === 'vendida') uiStatus = 'Vendida';
    else if (dbStatus === 'separada') uiStatus = 'Separada';
    else if (dbStatus === 'en promoción' || dbStatus === 'disponible') uiStatus = 'En Promoción';
    else uiStatus = 'Validación Pendiente';

    // --- AGREGAR ESTA LÓGICA DE HIDRATACIÓN ---
    // Esto convierte los nombres cortos (foto.jpg) en URLs completas para que el Dashboard las vea bien
    const rawImages = p.images || [];
    const hydratedImages = rawImages.map((img: string) => {
        if (img.startsWith('http')) return img; // Si ya es URL completa, déjala igual
        // Si es nombre corto, agrégale el dominio de Supabase
        return supabase.storage.from('propiedades').getPublicUrl(img).data.publicUrl;
    });

    return {
        ...p.features, 
        id: p.id,
        token_publico: p.token_publico, 
        propietarioId: p.contacto_id,
        compradorId: p.comprador_id,
        valor_operacion: p.precio?.toString() || '', 
        tipo_inmueble: p.tipo,
        status: uiStatus, 
        fecha_venta: p.features?.fecha_venta || p.fecha_venta || null,
        fotos: [], 
        imageUrls: hydratedImages, // <--- USA LA VERSIÓN HIDRATADA AQUÍ
        fecha_captacion: p.created_at,
        progreso: p.features?.progreso || 0,
        checklist: p.features?.checklist || {},
        visitas: p.features?.visitas || [],
    };
  });
};

export const updateProperty = async (propertyData: any, ownerId: string) => {
    const { 
        id, 
        valor_operacion, 
        tipo_inmueble, 
        status, 
        propietarioId, 
        fecha_captacion, 
        compradorId,
        imageUrls, 
        fecha_venta, 
        fotos, 
        ...restDetails 
    } = propertyData;

    const precioNumerico = parseFloat(String(valor_operacion).replace(/[^0-9.]/g, '')) || 0;
    
    let dbStatus = 'disponible';
    if (status === 'Vendida') dbStatus = 'vendida';
    else if (status === 'Separada') dbStatus = 'separada';
    else if (status === 'En Promoción' || status === 'Validación Pendiente') dbStatus = 'disponible';

    const featuresPayload = {
        ...restDetails,
        fecha_venta: fecha_venta || null,
    };
    
    delete featuresPayload.fecha_venta;
    
    if (fecha_venta) {
        (featuresPayload as any).fecha_venta = fecha_venta;
    }

    const compradorIdToSave = dbStatus === 'disponible' ? null : (compradorId || undefined);

    const dbPayload = {
        titulo: `${restDetails.calle} ${restDetails.numero_exterior}`, 
        direccion: `${restDetails.colonia}, ${restDetails.municipio}, ${restDetails.estado}`,
        precio: precioNumerico,
        tipo: tipo_inmueble,
        estatus: dbStatus,
        comprador_id: compradorIdToSave,
        features: featuresPayload, 
        images: imageUrls || [],
    };

    const { data, error } = await supabase
        .from('propiedades')
        .update(dbPayload)
        .eq('id', id.toString()) 
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==========================================
// 4. OFERTAS Y CONTACTOS (RELACIONES)
// ==========================================

export const assignBuyerToProperty = async (
    buyerId: number, 
    propertyId: number, 
    tipoRelacion: 'Propuesta de compra' | 'Propiedad Separada' | 'Venta finalizada',
    offerData?: any
) => {
    const pIdString = propertyId.toString();
    const bIdString = buyerId.toString();
    
    const { data: currentContact } = await supabase
        .from('contactos')
        .select('datos_kyc')
        .eq('id', bIdString)
        .single();

    if (currentContact) {
        const kyc = currentContact.datos_kyc || {};
        let intereses = Array.isArray(kyc.intereses) ? [...kyc.intereses] : [];

        const existingIndex = intereses.findIndex((i: any) => String(i.propiedadId) === pIdString);

        const nuevoInteres = {
            propiedadId: propertyId,
            tipoRelacion: tipoRelacion,
            fechaInteres: new Date().toISOString(),
            ofertaFormal: offerData !== undefined ? offerData : (existingIndex >= 0 ? intereses[existingIndex].ofertaFormal : undefined)
        };

        if (existingIndex >= 0) {
            intereses[existingIndex] = { ...intereses[existingIndex], ...nuevoInteres };
        } else {
            intereses.push(nuevoInteres);
        }

        await supabase.from('contactos')
        .update({
            datos_kyc: {
                ...kyc,
                intereses: intereses,
                propiedadRelacionadaId: propertyId,
                tipoRelacion: tipoRelacion
            }
        })
        .eq('id', bIdString);
    }

    if (tipoRelacion === 'Venta finalizada' || tipoRelacion === 'Propiedad Separada') {
        const estatusDb = tipoRelacion === 'Venta finalizada' ? 'vendida' : 'separada';
        const fechaVenta = tipoRelacion === 'Venta finalizada' ? new Date().toISOString() : null;

        const { data: currentProp } = await supabase
            .from('propiedades')
            .select('features')
            .eq('id', pIdString)
            .single();

        const newFeatures = { ...currentProp?.features, fecha_venta: fechaVenta };
        if (!fechaVenta) delete newFeatures.fecha_venta;

        await supabase.from('propiedades')
        .update({
            comprador_id: bIdString, 
            estatus: estatusDb,
            features: newFeatures
        })
        .eq('id', pIdString);
        
    } else {
        const { data: currentProp } = await supabase
            .from('propiedades')
            .select('comprador_id')
            .eq('id', pIdString)
            .single();

        if (String(currentProp?.comprador_id) === bIdString) {
             await supabase.from('propiedades')
             .update({
                comprador_id: null,
                estatus: 'disponible'
            })
            .eq('id', pIdString);
        }
    }
};

export const deleteOffer = async (buyerId: number, propertyId: number) => {
    const { data: currentContact } = await supabase
        .from('contactos')
        .select('datos_kyc')
        .eq('id', buyerId.toString())
        .single();

    if (currentContact) {
        const kyc = currentContact.datos_kyc || {};
        let intereses = Array.isArray(kyc.intereses) ? [...kyc.intereses] : [];
        
        const targetIndex = intereses.findIndex((i: any) => String(i.propiedadId) === String(propertyId));
        
        if (targetIndex >= 0) {
            const interes = intereses[targetIndex];
            delete interes.ofertaFormal; 
            interes.tipoRelacion = 'Propuesta de compra'; 
            intereses[targetIndex] = interes;

            await supabase.from('contactos')
            .update({ datos_kyc: { ...kyc, intereses } })
            .eq('id', buyerId.toString());
        }
    }
};

export const unassignBuyerFromProperty = async (buyerId: number, propertyId: number) => {
    const { data: currentContact } = await supabase
        .from('contactos')
        .select('datos_kyc')
        .eq('id', buyerId.toString())
        .single();

    if (currentContact) {
        const kyc = currentContact.datos_kyc || {};
        let intereses = Array.isArray(kyc.intereses) ? [...kyc.intereses] : [];
        
        intereses = intereses.filter((i: any) => String(i.propiedadId) !== String(propertyId));

        const newKyc = { 
            ...kyc,
            intereses: intereses,
            propiedadRelacionadaId: String(kyc.propiedadRelacionadaId) === String(propertyId) ? null : kyc.propiedadRelacionadaId,
            tipoRelacion: String(kyc.propiedadRelacionadaId) === String(propertyId) ? null : kyc.tipoRelacion
        };
        
        await supabase.from('contactos')
        .update({ datos_kyc: newKyc })
        .eq('id', buyerId.toString());
    }

    const { data: currentProp } = await supabase
        .from('propiedades')
        .select('comprador_id, features')
        .eq('id', propertyId.toString())
        .single();

    if (currentProp && String(currentProp.comprador_id) === String(buyerId)) {
        const newFeatures = { ...currentProp.features };
        delete newFeatures.fecha_venta;
        
        await supabase.from('propiedades')
        .update({
            comprador_id: null,
            estatus: 'disponible',
            features: newFeatures
        })
        .eq('id', propertyId.toString());
    }
};

export const getContactsByTenant = async (tenantId: string) => {
  const { data: contacts, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  const mapContact = (c: any) => {
      const intereses = c.datos_kyc?.intereses || [];
      
      if (intereses.length === 0 && c.datos_kyc?.propiedadRelacionadaId) {
          intereses.push({
              propiedadId: c.datos_kyc.propiedadRelacionadaId,
              tipoRelacion: c.datos_kyc.tipoRelacion || 'Propuesta de compra',
              ofertaFormal: c.datos_kyc.ofertaFormal,
              fechaInteres: new Date().toISOString()
          });
      }

      const ultimoInteres = intereses.length > 0 ? intereses[intereses.length - 1] : null;

      return {
          ...c.datos_kyc, 
          id: c.id, 
          nombreCompleto: c.nombre,
          email: c.email,
          telefono: c.telefono,
          intereses: intereses,
          propiedadId: ultimoInteres ? ultimoInteres.propiedadId : null,
          tipoRelacion: ultimoInteres ? ultimoInteres.tipoRelacion : null,
          ofertaFormal: ultimoInteres ? ultimoInteres.ofertaFormal : null
      };
  };

  const propietarios = contacts.filter((c: any) => c.tipo === 'propietario').map(mapContact);
  const compradores = contacts.filter((c: any) => c.tipo === 'comprador').map(mapContact);
  
  return { propietarios, compradores };
};

export const updateContact = async (contactId: number, updatedKycData: any) => {
    const contactIdString = contactId.toString();
    const { nombreCompleto, email, telefono } = updatedKycData;

    const { data, error } = await supabase
        .from('contactos')
        .update({
            nombre: nombreCompleto,
            email: email,
            telefono: telefono,
            datos_kyc: updatedKycData, 
        })
        .eq('id', contactIdString)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteContact = async (contactId: number) => {
    const { error } = await supabase
        .from('contactos')
        .delete()
        .eq('id', contactId.toString());
    
    if (error) throw error;
};

// ==========================================
// 5. ESTADÍSTICAS Y DASHBOARD
// ==========================================

export const getSuperAdminStats = async () => {
    const { count: totalCompanies, error: errorCompanies } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

    const { count: totalUsers, error: errorUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    const { count: totalProperties, error: errorProps } = await supabase
        .from('propiedades')
        .select('*', { count: 'exact', head: true });

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
// 6. FUNCIONES PARA PERSONAL EMPRESA (CORREGIDA)
// ==========================================

// --- FUNCIÓN CORREGIDA Y OPTIMIZADA ---
export const getUsersByTenant = async (tenantId: string): Promise<User[]> => {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        if (!profiles) return [];

        const users: User[] = profiles.map(p => {
            let photoUrl = '';

            // Si tiene avatar_url, construimos la URL completa
            if (p.avatar_url) {
                if (p.avatar_url.startsWith('http')) {
                    photoUrl = p.avatar_url;
                } else {
                    const { data } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(p.avatar_url);
                    photoUrl = data.publicUrl;
                }
            }

            return {
                id: p.id,
                email: p.email,
                name: p.full_name || p.name || 'Sin Nombre', 
                role: p.role || 'asesor',
                photo: photoUrl, // AHORA SÍ ES UNA URL COMPLETA
                phone: p.phone || '',
                permissions: p.permissions,
                tenantId: p.tenant_id
            };
        });

        return users;
    } catch (error) {
        console.error('Error en getUsersByTenant:', error);
        return [];
    }
};

export const createTenantUser = async (email: string, password: string, tenantId: string, role: string, name: string, permissions?: any) => {
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

    if (authData.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
                id: authData.user.id,
                email: email,
                full_name: name,
                tenant_id: tenantId,
                role: role,
                permissions: permissions 
            });
        
        if (profileError) console.warn("Aviso al actualizar perfil:", profileError);
    }

    return authData.user;
};

// ==========================================
// 7. GESTIÓN DE PERFIL (AVATAR Y SEGURIDAD)
// ==========================================

export const uploadProfileAvatar = async (userId: string, file: File) => {
    try {
        const compressedFile = await compressImage(file, 0.7, 500); 
        const filePath = `${userId}/avatar.jpg`; 

        const { error: uploadError } = await supabase.storage
            .from('avatars') 
            .upload(filePath, compressedFile, {
                cacheControl: '0', 
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;

        return publicUrlWithCacheBuster;

    } catch (error) {
        console.error("Error subiendo avatar:", error);
        throw error;
    }
};

export const updateUserPassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) throw error;
    return data;
};

// ==========================================
// 8. GESTIÓN DE PERFIL EMPRESA (TENANT)
// ==========================================

export const uploadCompanyLogo = async (tenantId: string, file: File) => {
    try {
        const compressedFile = await compressImage(file, 0.8, 800); 
        const fileName = `${tenantId}_${Date.now()}.jpg`;
        const filePath = `${fileName}`; 

        const { error: uploadError } = await supabase.storage
            .from('company-logos') 
            .upload(filePath, compressedFile, {
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error("Error subiendo logo:", error);
        throw error;
    }
};

export const updateTenant = async (tenantId: string, updates: {
    nombre?: string;
    telefono?: string;
    direccion?: string; 
    logo_url?: string;
    requiereAprobacionPublicar?: boolean;
    requiereAprobacionCerrar?: boolean;
    integracionWhatsapp?: boolean;
}) => {
    const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getTenantById = async (tenantId: string) => {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
    
    if (error) throw error;
    return data;
};