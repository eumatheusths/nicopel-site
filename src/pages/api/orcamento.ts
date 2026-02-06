// Arquivo: src/pages/api/orcamento.ts
export const prerender = false;
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // Extração dos Dados
  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const phone = data.get("phone") as string; 
  const message = data.get("message") as string;
  const company = data.get("company") as string;
  const cargo = data.get("cargo") as string;
  const tamanho = data.get("tamanho_empresa") as string;
  const produto = data.get("produto") as string;
  const acabamento = data.get("acabamento") as string;

  // Rastreamento
  const trackingData: any = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'gclientid', 'conversion_identifier'].forEach(field => {
      const val = data.get(field);
      if(val) trackingData[field] = val;
  });

  // =================================================================================
  // AÇÃO 1: ENVIA PARA O PIPEFY (MÉTODO TOKEN DIRETO - À PROVA DE FALHAS)
  // =================================================================================
  const pipeToken = import.meta.env.PIPEFY_TOKEN; // Nova variável que criamos
  const pipeId = "306956973"; // ID Confirmado

  if (!pipeToken) {
      console.error("ERRO: Falta a variável PIPEFY_TOKEN na Vercel");
      // Não trava o site, mas avisa no log
  } else {
      try {
          // Formata Telefone
          let phonePipe = phone.replace(/\D/g, '');
          if (phonePipe.length > 0) {
              if (!phonePipe.startsWith('55') && phonePipe.length >= 10) phonePipe = '55' + phonePipe;
              phonePipe = '+' + phonePipe;
          }

          // IDs EXATOS DO SEU FORMULÁRIO
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
              headers: { 
                  "Content-Type": "application/json", 
                  "Authorization": `Bearer ${pipeToken}` // Usa o Token direto!
              },
              body: JSON.stringify(mutation)
          });
          
          const cardResult = await cardResponse.json();

          if(cardResult.errors) {
              console.error("ERRO PIPEFY:", JSON.stringify(cardResult.errors));
              // Se der erro de campo, devolve pro site mostrar
              return new Response(JSON.stringify({ erro: "Pipefy Recusou", detalhes: cardResult.errors }), { status: 400 });
          } else {
              console.log("✅ Sucesso Pipefy");
          }

      } catch (err) {
          console.error("Erro Conexão Pipefy:", err);
      }
  }

  // =================================================================================
  // AÇÃO 2: E-MAIL (MANTIDO)
  // =================================================================================
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
        subject: `[Lead Site] ${name} - ${company}`,
        html: `
          <h3>Novo Lead do Site</h3>
          <p>Nome: ${name}</p>
          <p>Empresa: ${company}</p>
          <p>Produto: ${produto}</p>
          <p>Mensagem: ${message}</p>
        `
      });
  } catch (e) { console.error("Erro email", e); }

  // =================================================================================
  // AÇÃO 3: RD STATION (MANTIDO)
  // =================================================================================
  try {
    if (import.meta.env.RD_TOKEN) {
        fetch('https://www.rdstation.com.br/api/1.2/conversions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token_rdstation: import.meta.env.RD_TOKEN,
                identificador: 'orcamento-site-nicopel', email: email, name: name,
                company: company, mobile_phone: phone
            })
        }).catch(err => console.error(err));
    }
  } catch (e) {}

  return new Response(JSON.stringify({ message: "Sucesso Total" }), { status: 200 });
};