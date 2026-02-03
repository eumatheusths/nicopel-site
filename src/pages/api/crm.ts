// Arquivo: src/pages/api/crm.ts
export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  
  // 1. Pega as credenciais da Conta de Serviço
  const clientId = import.meta.env.PIPEFY_CLIENT_ID;
  const clientSecret = import.meta.env.PIPEFY_CLIENT_SECRET;
  const pipeId = "306956973"; 

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ erro: "Credenciais de Serviço (ID/Secret) não configuradas" }), { status: 500 });
  }

  try {
    // 2. O PASSO NOVO: Autenticação OAuth (Troca ID+Secret por Token)
    const authResponse = await fetch("https://app.pipefy.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        "grant_type": "client_credentials",
        "client_id": clientId,
        "client_secret": clientSecret
      })
    });

    const authData = await authResponse.json();
    
    if (!authResponse.ok || !authData.access_token) {
      throw new Error(`Falha na autenticação: ${JSON.stringify(authData)}`);
    }

    const token = authData.access_token;

    // 3. Mapeamento dos campos (Igual ao anterior)
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

    // 4. Envia para o Pipefy usando o Token gerado
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

    const cardResponse = await fetch("https://api.pipefy.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // Usa o token fresco que acabamos de pegar
      },
      body: JSON.stringify(query)
    });

    const result = await cardResponse.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (error: any) {
    console.error("Erro na API:", error);
    return new Response(JSON.stringify({ 
      erro: "Falha interna no servidor", 
      detalhes: error.message 
    }), { status: 500 });
  }
}