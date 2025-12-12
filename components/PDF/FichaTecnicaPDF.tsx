import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Propiedad, Propietario } from '../../types';

// Registramos estilos. Usamos Helvetica por compatibilidad estándar, 
// pero puedes registrar fuentes personalizadas si lo deseas.
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingBottom: 40, // Espacio para footer
  },
  // --- PORTADA ---
  coverImage: {
    width: '100%',
    height: '55%', // Ocupa más de la mitad
    objectFit: 'cover',
  },
  headerContainer: {
    padding: 30,
    backgroundColor: '#FFF5F2', // Tu color salmón de fondo
  },
  tag: {
    color: '#F37321', // Tu naranja
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E', // Tu dark
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  price: {
    fontSize: 24,
    color: '#1E1E1E',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  // --- HIGHLIGHTS GRID ---
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 10,
  },
  highlightItem: {
    alignItems: 'center',
    width: '20%',
  },
  highlightValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#F37321',
  },
  highlightLabel: {
    fontSize: 9,
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
    width: '48%', // 2 columnas
    height: 200,
    marginBottom: 15,
    borderRadius: 4,
    objectFit: 'cover',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E',
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 30,
    borderBottom: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
  },
  // --- DETALLES ---
  textBlock: {
    paddingHorizontal: 30,
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'justify',
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 6,
    fontSize: 11,
    color: '#334155',
  },
  bullet: {
    width: 3,
    height: 3,
    backgroundColor: '#F37321',
    borderRadius: '50%',
    marginRight: 5,
  },
  // --- LEGAL & FOOTER ---
  legalText: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
    fontSize: 9,
  }
});

interface FichaTecnicaPDFProps {
  propiedad: Propiedad;
  images: string[]; // URLs de las imágenes ya procesadas
}

const FichaTecnicaPDF: React.FC<FichaTecnicaPDFProps> = ({ propiedad, images }) => {
  
  const formatCurrency = (val: string | undefined) => {
    if (!val) return '$0.00 MXN';
    // Limpieza simple si viene con texto
    const num = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
  };

  const coverImage = images.length > 0 ? images[0] : null;
  const galleryImages = images.slice(1, 7); // Tomamos hasta 6 fotos para la galería

  return (
    <Document>
      {/* PÁGINA 1: PORTADA */}
      <Page size="A4" style={styles.page}>
        {/* Imagen Principal */}
        {coverImage ? (
            <Image src={coverImage} style={styles.coverImage} />
        ) : (
            <View style={[styles.coverImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{color: '#94A3B8'}}>Sin Imagen de Portada</Text>
            </View>
        )}

        {/* Encabezado */}
        <View style={styles.headerContainer}>
            <Text style={styles.tag}>{propiedad.tipo_inmueble} EN VENTA</Text>
            <Text style={styles.title}>
                {propiedad.calle} {propiedad.numero_exterior}
            </Text>
            <Text style={styles.subtitle}>
                {propiedad.colonia}, {propiedad.municipio}, {propiedad.estado}
            </Text>
            <Text style={styles.price}>{formatCurrency(propiedad.valor_operacion)}</Text>
        </View>

        {/* Highlights Grid */}
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

        {/* Footer Pag 1 */}
        <View style={styles.footer}>
            <Text style={styles.footerText}>IANGE Real Estate</Text>
            <Text style={styles.footerText}>www.iange.xyz</Text>
        </View>
      </Page>

      {/* PÁGINA 2: GALERÍA (Si hay fotos) */}
      {galleryImages.length > 0 && (
        <Page size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>Galería</Text>
            <View style={styles.galleryContainer}>
                {galleryImages.map((img, index) => (
                    <Image key={index} src={img} style={styles.galleryImage} />
                ))}
            </View>
             <View style={styles.footer}>
                <Text style={styles.footerText}>IANGE Real Estate</Text>
                <Text style={styles.footerText}>Página 2</Text>
            </View>
        </Page>
      )}

      {/* PÁGINA 3: DETALLES Y LEGAL */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.textBlock}>
            {propiedad.descripcion_breve || propiedad.descripcion_general || "Sin descripción disponible."}
        </Text>

        <Text style={styles.sectionTitle}>Características y Equipamiento</Text>
        <View style={styles.detailsGrid}>
            {/* Lista dinámica de características si las tuvieras en un array, aquí simulamos con campos sueltos */}
            {propiedad.caracteristicas_principales?.split('\n').map((char, i) => (
                 <Text key={i} style={styles.detailItem}>• {char}</Text>
            ))}
            {!propiedad.caracteristicas_principales && (
                <>
                    <Text style={styles.detailItem}>• Ubicación privilegiada</Text>
                    <Text style={styles.detailItem}>• Alta plusvalía</Text>
                    <Text style={styles.detailItem}>• Documentación en regla</Text>
                </>
            )}
        </View>

        {/* Legal Text */}
        <Text style={styles.legalText}>
            * Los precios y la disponibilidad están sujetos a cambios sin previo aviso. Las imágenes son ilustrativas. 
            El precio no incluye gastos notariales, impuestos de adquisición, ni gastos de avalúo. 
            Consulte términos y condiciones con su asesor.
        </Text>

        <View style={styles.footer}>
            <Text style={styles.footerText}>Generado por IANGE</Text>
            <Text style={styles.footerText}>Contacto: contacto@iange.xyz</Text>
        </View>
      </Page>
    </Document>
  );
};

export default FichaTecnicaPDF;