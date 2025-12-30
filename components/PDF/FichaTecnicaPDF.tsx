import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Propiedad } from '../../types';

// --- FUNCIÓN DE LIMPIEZA DE EMOJIS ---
const cleanText = (text: string | undefined | null) => {
    if (!text) return '';
    const str = String(text);
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0F5}\u{1F200}-\u{1F270}\u{2328}\u{231A}\u{23F3}\u{23F0}\u{23F1}\u{23F2}\u{23F8}\u{23F9}\u{23FA}]/gu, '');
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingBottom: 60, // Aumentado para dar espacio al footer
    paddingTop: 0,
  },
  // --- PORTADA ---
  coverImage: {
    width: '100%',
    height: '50%', 
    objectFit: 'cover',
  },
  headerContainer: {
    padding: 30,
    backgroundColor: '#FFF5F2', 
  },
  tag: {
    color: '#F37321', 
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E', 
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 15,
  },
  price: {
    fontSize: 22,
    color: '#1E1E1E',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  // --- HIGHLIGHTS GRID ---
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 20,
  },
  highlightItem: {
    alignItems: 'center',
    width: '20%',
  },
  highlightValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#F37321',
  },
  highlightLabel: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // --- GALERÍA ---
  galleryContainer: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryImage: {
    width: '48%', 
    height: 180,
    marginBottom: 15,
    borderRadius: 4,
    objectFit: 'cover',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E',
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
  },
  // --- DETALLES ---
  textBlock: {
    paddingHorizontal: 30,
    fontSize: 10,
    lineHeight: 1.5,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'justify',
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '50%',
    marginBottom: 6,
    fontSize: 10,
    color: '#334155',
  },
  // --- FOOTER & LEGAL ---
  // Cambiamos a posición relativa para que no se encime
  legalTextContainer: {
    marginTop: 30,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  legalText: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Footer Fijo
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 8,
  }
});

interface FichaTecnicaPDFProps {
  propiedad: Propiedad;
  images: string[]; 
}

const FichaTecnicaPDF: React.FC<FichaTecnicaPDFProps> = ({ propiedad, images }) => {
  
  const formatCurrency = (val: string | undefined) => {
    if (!val) return '$0.00 MXN';
    const num = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
  };

  const coverImage = images.length > 0 ? images[0] : null;
  const galleryImages = images.slice(1, 7); 

  // Limpieza de textos
  const tipoInmuebleSafe = cleanText(propiedad.tipo_inmueble);
  const direccionSafe = cleanText(`${propiedad.calle} ${propiedad.numero_exterior}`);
  const ubicacionSafe = cleanText(`${propiedad.colonia}, ${propiedad.municipio}, ${propiedad.estado}`);
  const descripcionSafe = cleanText(propiedad.descripcion_breve || propiedad.descripcion_general || "Sin descripción disponible.");

  return (
    <Document>
      {/* --- PÁGINA 1: PORTADA --- */}
      <Page size="A4" style={styles.page}>
        {/* Footer Fijo en todas las páginas generadas por este bloque */}
        <View fixed style={styles.footer}>
            <Text style={styles.footerText}>IANGE Real Estate</Text>
            <Text style={styles.footerText}>www.iange.xyz</Text>
        </View>

        {/* Contenido Portada */}
        {coverImage ? (
            <Image src={coverImage} style={styles.coverImage} />
        ) : (
            <View style={[styles.coverImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{color: '#94A3B8'}}>Sin Imagen de Portada</Text>
            </View>
        )}

        <View style={styles.headerContainer}>
            <Text style={styles.tag}>{tipoInmuebleSafe} EN VENTA</Text>
            <Text style={styles.title}>{direccionSafe}</Text>
            <Text style={styles.subtitle}>{ubicacionSafe}</Text>
            <Text style={styles.price}>{formatCurrency(propiedad.valor_operacion)}</Text>
        </View>

        <View style={styles.highlightsContainer}>
            <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{propiedad.terreno_m2 || 0} m²</Text>
                <Text style={styles.highlightLabel}>Terreno</Text>
            </View>
            <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{propiedad.construccion_m2 || 0} m²</Text>
                <Text style={styles.highlightLabel}>Construcción</Text>
            </View>
            <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{propiedad.recamaras || 0}</Text>
                <Text style={styles.highlightLabel}>Recámaras</Text>
            </View>
            <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>
                    {propiedad.banos_completos || 0}{propiedad.medios_banos ? `.5` : ''}
                </Text>
                <Text style={styles.highlightLabel}>Baños</Text>
            </View>
            <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{propiedad.cochera_autos || 0}</Text>
                <Text style={styles.highlightLabel}>Cochera</Text>
            </View>
        </View>
      </Page>

      {/* --- PÁGINA 2: GALERÍA --- */}
      {galleryImages.length > 0 && (
        <Page size="A4" style={styles.page}>
            <View fixed style={styles.footer}>
                <Text style={styles.footerText}>IANGE Real Estate</Text>
                <Text style={styles.footerText}>Galería</Text>
            </View>

            <Text style={styles.sectionTitle}>Galería</Text>
            <View style={styles.galleryContainer}>
                {galleryImages.map((img, index) => (
                    <Image key={index} src={img} style={styles.galleryImage} />
                ))}
            </View>
        </Page>
      )}

      {/* --- PÁGINA 3: DESCRIPCIÓN Y DETALLES (Auto-paginable) --- */}
      <Page size="A4" style={styles.page} wrap>
        <View fixed style={styles.footer}>
            <Text style={styles.footerText}>Generado por IANGE</Text>
            <Text style={styles.footerText}>Contacto: contacto@iange.xyz</Text>
        </View>

        <Text style={styles.sectionTitle}>Descripción</Text>
        {/* El texto ahora fluye y rompe página si es necesario */}
        <Text style={styles.textBlock}>
            {descripcionSafe}
        </Text>

        {/* Mantenemos Características junto, o dejamos que fluya */}
        <View break={false}> 
            <Text style={styles.sectionTitle}>Características y Equipamiento</Text>
            <View style={styles.detailsGrid}>
                {propiedad.caracteristicas_principales ? (
                    propiedad.caracteristicas_principales.split('\n').map((char, i) => (
                        <Text key={i} style={styles.detailItem}>• {cleanText(char)}</Text>
                    ))
                ) : (
                    <>
                        <Text style={styles.detailItem}>• Ubicación privilegiada</Text>
                        <Text style={styles.detailItem}>• Alta plusvalía</Text>
                        <Text style={styles.detailItem}>• Documentación en regla</Text>
                    </>
                )}
            </View>
        </View>

        {/* Texto Legal al final del flujo, NO absoluto */}
        <View style={styles.legalTextContainer}>
            <Text style={styles.legalText}>
                * Los precios y la disponibilidad están sujetos a cambios sin previo aviso. Las imágenes son ilustrativas. 
                El precio no incluye gastos notariales, impuestos de adquisición, ni gastos de avalúo. 
                Consulte términos y condiciones con su asesor.
            </Text>
        </View>
      </Page>
    </Document>
  );
};

export default FichaTecnicaPDF;