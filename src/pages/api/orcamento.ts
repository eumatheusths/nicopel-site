// src/pages/api/orcamento.ts
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // 1. Captura os Dados do Formulário
  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const company = data.get("company") as string;
  const phone = data.get("phone") as string;
  
  // Captura os dados da calculadora (mensagem montada)
  // Se vier vazio, tentamos pegar o campo 'message' simples
  let message = data.get("message") as string;
  const simpleMsg = data.get("simple_message") as string; 
  if(!message && simpleMsg) message = simpleMsg;

  // 2. Captura UTMs e Rastreamento (para o RD Station)
  const trackingData: any = {};
  const fields = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 
      'utm_id', 'fbclid', 'gclid', 'gclientid', 'referrer', 'conversion_identifier'
  ];
  fields.forEach(field => {
      const val = data.get(field);
      if(val) trackingData[field] = val;
  });

  // Validação Básica
  if (!name || !email || !phone) {
    return new Response(JSON.stringify({ message: "Dados incompletos" }), { status: 400 });
  }

  // 3. CONFIGURAÇÃO DO SMTP (E-mail de Atendimento)
  // Nota: Se não for Office365, mude o 'host' (ex: smtp.hostinger.com.br, smtp.titan.email)
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com", 
    port: 587,
    secure: false, 
    auth: {
      user: import.meta.env.SMTP_USER, // Vai ler 'atendimento@nicopel.com.br' da Vercel
      pass: import.meta.env.SMTP_PASS, // Vai ler a senha da Vercel
    },
    tls: { ciphers: "SSLv3", rejectUnauthorized: false }
  });

  try {
    // 4. Envia o E-mail para o Comercial/Atendimento
    await transporter.sendMail({
      from: `"Site Nicopel" <${import.meta.env.SMTP_USER}>`, // Sai do e-mail de atendimento
      to: "atendimento@nicopel.com.br, comercial@nicopel.com.br", // Quem recebe (pode por vírgula para mais gente)
      replyTo: email, // Quando você clicar em responder, vai para o cliente
      subject: `[Novo Lead] ${name} - ${company || 'Site'}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #000;">Nova Solicitação de Orçamento</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Empresa:</strong> ${company}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefone/Zap:</strong> ${phone}</p>
          <hr/>
          <h3>Detalhes do Pedido:</h3>
          <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace;">${message}</pre>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            Origem: <strong>${trackingData.utm_source || 'Direto'}</strong> | 
            Campanha: <strong>${trackingData.utm_campaign || '-'}</strong>
          </p>
        </div>
      `
    });

    // 5. Envia para o RD Station
    const rdToken = import.meta.env.RD_TOKEN;
    if (rdToken) {
        const rdPayload = {
            token_rdstation: rdToken,
            identificador: trackingData.conversion_identifier || 'orcamento-site',
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
            mensagem_site: message
        };

        await fetch('https://www.rdstation.com.br/api/1.2/conversions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rdPayload)
        });
    }

    return new Response(JSON.stringify({ message: "Sucesso" }), { status: 200 });

  } catch (error) {
    console.error("Erro no envio:", error);
    return new Response(JSON.stringify({ message: "Erro interno no envio de e-mail" }), { status: 500 });
  }
};