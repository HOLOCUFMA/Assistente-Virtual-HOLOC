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

    // Pega a data e a hora exatas ajustadas para o fuso horário de São Luís (America/Fortaleza)
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaAtual = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' });

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
                    max_tokens: 1024,
                    temperature: 0.7, 
                    messages: [
                        { 
                            role: "system", 
                            content: `Informação temporal do sistema: Hoje é ${dataAtual}, às ${horaAtual}.\n\n` + holocContext + "\n\nAtue como um consultor criativo e especialista em projetos de extensão universitária da UFMA. Quando o utilizador pedir ideias de ações para os projetos (como FloreSER, JoyLAB, etc.), forneça sugestões práticas, inovadoras, detalhadas e estruturadas (com público-alvo, formato e objetivos)." 
                        },
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
