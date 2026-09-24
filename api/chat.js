import { holocContext } from './dados.js';

export default async function handler(req, res) {
    // Garante que a API só aceite envio de mensagens
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;
    
    // A chave que vai ficar escondida lá no painel do Vercel
    const GROQ_API_KEY = process.env.GROQ_API_KEY; 

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
    }

    const modelsToTry = ["groq/compound-mini", "groq/compound", "qwen/qwen3.8-27b"];
    let responseData = null;
    let success = false;

    for (let modelName of modelsToTry) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    max_tokens: 180,
                    messages: [
                        { role: "system", content: holocContext },
                        { role: "user", content: message }
                    ]
                })
            });

            const data = await response.json();
            if (response.ok) {
                responseData = data;
                success = true;
                break; // Sucesso! Sai da tentativa de modelos
            }
        } catch (e) {
            // Se um modelo falhar, ele tenta o próximo silenciosamente
        }
    }

    // Se deu certo, devolve a resposta para o chat visual
    if (success && responseData) {
        const reply = responseData.choices?.[0]?.message?.content || "Desculpe, ocorreu um erro.";
        return res.status(200).json({ reply });
    } else {
        return res.status(500).json({ error: 'Não foi possível conectar aos modelos da Groq no momento.' });
    }
}
