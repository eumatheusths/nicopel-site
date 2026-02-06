// Arquivo: src/pages/api/orcamento.ts
export const prerender = false; // OBRIGATÓRIO para funcionar na Vercel
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  // ATENÇÃO: Se o frontend mandar JSON, usa request.json(), se mandar FormData, usa request.formData()
  // Pelo seu código anterior, o frontend manda FormData.
  const data = await request.formData();
  
  // 1. Extração dos Dados do Formulário
  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const company = data.get("company") as string;
  const phone = data.get("phone") as string; 
  const message = data.get("message") as string;
  
  // Campos extras que o Pipefy precisa (e que estão no seu form)
  const cargo = data.get("cargo") as string;
  const tamanho = data.get("tamanho_empresa") as string;
  const produto = data.get("produto") as string;
  const acabamento = data.get("acabamento") as string;

  // 2. UTMs e Rastreamento
  const trackingData: any = {};
  const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'gclid', 'gclientid', 'referrer', 'conversion_identifier'];
  fields.forEach(field => {
      const val = data.get(field);
      if(val) trackingData[field] = val;
  });

  // Validação Básica
  if (!name || !email || !phone) {
    return new Response(JSON.stringify({ message: "Dados incompletos" }), { status: 400 });
  }

  // ... (início do arquivo igual)

    // =================================================================================
    // AÇÃO 1: ENVIA PARA O PIPEFY (MODO DEBUG)
    // =================================================================================
    try {
        const clientId = import.meta.env.PIPEFY_CLIENT_ID;
        const clientSecret = import.meta.env.PIPEFY_CLIENT_SECRET;
        const pipeId = "306956973"; // ID Confirmado

        if (clientId && clientSecret) {
            // A. Autenticação
            const authResponse = await fetch("https://app.pipefy.com/oauth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
                body: new URLSearchParams({ "grant_type": "client_credentials", "client_id": clientId, "client_secret": clientSecret })
            });
            const authData = await authResponse.json();
            const pipeToken = authData.access_token;

            if (pipeToken) {
                // B. Formatação Telefone
                let phonePipe = phone.replace(/\D/g, '');
                if (phonePipe.length > 0) {
                    if (!phonePipe.startsWith('55') && phonePipe.length >= 10) phonePipe = '55' + phonePipe;
                    phonePipe = '+' + phonePipe;
                }

                // C. Mapeamento (IDs REAIS QUE VOCÊ PEGOU)
                const pipeFields = [
                    { field_id: "c7af3e9c-8189-4318-9a9b-9bdf9707b0db", value: name }, // Nome
                    { field_id: "0f33f98b-b77a-4a71-bb4b-72372c57e9ee", value: email }, // Email
                    { field_id: "5e8362f6-65ec-4566-ba99-2ccbd4c573dd", value: phonePipe }, // WhatsApp
                    { field_id: "9f6787cc-eeaf-4db4-a95d-dd4a78e12e48", value: company }, // Empresa
                    { field_id: "df88a5ef-71e5-4f92-8eeb-d205a396af22", value: cargo }, // Cargo
                    { field_id: "7aa7ac84-0dc4-49a2-a2dd-b2cecc87b4c5", value: tamanho }, // Tamanho
                    { field_id: "9cbd9506-58aa-4214-b352-9d3e25791028", value: produto }, // Produto
                    { field_id: "735ba523-6021-428a-8584-a2d53e7cface", value: acabamento } // Acabamento
                ];

                const mutation = {
                    query: `mutation CreateCard($pipeId: ID!, $fields: [FieldValueInput!]) {
                        createCard(input: { pipe_id: $pipeId, fields_attributes: $fields }) { card { id title } }
                    }`,
                    variables: { pipeId: pipeId, fields: pipeFields }
                };

                const cardResponse = await fetch("https://api.pipefy.com/graphql", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pipeToken}` },
                    body: JSON.stringify(mutation)
                });
                
                const cardResult = await cardResponse.json();

                // === AQUI ESTÁ O SEGREDO ===
                // Se o Pipefy der erro, vamos retornar esse erro pro navegador ver!
                if(cardResult.errors) {
                    console.error("ERRO DETALHADO PIPEFY:", JSON.stringify(cardResult.errors));
                    // Retorna o erro exato para você ver no Network Tab
                    return new Response(JSON.stringify({ 
                        erro: "Pipefy Rejeitou", 
                        detalhes: cardResult.errors 
                    }), { status: 400 }); 
                }
                
                console.log("✅ Sucesso Pipefy");
            }
        }
    } catch (err: any) {
        console.error("❌ Erro Crítico:", err);
        return new Response(JSON.stringify({ erro: "Erro Código", detalhes: err.message }), { status: 500 });
    }

// ... (resto do arquivo mantém igual: Email e RD)

  // =================================================================================
  // AÇÃO 2: ENVIA O EMAIL (Seu código original)
  // =================================================================================
  try {
      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com", 
        port: 587,
        secure: false,
        auth: {
          user: import.meta.env.SMTP_USER,
          pass: import.meta.env.SMTP_PASS,
        },
        tls: { ciphers: "SSLv3", rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from: `"Site Nicopel" <${import.meta.env.SMTP_USER}>`,
        to: "comercial@nicopel.com.br, atendimento@nicopel.com.br",
        replyTo: email,
        subject: `[Lead Site] ${name} - ${company || 'Nova Solicitação'}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h2 style="color: #B8E900; background: #000; padding: 10px; border-radius: 5px;">Nova Solicitação</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Empresa:</strong> ${company}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>WhatsApp:</strong> ${phone}</p>
            <hr/>
            <p><strong>Produto:</strong> ${produto} | <strong>Acabamento:</strong> ${acabamento}</p>
            <div style="background: #f9f9f9; padding: 15px;">${message || '-'}</div>
          </div>
        `
      });
      console.log("✅ Sucesso Email");
  } catch (error) {
      console.error("❌ Erro Email:", error);
  }

  // =================================================================================
  // AÇÃO 3: ENVIA PARA RD STATION (Seu código original)
  // =================================================================================
  try {
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
            mensagem_site: message
        };

        fetch('https://www.rdstation.com.br/api/1.2/conversions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rdPayload)
        }).catch(err => console.error("Erro Fetch RD:", err));
    }
  } catch (error) {
      console.error("❌ Erro RD:", error);
  }

  return new Response(JSON.stringify({ message: "Sucesso" }), { status: 200 });
};