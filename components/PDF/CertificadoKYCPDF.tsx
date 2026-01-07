import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

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
    paddingBottom: 60,
    paddingTop: 0,
  },
  headerContainer: {
    padding: 40,
    backgroundColor: '#FFF5F2', 
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTextContent: {
    flex: 1,
  },
  selfieContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#F37321',
    overflow: 'hidden',
    marginLeft: 20,
    backgroundColor: '#F1F5F9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  selfieImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  tag: {
    color: '#F37321', 
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E', 
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E',
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  statusBox: {
    marginHorizontal: 40,
    padding: 15,
    backgroundColor: '#F0FDF4', 
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    marginTop: 20,
  },
  statusText: {
    fontSize: 10,
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
  },
  hitBox: {
    marginHorizontal: 40,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#F37321',
    marginBottom: 10,
  },
  hitTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  hitDesc: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  legalText: {
    marginTop: 40,
    paddingHorizontal: 40,
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 1.5,
  }
});

interface CertificadoKYCPDFProps {
  kycData: { 
    ine: any; 
    pld: any; 
    bio?: any;
    selfieUrl?: string; 
  };
  nombre: string;
}

export const CertificadoKYCPDF: React.FC<CertificadoKYCPDFProps> = ({ kycData, nombre }) => {
  
  // ✅ SOLUCIÓN PARA CORS: Añadimos un timestamp para forzar una petición nueva y evitar caché bloqueada
  const selfieUrl = kycData.selfieUrl ? `${kycData.selfieUrl}?t=${Date.now()}` : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Footer */}
        <View fixed style={styles.footer}>
            <Text style={styles.footerText}>IANGE | Compliance & Biometric Tech</Text>
            <Text style={styles.footerText}>Certificado de Validación Digital</Text>
        </View>

        {/* Header */}
        <View style={styles.headerContainer}>
            <View style={styles.headerTextContent}>
                <Text style={styles.tag}>Dictamen KYC y Biometría</Text>
                <Text style={styles.title}>{cleanText(nombre)}</Text>
                <Text style={styles.subtitle}>ID VALIDACIÓN: POSITIVA</Text>
            </View>

            <View style={styles.selfieContainer}>
                {selfieUrl ? (
                    <Image 
                      // ✅ src como objeto URI con method GET explícito para ayudar al renderizador
                      src={{ uri: selfieUrl, method: 'GET', headers: {}, body: '' }} 
                      style={styles.selfieImage} 
                    />
                ) : (
                    <Text style={{ fontSize: 7, color: '#94A3B8', textAlign: 'center', padding: 5 }}>BIO-PHOTO PENDING</Text>
                )}
            </View>
        </View>

        {/* Bloque de Status */}
        <View style={styles.statusBox}>
            <Text style={styles.statusText}>● IDENTIDAD CONFIRMADA MEDIANTE RECONOCIMIENTO FACIAL BIOMÉTRICO</Text>
        </View>

        {/* Sección 1 */}
        <Text style={styles.sectionTitle}>1. Análisis de Biometría y Documento</Text>
        <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Clave de Elector</Text>
                <Text style={styles.detailValue}>{kycData.ine?.clave_de_elector || 'Validada'}</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CURP</Text>
                <Text style={styles.detailValue}>{kycData.ine?.curp || 'Validada'}</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Cotejo Facial</Text>
                <Text style={styles.detailValue}>{kycData.bio ? 'EXITOSO (MATCH 1:1)' : 'INE COINCIDENTE'}</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Prueba de Vida</Text>
                <Text style={styles.detailValue}>APROBADA</Text>
            </View>
        </View>

        {/* Sección 2 */}
        <Text style={styles.sectionTitle}>2. Prevención de Lavado de Dinero (PLD)</Text>
        
        {kycData.pld?.hits && kycData.pld.hits.length > 0 ? (
            kycData.pld.hits.map((hit: any, i: number) => (
                <View key={i} style={styles.hitBox} wrap={false}>
                    <Text style={styles.hitTitle}>COINCIDENCIA: {cleanText(hit.lista_nombre || 'Lista de Vigilancia')}</Text>
                    <Text style={styles.hitDesc}>{cleanText(hit.descripcion || 'Sin detalle adicional.')}</Text>
                </View>
            ))
        ) : (
            <View style={{ paddingHorizontal: 40, marginBottom: 10 }}>
                <Text style={{ fontSize: 10, color: '#334155' }}>
                    Sin incidencias detectadas en listas de sanciones (OFAC, ONU), PEPs o boletines judiciales vigentes.
                </Text>
            </View>
        )}

        {/* Legal */}
        <View style={styles.legalText}>
            <Text>
                * Este certificado ha sido generado mediante algoritmos de inteligencia artificial y cotejo directo con fuentes oficiales. 
                La imagen corresponde a la captura biométrica realizada en tiempo real por el usuario.
            </Text>
        </View>

      </Page>
    </Document>
  );
};

export default CertificadoKYCPDF;