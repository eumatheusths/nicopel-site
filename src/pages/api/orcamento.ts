// src/pages/api/orcamento.ts
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // 1. Dados Básicos
  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const company = data.get("company") as string;
  const phone = data.get("phone") as string; // O formulário envia como 'phone'
  
  // 2. A Mensagem (Detalhes do Produto/Calculadora)
  // O seu script JS monta um resumo e coloca no campo 'message'
  const message = data.get("message") as string;

  // 3. UTMs e Rastreamento (Lista Completa)
  const trackingData: any = {};
  const fields = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 
      'utm_id', 'fbclid', 'gclid', 'gclientid', 'referrer', 'conversion_identifier'
  ];
  fields.forEach(field => {
      const val = data.get(field);
      if(val) trackingData[field] = val;
  });

  // Validação
  if (!name || !email || !phone) {
    return new Response(JSON.stringify({ message: "Dados incompletos" }), { status: 400 });
  }

  // 4. Configuração do SMTP (Atendimento)
  // IMPORTANTE: Se não usar Office365, altere o 'host' (ex: smtp.titan.email, smtp.hostinger.com.br)
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com", 
    port: 587,
    secure: false, // true para 465, false para outras portas
    auth: {
      user: import.meta.env.SMTP_USER, // Vai ler 'atendimento@nicopel.com.br'
      pass: import.meta.env.SMTP_PASS, // Vai ler a senha da Vercel
    },
    tls: { ciphers: "SSLv3", rejectUnauthorized: false }
  });

  try {
    // 5. Envia o E-mail Interno (Para a Nicopel)
    await transporter.sendMail({
      from: `"Site Nicopel" <${import.meta.env.SMTP_USER}>`, // Remetente deve ser o mesmo da autenticação
      to: "comercial@nicopel.com.br, atendimento@nicopel.com.br", // Quem recebe os leads
      replyTo: email, // Para responder direto ao cliente
      subject: `[Lead Site] ${name} - ${company || 'Nova Solicitação'}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #B8E900; background: #000; padding: 10px; border-radius: 5px;">Nova Solicitação de Orçamento</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Empresa:</strong> ${company}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>WhatsApp:</strong> ${phone}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <h3 style="color: #000;">Detalhes do Pedido:</h3>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #B8E900; white-space: pre-wrap;">${message || 'Nenhuma mensagem adicional.'}</div>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">
            Origem: <strong>${trackingData.utm_source || 'Direto'}</strong> | 
            Campanha: <strong>${trackingData.utm_campaign || '-'}</strong>
          </p>
        </div>
      `
    });

    // 6. Envia para o RD Station
    const rdToken = import.meta.env.RD_TOKEN;
    if (rdToken) {
        const rdPayload = {
            token_rdstation: rdToken,
            identificador: trackingData.conversion_identifier || 'orcamento-site-nicopel',
            email: email,
            name: name,
            company: company,
            mobile_phone: phone,
            personal_phone: phone,
            traffic_source: trackingData.utm_source, 
            utm_source: trackingData.utm_source,
            utm_medium: trackingData.utm_medium,
            utm_campaign: trackingData.utm_campaign,
            client_id: trackingData.gclientid,
            fbclid: trackingData.fbclid,
            gclid: trackingData.gclid,
            mensagem_site: message // Envia os detalhes do produto para o RD também
        };

        // Dispara para o RD (sem travar o envio se der erro aqui)
        fetch('https://www.rdstation.com.br/api/1.2/conversions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rdPayload)
        }).catch(err => console.error("Erro RD:", err));
    }

    return new Response(JSON.stringify({ message: "Sucesso" }), { status: 200 });

  } catch (error) {
    console.error("Erro fatal no envio de email:", error);
    return new Response(JSON.stringify({ message: "Erro ao enviar e-mail. Verifique as credenciais SMTP." }), { status: 500 });
  }
};