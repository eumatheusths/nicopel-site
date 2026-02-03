// Arquivo: src/pages/api/crm.ts
export const prerender = false; // Importante: Diz pro Astro que isso roda no servidor
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  
  // Pega o token do arquivo .env (segurança)
  const token = import.meta.env.PIPEFY_TOKEN;
  const pipeId = "306956973"; 

  if (!token) {
    return new Response(JSON.stringify({ erro: "Token não configurado no .env ou Vercel" }), { status: 500 });
  }

  // Mapeamento com SEUS IDs do Pipefy
  const fields = [
    { field_id: "neg_cio", value: data.nome },
    { field_id: "email", value: data.email },
    { field_id: "telefone", value: data.whatsapp },
    { field_id: "empresa", value: data.empresa },
    { field_id: "seu_cargo", value: data.cargo },
    { field_id: "copy_of_seu_cargo", value: data.tamanho }, 
    { field_id: "copy_of_tamanho_da_empresa_n_colaboradores", value: data.produto },
    { field_id: "copy_of_qual_produto_voc_precisa", value: data.acabamento }
  ];

  const query = {
    query: `mutation CreateCard($pipeId: ID!, $fields: [FieldValueInput!]) {
      createCard(input: { pipe_id: $pipeId, fields_attributes: $fields }) {
        card { id title }
      }
    }`,
    variables: {
      pipeId: pipeId,
      fields: fields.map(f => ({ field_id: f.field_id, field_value: f.value }))
    }
  };

  try {
    const response = await fetch("https://api.pipefy.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(query)
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ erro: "Falha na conexão" }), { status: 500 });
  }
}