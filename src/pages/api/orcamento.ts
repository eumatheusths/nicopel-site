// Arquivo: src/pages/api/orcamento.ts
export const prerender = false;
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // DADOS
  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const phone = data.get("phone") as string; 
  const message = data.get("message") as string;
  const company = data.get("company") as string;
  const cargo = data.get("cargo") as string;
  const tamanho = data.get("tamanho_empresa") as string;
  const produto = data.get("produto") as string;
  const acabamento = data.get("acabamento") as string;

  // 1. DADOS DE RASTREAMENTO
  const trackingData: any = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'gclientid', 'conversion_identifier'].forEach(field => {
      const val = data.get(field);
      if(val) trackingData[field] = val;
  });

  // 2. TENTATIVA DE ENVIO PIPEFY (SEM TRY/CATCH PARA FORÇAR O ERRO A APARECER)
  const clientId = import.meta.env.PIPEFY_CLIENT_ID;
  const clientSecret = import.meta.env.PIPEFY_CLIENT_SECRET;
  const pipeId = "306956973"; // SEU PIPE ID CONFIRMADO

  console.log("🚀 Iniciando envio Pipefy...");

  if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ erro: "Faltam Variáveis de Ambiente (Client ID/Secret)" }), { status: 500 });
  }

  // A. AUTH
  const authResponse = await fetch("https://app.pipefy.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: new URLSearchParams({ "grant_type": "client_credentials", "client_id": clientId, "client_secret": clientSecret })
  });
  
  const authData = await authResponse.json();
  if (!authResponse.ok) {
      return new Response(JSON.stringify({ erro: "Falha Auth Pipefy", detalhe: authData }), { status: 400 });
  }
  const pipeToken = authData.access_token;

  // B. CARD
  let phonePipe = phone.replace(/\D/g, '');
  if (phonePipe.length > 0) {
      if (!phonePipe.startsWith('55') && phonePipe.length >= 10) phonePipe = '55' + phonePipe;
      phonePipe = '+' + phonePipe;
  }

  // IDs REAIS DA SUA IMAGEM
  const pipeFields = [
      { field_id: "c7af3e9c-8189-4318-9a9b-9bdf9707b0db", value: name }, 
      { field_id: "0f33f98b-b77a-4a71-bb4b-72372c57e9ee", value: email },
      { field_id: "5e8362f6-65ec-4566-ba99-2ccbd4c573dd", value: phonePipe },
      { field_id: "9f6787cc-eeaf-4db4-a95d-dd4a78e12e48", value: company },
      { field_id: "df88a5ef-71e5-4f92-8eeb-d205a396af22", value: cargo },
      { field_id: "7aa7ac84-0dc4-49a2-a2dd-b2cecc87b4c5", value: tamanho },
      { field_id: "9cbd9506-58aa-4214-b352-9d3e25791028", value: produto },
      { field_id: "735ba523-6021-428a-8584-a2d53e7cface", value: acabamento }
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

  // SE TIVER ERRO, VAI EXPLODIR NA TELA AGORA
  if(cardResult.errors) {
      return new Response(JSON.stringify({ 
          erro: "PIPEFY RECUSOU", 
          detalhes_tecnicos: cardResult.errors 
      }), { status: 400 });
  }

  // 3. E-MAIL (SÓ EXECUTA SE O PIPEFY PASSAR)
  try {
      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com", port: 587, secure: false,
        auth: { user: import.meta.env.SMTP_USER, pass: import.meta.env.SMTP_PASS },
        tls: { ciphers: "SSLv3", rejectUnauthorized: false }
      });
      await transporter.sendMail({
        from: `"Site Nicopel" <${import.meta.env.SMTP_USER}>`,
        to: "comercial@nicopel.com.br, atendimento@nicopel.com.br",
        replyTo: email,
        subject: `[Lead] ${name} - ${company}`,
        html: `<p>Novo lead: ${name} (${company})</p>`
      });
  } catch (e) { console.error("Erro mail", e); }

  // 4. RD STATION
  try {
    if (import.meta.env.RD_TOKEN) {
        fetch('https://www.rdstation.com.br/api/1.2/conversions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token_rdstation: import.meta.env.RD_TOKEN,
                identificador: 'orcamento-site-nicopel', email: email
            })
        }).catch(err => console.error(err));
    }
  } catch (e) {}

  // MENSAGEM FINAL EXCLUSIVA PARA TESTE
  return new Response(JSON.stringify({ message: "TESTE NOVO MATHEUS" }), { status: 200 });
};