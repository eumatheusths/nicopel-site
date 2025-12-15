// src/pages/api/enviar-curriculo.ts
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  const nome = data.get("nome") as string;
  const email = data.get("email") as string;
  const telefone = data.get("telefone") as string;
  const vaga = data.get("vaga") as string;
  const mensagem = data.get("mensagem") as string;
  const arquivo = data.get("arquivo") as File;

  // 1. Validação Básica
  if (!nome || !email || !arquivo) {
    return new Response(JSON.stringify({ message: "Preencha os campos obrigatórios." }), { status: 400 });
  }

  // 2. Validação de Segurança do Arquivo
  if (arquivo.size > 3 * 1024 * 1024) {
    return new Response(JSON.stringify({ message: "O arquivo deve ter no máximo 3MB." }), { status: 400 });
  }

  if (arquivo.type !== "application/pdf" || !arquivo.name.toLowerCase().endsWith(".pdf")) {
    return new Response(JSON.stringify({ message: "Apenas arquivos PDF são permitidos." }), { status: 400 });
  }

  const arrayBuffer = await arquivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const header = buffer.toString('utf8', 0, 4);

  if (header !== "%PDF") {
     return new Response(JSON.stringify({ message: "Arquivo inválido. Envie um PDF real." }), { status: 400 });
  }

  // 3. Configuração do Transporter (Office 365)
  // Usa as variáveis de ambiente, mas com defaults para o Office 365 se não encontrar
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // Office 365 usa STARTTLS na porta 587, então secure é false
    auth: {
      user: import.meta.env.SMTP_USER || "atendimento@nicopel.com.br",
      pass: import.meta.env.SMTP_PASS, // A senha deve vir da variável de ambiente por segurança
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false, // Ajuda a evitar erros de certificado em alguns ambientes serverless
    },
  });

  try {
    // 4. Enviar o E-mail
    await transporter.sendMail({
      from: `"Banco de Talentos" <atendimento@nicopel.com.br>`, // DEVE ser o mesmo e-mail autenticado
      to: "rh@nicopel.com.br", // Quem recebe os currículos
      replyTo: email, // Para o RH clicar em "Responder" e ir para o candidato
      subject: `[Candidato] ${vaga} - ${nome}`,
      text: `
        Novo currículo recebido via site:
        
        Nome: ${nome}
        Email: ${email}
        Telefone: ${telefone}
        Vaga de Interesse: ${vaga}
        
        Mensagem:
        ${mensagem}
      `,
      attachments: [
        {
          filename: `${nome.replace(/[^a-z0-9]/gi, '_')}_Curriculo.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return new Response(JSON.stringify({ message: "Sucesso!" }), { status: 200 });

  } catch (error) {
    console.error("Erro de e-mail:", error);
    return new Response(JSON.stringify({ message: "Erro ao enviar. Tente novamente." }), { status: 500 });
  }
};