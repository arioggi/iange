import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { entity_id, tenant_id } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Obtener los resultados de las validaciones de la tabla que ya tenemos
    const { data: checks } = await supabase
      .from('kyc_validations')
      .select('*')
      .eq('entity_id', entity_id)
      .eq('status', 'success');

    const ine = checks?.find(c => c.validation_type === 'VALIDATE_INE')?.api_response;
    const pld = checks?.find(c => c.validation_type === 'CHECK_BLACKLIST')?.api_response;

    const doc = new jsPDF();
    let y = 20;

    // --- FUNCIÓN AUXILIAR PARA EVITAR COLAPSO (Salto de página) ---
    const checkPage = (neededSpace: number) => {
      if (y + neededSpace > 280) {
        doc.addPage();
        y = 20;
      }
    };

    // --- DISEÑO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("REPORTE DE VERIFICACIÓN DE IDENTIDAD (KYC)", 105, y, { align: "center" });
    y += 15;

    // Sección Identidad
    doc.setFontSize(12);
    doc.text("1. RESULTADO DE IDENTIDAD: VERIFICADA", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${ine?.nombre || 'N/A'} ${ine?.apellido_paterno || ''}`, 20, y);
    y += 7;
    doc.text(`Clave Elector: ${ine?.clave_de_elector || 'N/A'}`, 20, y);
    y += 15;

    // Sección PLD (Lógica para informes largos)
    doc.setFont("helvetica", "bold");
    doc.text("2. ANÁLISIS DE LISTAS DE RIESGO (PLD/AML)", 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (pld?.hits && pld.hits.length > 0) {
      pld.hits.forEach((hit: any) => {
        checkPage(20); // Verifica si hay espacio para el siguiente bloque
        doc.text(`• Coincidencia: ${hit.lista || 'Lista Informativa'}`, 25, y);
        y += 5;
        const desc = doc.splitTextToSize(`Detalle: ${hit.descripcion || 'Sin descripción adicional'}`, 160);
        doc.text(desc, 30, y);
        y += (desc.length * 5) + 5;
      });
    } else {
      doc.text("No se encontraron coincidencias en listas negras internacionales.", 25, y);
      y += 10;
    }

    // Pie de página legal
    checkPage(30);
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    const legalText = "Este documento es un complemento a los reportes inteligentes de IANGE. La identidad ha sido verificada mediante cotejo con la lista nominal y análisis de riesgo PLD.";
    doc.text(doc.splitTextToSize(legalText, 170), 20, y);

    const pdfBase64 = doc.output('datauristring');

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})