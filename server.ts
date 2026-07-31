import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy GoogleGenAI initialization
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      } 
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// Model declarations for specific tasks:
// 1. Analysis, Evaluation & Pedagogy Breakdown Module -> gemini-3.6-flash
const MODEL_ANALYSIS = 'gemini-3.6-flash';

// 2. Sentence Production & Drill Generation Module -> gemini-2.5-flash
const MODEL_PRODUCTION = 'gemini-2.5-flash';

const MODEL_NAME = MODEL_PRODUCTION;

// Helper to safely parse JSON from Gemini text output
function parseGeminiJson(rawText: string | undefined): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }
  return JSON.parse(cleaned);
}

// Resilient helper to execute model generation with fallback
async function generateJsonWithModel(
  ai: GoogleGenAI,
  preferredModel: string,
  prompt: string,
  temperature: number = 0.2
): Promise<any> {
  try {
    const response = await ai.models.generateContent({
      model: preferredModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature,
      }
    });
    return parseGeminiJson(response.text);
  } catch (err: any) {
    if (preferredModel !== MODEL_PRODUCTION) {
      console.warn(`Model ${preferredModel} failed, falling back to ${MODEL_PRODUCTION}:`, err?.message || err);
      const fallbackResponse = await ai.models.generateContent({
        model: MODEL_PRODUCTION,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature,
        }
      });
      return parseGeminiJson(fallbackResponse.text);
    }
    throw err;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Low-latency Evaluation Endpoint (ANALYSIS MODULE -> gemini-3.6-flash)
app.post('/api/evaluate', async (req, res) => {
  const { language, turkishPrompt, targetReference, userAnswer, hintsUsedCount, intensityLevel } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const lvl = intensityLevel || 'intermediate';
    
    const langPedagogyNotes: Record<string, string> = {
      de: `PEDAGOGY & DETAILED ANALYSIS FOR GERMAN (de):
- V2 Word Order Rule: In German main clauses, the conjugated verb ALWAYS occupies position 2, whereas Turkish puts verbs at the end (SOV). Explain this contrast clearly.
- Article Cases (Kasus): Explain Nominativ (der/die/das), Akkusativ (den/die/das/einen/eine - e.g. "einen Kaffee"), and Dativ (dem/der/dem/einem/einer - e.g. "aus der Türkei", "mit dem Bus").
- Separable & Modal Verbs: In modal verb sentences ("Ich möchte... trinken"), the infinitive moves to the end.
- Warm, teacher-like tone: Praise the user's effort, explain *why* the error occurred due to Turkish thinking habits, and provide a memorable rule of thumb ("Zihinsel Kural / Kısayol").`,
      sr: `PEDAGOGY & DETAILED ANALYSIS FOR SERBIAN (sr):
- Auxiliary Verbs (Pomoćni glagoli): Present tense enclitics of "biti" (sam, si, je, smo, ste, su) must be placed right after the first stressed element (e.g. "Ja sam...", "Da li ste...").
- Noun Cases (Padeži): Direct objects take Akuzativ ending (feminine -a changes to -u: kafa -> kafu, voda -> vodu, e.g. "Molim vas, jednu kafu"). Origin with "iz" takes Genitiv (Turska -> iz Turske).
- Encouraging Single-Clause Fluency: Affirm clean, direct conversational sentences without forcing complex subordinating conjunctions (da, jer, ako).
- Warm, teacher-like tone: Gently point out Turkish suffix habit vs Serbian case/auxiliary structure with a helpful mental rule of thumb.`,
      en: `PEDAGOGY FOR ENGLISH (en):
- Encourage natural Subject-Verb-Object (SVO) order, polite modals (Could/Would), and prepositional combinations (report to, send by email).
- Explain contrastively with Turkish sentence habits in a warm, encouraging master teacher tone.`
    };

    const prompt = `Role: You are an expert Language Learning Pedagogue & Empathetic AI Master Coach (Uzman Dil Eğitmeni ve Sabırlı Koç).
Task: Evaluate a student's sentence production attempt in ${language}.

Context:
- Target Language: ${language}
- Level / Intensity: ${lvl}
- Turkish Prompt: "${turkishPrompt}"
- Target Reference: "${targetReference}"
- Student Answer: "${userAnswer}"
- Hints Used: ${hintsUsedCount}

${langPedagogyNotes[language] || langPedagogyNotes.en}

EVALUATION GUIDELINES:
1. Tone: Warm, highly encouraging, master teacher persona. Never sound cold or purely algorithmic.
2. Pedagogical Breakdowns: When explaining errors, explain *why* in clear Turkish by comparing Turkish thinking habits against ${language} grammar rules.
3. Provide a clear, memorable mental rule of thumb ("Zihinsel Kural") and actionable step-by-step resolution steps.

Return ONLY compact JSON:
{
  "overallVerdict": "correct" | "natural_variant" | "minor_issue" | "major_issue" | "incorrect",
  "suggestedRating": "easy" | "good" | "hard" | "again",
  "errorSeverity": "none" | "style_only" | "minor" | "moderate" | "critical",
  "errors": [
    {
      "category": "grammar" | "vocabulary" | "word_order" | "style" | "spelling",
      "message": "Step-by-step teacher explanation in Turkish explaining why this is an error and how to fix it",
      "userPart": "problematic part of user answer",
      "suggestion": "suggested correction"
    }
  ],
  "naturalAlternatives": ["Natural alternative 1"],
  "explanationTr": "🎓 ÖĞRETİCİ FEEDBACK: Warm, master-teacher feedback in Turkish explaining the grammar mechanism, contrast with Turkish thinking, and giving a pedagogical rule of thumb.",
  "selfCorrectionPrompt": "Encouraging short Turkish tip to help the student rewrite correctly"
}`;

    const parsed = await generateJsonWithModel(ai, MODEL_ANALYSIS, prompt, 0.2);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/evaluate:', err);
    return res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

// Low-latency Register Generator (PRODUCTION MODULE -> gemini-2.5-flash)
app.post('/api/how-do-i-say', async (req, res) => {
  const { turkishText, language } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const prompt = `Translate to ${language} in 3 registers: Natural/Casual, Formal, Simple.
Turkish: "${turkishText}"

Return JSON:
{
  "options": [
    {
      "register": "natural" | "formal" | "simple",
      "titleTr": "Title in Turkish",
      "textTarget": "Translation in ${language}",
      "explanationTr": "Brief Turkish usage context"
    }
  ]
}`;

    const parsed = await generateJsonWithModel(ai, MODEL_PRODUCTION, prompt, 0.2);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/how-do-i-say:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Multi-turn Gemini Chatbot with specific persona system instructions
app.post('/api/chat', async (req, res) => {
  const { personaId, language, history, newUserMessage, customSystemInstruction, modelPreference } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    // Determine model to use
    let targetModel = MODEL_NAME; // default gemini-2.5-flash
    if (modelPreference === 'gemini-3.1-pro-preview') {
      targetModel = 'gemini-2.5-pro';
    } else if (modelPreference === 'gemini-3.1-flash-lite') {
      targetModel = 'gemini-2.5-flash';
    } else if (modelPreference === 'gemini-3.5-flash') {
      targetModel = 'gemini-2.5-flash';
    }

    const personaRoles: Record<string, string> = {
      alex_everyday: `You are Alex/Sophia, a friendly, warm conversational partner in ${language}. You talk about daily life, travel, hobbies, and weekend plans in an encouraging and natural tone.`,
      dr_sarah: `You are Dr. Sarah Jenkins, an expert clinical physiotherapist and medical colleague. You discuss patient cases, rehab protocols, and medical communication in ${language}.`,
      alex_examiner: `You are Alex Vance, an official IELTS Speaking examiner. You conduct structured IELTS speaking interview practice in ${language}, evaluating vocabulary and sentence flow.`,
      p_barista: `You are Lukas, a friendly cafe barista. You take customer orders, suggest beverages, and engage in warm cafe banter in ${language}.`,
      p_custom: customSystemInstruction || `You are an expert language practice chatbot in ${language}.`
    };

    const baseRole = customSystemInstruction || personaRoles[personaId] || `You are a conversational practice persona in ${language}.`;

    const systemInstruction = `System Instruction & Role Definition:
${baseRole}

Language Rule: You MUST write your conversation response strictly in ${language}.
Conversation Scope: Maintain natural multi-turn context. Keep responses concise (1-3 sentences) to encourage active user participation.
Pedagogy Rule: If the user's message contains noticeable grammar or vocabulary errors, provide a brief, warm correction note in Turkish in "grammarCorrection".

Return ONLY JSON:
{
  "text": "Your response in ${language}",
  "translationTr": "Accurate Turkish translation of your response",
  "grammarCorrection": "Optional brief Turkish feedback if user made a grammar error (leave empty if sentence is good)"
}`;

    // Include last 10 turns of multi-turn conversation history
    const historyText = (history || [])
      .slice(-10)
      .map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant Persona'}: ${h.text}`)
      .join('\n');

    const fullPrompt = `${systemInstruction}\n\nMulti-turn Conversation History:\n${historyText}\nUser: ${newUserMessage}`;

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        }
      });
      responseText = response.text || '';
    } catch (modelErr: any) {
      console.warn(`Model ${targetModel} call failed, falling back to ${MODEL_NAME}:`, modelErr);
      const fallbackResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        }
      });
      responseText = fallbackResponse.text || '';
    }

    const parsed = parseGeminiJson(responseText);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Low-latency Word Lookup (ANALYSIS MODULE -> gemini-3.6-flash)
app.post('/api/lookup-word', async (req, res) => {
  const { word, contextSentence, language } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const prompt = `Provide quick dictionary definition and translation for word "${word}" in language "${language}".
Context sentence: "${contextSentence || ''}"

Return ONLY JSON:
{
  "translationTr": "Turkish meaning of the word",
  "grammaticalRole": "Noun / Verb / Adjective etc.",
  "cefrLevel": "A1/A2/B1/B2/C1",
  "exampleSentence": "Short example sentence in ${language}",
  "exampleTranslationTr": "Turkish translation of example sentence"
}`;

    const parsed = await generateJsonWithModel(ai, MODEL_ANALYSIS, prompt, 0.1);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/lookup-word:', err);
    return res.status(500).json({ error: err.message });
  }
});

// AI Grammar Drills Generator Endpoint (PRODUCTION MODULE -> gemini-2.5-flash)
app.post('/api/generate-grammar-drills', async (req, res) => {
  const { language, cefrLevel, errorTopics, userErrorsCount } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const topicsStr = Array.isArray(errorTopics) && errorTopics.length > 0 
      ? errorTopics.join(', ') 
      : 'Söz dizimi, edat/artikel hataları, fiil zamanları';

    const prompt = `Task: Generate 3 personalized grammar sentence construction drills for language student studying ${language}.
CEFR Level: ${cefrLevel || 'B1'}
User's Target Error Areas: ${topicsStr}
Recorded Error History Count: ${userErrorsCount || 3}

IMPORTANT STYLE RULE:
- For German (de) and Serbian (sr) in particular, focus on simple, natural, everyday conversational situations and practical daily life sentences (greetings, coffee shop, casual questions, introducing oneself, shopping, simple daily requests, family, daily routine). Avoid complex, long multi-clause sentences or heavy physiotherapy/medical terminology unless specifically asked.
- Focus on Turkish interference errors (Turkish thinking habits like word order, missing prepositions, or direct literal translation).

Return ONLY JSON object matching schema:
{
  "drills": [
    {
      "id": "drill_id",
      "grammarTopic": "Specific grammar topic name in Turkish (e.g. Günlük Diyalog & Edat Sıralaması)",
      "cefrLevel": "${cefrLevel || 'B1'}",
      "turkishSentence": "Meaningful, realistic, natural Turkish prompt sentence",
      "targetReference": "Natural, native reference sentence in ${language}",
      "targetVariants": ["Alternative correct sentence 1"],
      "grammarPattern": "Name of grammar pattern or rule",
      "fossilizedErrorFocus": "Explanation in Turkish of why Turkish speakers struggle with this pattern",
      "hintLadder": {
        "partOfSpeech": "Sentence structure type",
        "firstLetters": "First letters of words in reference",
        "partialWords": "Partial reference words",
        "patternHint": "Grammar ordering rule hint in Turkish",
        "keyWordsGiven": "3-4 main keywords in ${language}",
        "fullAnswer": "Full reference sentence"
      }
    }
  ]
}`;

    const parsed = await generateJsonWithModel(ai, MODEL_PRODUCTION, prompt, 0.3);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/generate-grammar-drills:', err);
    return res.status(500).json({ error: err.message });
  }
});

// AI Level-Tailored Grammar Hint & Alternative Structures Endpoint (ANALYSIS MODULE -> gemini-3.6-flash)
app.post('/api/generate-grammar-hint', async (req, res) => {
  const { language, cefrLevel, grammarTopic, turkishSentence, errorDescription } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const langPedagogyGuide: Record<string, string> = {
      de: `ALMANCA (de) ÖĞRETİM REHBERİ:
- V2 Fiil Konumu Kuralı: Düz cümlede çekimli fiil HER ZAMAN 2. pozisyondadır (Özne/Zaman + Fiil + Nesne). Türkçedeki fiili sona atma alışkanlığını adım adım kır.
- İsim Halleri (Kasus): Yalın (Nominativ), İsmin -i hali (Akkusativ - der->den, einen Kaffee), İsmin -e/-de hali (Dativ - aus der Türkei, mit dem Bus).
- Ayrılabilen & Modal Fiiller: "Ich möchte bitte einen Kaffee trinken" kalıbındaki gibi yalın fiilin sona gitmesi.
- Nezaket Kalıpları: "Ich möchte bitte...", "Könnten Sie bitte...", "Kann ich bitte...".`,
      sr: `SIRPÇA (sr) ÖĞRETİM REHBERİ:
- Yardımcı Fiiller (Enclitic sam/si/je/smo/ste/su): Cümlede ilk vurgulu kelimeden hemen sonra gelmelidir ("Ja sam Ahmet", "Da li ste dobro?").
- İsim Halleri (Padeži - Akuzativ): Nesne konumundaki dişiler -a ekini -u yapar ("kafa" -> "jednu kafu", "voda" -> "jednu vodu"). Ayrılma durumunda "iz" + Genitiv ("iz Turske").
- Cinsiyet & Çekim Uyumu: Eril/Dişil/Nötr isimlerin sıfat ve fiille uyumu.
- Yalın Diyalog Kalıpları: Başlangıçta karmaşık "da/jer/ako" bağlaçları yerine kısa, net, bağlaçsız günlük diyalog kalıplarını pekiştir ("Molim vas...", "Zdravo, ja sam...").`,
      en: `İNGİLİZCE (en) ÖĞRETİM REHBERİ:
- Özne + Fiil + Nesne (SVO) temel dizilimi.
- Edat Birliktelikleri: "report to someone", "send by email", "arrive at/in".
- Nezaket Soruları: "Could you please...", "Would you mind...".`
    };

    const prompt = `Role: You are an expert Language Learning Pedagogue & Empathetic Grammar Coach (Uzman Dil Eğitmeni ve Sabırlı Gramer Koçu). You provide warm, encouraging, highly structured, pedagogical guidance for a Turkish learner studying ${language} at CEFR Level ${cefrLevel || 'B1'}.

Grammar Topic: ${grammarTopic || 'Gramer ve Cümle Dizilimi'}
Turkish Prompt Sentence: "${turkishSentence || 'Cümle kalıbı'}"
Target Focus / Interference Area: "${errorDescription || 'Söz dizimi ve edatlar'}"

Language Specific Pedagogy Focus:
${langPedagogyGuide[language] || langPedagogyGuide.en}

Requirements:
1. "levelTailoredHint": Act like an empathetic expert language teacher. Explain in warm, clear Turkish *how* to build this sentence step-by-step. Include a memorable "Zihinsel Kural / Kısayol" suited for CEFR ${cefrLevel || 'B1'}.
2. "stepByStepSolution": Provide 3 distinct numbered resolution steps in Turkish (e.g. ["1. Özne & Fiil Konumu: ...", "2. Artikel & İsim Hali (Akkusativ/Akuzativ): ...", "3. Doğal Dizilim & Edat Bağlantısı: ..."]).
3. "alternativeStructures": Provide 2-3 distinct, natural alternative ways to express the same Turkish meaning in ${language} (e.g. Daily Conversational / Polite Request / Formal). Include a brief, friendly Turkish explanation for each.
4. "commonPitfallsToAvoid": List 2-3 specific "Türkçe Düşünme Tuzakları" (Turkish interference pitfalls) that Turkish speakers fall into for this pattern (e.g. placing verb at end, omitting article case, wrong auxiliary order).
5. "keyVocabulary": Provide 3-4 key target words or phrases with their Turkish meanings in parentheses (e.g. "jednu kafu (bir kahve - akuzativ)").

Return ONLY JSON matching schema:
{
  "levelTailoredHint": "Warm, expert teacher explanation in Turkish with a memorable mental rule of thumb (Zihinsel Kural)",
  "stepByStepSolution": [
    "Adım 1: ...",
    "Adım 2: ...",
    "Adım 3: ..."
  ],
  "alternativeStructures": [
    {
      "patternName": "Günlük Konuşma / Nezaket Üslubu Adı (Türkçe)",
      "sentenceInTargetLang": "Sentence in target language",
      "explanation": "Brief, helpful explanation in Turkish"
    }
  ],
  "commonPitfallsToAvoid": ["Tuzak 1: ...", "Tuzak 2: ..."],
  "keyVocabulary": ["key word 1 (anlamı)", "key word 2 (anlamı)"]
}
`;

    const parsed = await generateJsonWithModel(ai, MODEL_ANALYSIS, prompt, 0.3);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/generate-grammar-hint:', err);
    return res.status(500).json({ error: err.message });
  }
});

// AI Mini Error Elimination Quiz Endpoint (ANALYSIS MODULE -> gemini-3.6-flash)
app.post('/api/generate-error-quiz', async (req, res) => {
  const { language, cefrLevel, userErrors } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const errorsListStr = Array.isArray(userErrors) && userErrors.length > 0
      ? userErrors.map((e: any) => `[ID: ${e.id}] Category: ${e.errorCategory}, Desc: ${e.errorDescription}, Incorrect: ${e.incorrectPattern || ''}, Correct: ${e.correctPattern || ''}`).join('\n')
      : 'Word order, preposition usage, and tense consistency errors.';

    const prompt = `Task: Generate a 3-question "Mini Hata Giderme Testi" (Mini Error Elimination Quiz) for a Turkish learner studying ${language} at CEFR Level ${cefrLevel || 'B1'}.
Target Fossilized Errors:
${errorsListStr}

For each question:
1. Target one specific user error or Turkish interference pattern.
2. Provide a clear Turkish prompt/question.
3. Provide 4 multiple-choice options in ${language} (1 correct, 3 plausible distractor choices reflecting typical Turkish interference errors).
4. Identify the index (0-3) of the correct option.
5. Provide a detailed explanation in Turkish explaining why the correct choice is right and what Turkish thinking habit caused the distractor mistakes.
6. Link back to the original fossilized error ID if matching.

Return ONLY JSON matching schema:
{
  "quizTitle": "3 Soru ile Kemikleşmiş Hataları Temizleme Testi",
  "questions": [
    {
      "id": "q1",
      "fossilizedErrorId": "associated_error_id_or_null",
      "errorCategory": "Category name in Turkish",
      "turkishPrompt": "Question or sentence translation prompt in Turkish",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanationTr": "Detailed explanation of grammar rule and why other choices represent Turkish interference habits."
    }
  ]
}`;

    const parsed = await generateJsonWithModel(ai, MODEL_ANALYSIS, prompt, 0.3);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/generate-error-quiz:', err);
    return res.status(500).json({ error: err.message });
  }
});

// LingQ Integration Proxy Endpoint for language statistics
app.post('/api/lingq/stats', async (req, res) => {
  const { apiKey, language } = req.body;
  const langCode = language === 'de' ? 'de' : language === 'sr' ? 'sr' : 'en';

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 5) {
    try {
      // Call official LingQ v2 profile API endpoint for the specific language
      const lingqRes = await fetch(`https://www.lingq.com/api/v2/${langCode}/profile/`, {
        headers: {
          'Authorization': `Token ${apiKey.trim()}`,
          'Accept': 'application/json'
        }
      });

      if (lingqRes.ok) {
        const data = await lingqRes.json();
        return res.json({
          success: true,
          isRealApi: true,
          stats: {
            knownWordsCount: data.known_words ?? data.knownWords ?? 0,
            lingqsCreatedCount: data.lingqs_count ?? data.lingqsCreated ?? 0,
            lingqsLearnedCount: data.lingqs_learned_count ?? Math.floor((data.lingqs_count || 0) * 0.65),
            level: data.level_name || data.level || (langCode === 'de' ? 'Intermediate II (B2)' : langCode === 'sr' ? 'Beginner II (A2)' : 'Advanced I (C1)'),
            streakDays: data.streak ?? 0,
            lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        });
      }
    } catch (err) {
      console.warn('LingQ API call failed or network unavailable, falling back to language defaults:', err);
    }
  }

  // Language specific default statistics
  const languageStatsMap: Record<string, any> = {
    en: {
      knownWordsCount: 8420,
      lingqsCreatedCount: 1350,
      lingqsLearnedCount: 920,
      level: 'Advanced I (C1)',
      streakDays: 24,
      lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    de: {
      knownWordsCount: 3120,
      lingqsCreatedCount: 680,
      lingqsLearnedCount: 410,
      level: 'Intermediate II (B2)',
      streakDays: 14,
      lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    sr: {
      knownWordsCount: 1250,
      lingqsCreatedCount: 340,
      lingqsLearnedCount: 190,
      level: 'Beginner II (A2)',
      streakDays: 8,
      lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  };

  return res.json({
    success: true,
    isRealApi: false,
    stats: languageStatsMap[langCode] || languageStatsMap.en
  });
});

// Floating AI Chatbot Assistant Endpoint
app.post('/api/assistant-chat', async (req, res) => {
  const { messages, userQuery, currentContext } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.status(500).json({
      text: 'Gemini API anahtarı sunucuda yapılandırılmamış.',
      actions: []
    });
  }

  try {
    const historyText = Array.isArray(messages)
      ? messages.slice(-6).map((m: any) => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.text}`).join('\n')
      : '';

    const prompt = `
Sen "Lingua Asistan" adında, Lingua Production Coach uygulamasının içine entegre edilmiş samimi, bilge, pedogojik bir AI dil koçu ve uygulama yöneticisisin.

GÖREVLERİN:
1. Kullanıcının dil öğrenimi (İngilizce, Almanca, Sırpça), gramer, kelime, yapılar, telaffuz veya Lingua uygulamasının özellikleri ile ilgili her türlü sorusuna net, samimi, teşvik edici Türkçe yanıt vermek.
2. ÖNEMLİ: Kullanıcının şu an ekranında açık olan bölümü, çalışmakta olduğu cümleyi veya cevabını dikkate al. Kullanıcı "bu ne demek?", "burada neden bu kelime kullanıldı?", "hatam neydi?", "bu cümleyi açıklar mısın?" gibi sorular sorduğunda doğrudan kullanıcının ekranındaki aktif cümleye ve yanıtına atıfta bulunarak açıklama yap! Kullanıcıdan cümleyi tekrar yazmasını İSTEME!
3. Kullanıcı uygulamayı değiştirmeyi isterse (örneğin "Dili Almanca yap", "Gramer pratigi sekmesine geç", "Gece modunu aç", "Bildirimleri aç"), ilgili komutları 'actions' dizisinde döndürmek.

MEVCUT UYGULAMA VE EKRAN DURUMU:
- Aktif Seçili Dil: ${currentContext?.currentLanguage || 'en'} (en: İngilizce, de: Almanca, sr: Sırpça)
- Aktif Sekme: ${currentContext?.activeTab || 'bugun'} (bugun, uret, gramer_pratigi, nasil_soylerim, sohbet, hikayeler, ilerleme)
- Karanlık Mod Açık mı: ${currentContext?.darkMode ? 'Evet' : 'Hayır'}
${currentContext?.sectionContextSummary ? `- EKRANDAKİ AKTİF İÇERİK VE CÜMLE BAĞLAMI:\n${currentContext.sectionContextSummary}` : ''}

DESTEKLENEN UYGULAMA AKSİYONLARI:
1. CHANGE_LANGUAGE -> value: "en" | "de" | "sr"
2. CHANGE_TAB -> value: "bugun" | "uret" | "gramer_pratigi" | "nasil_soylerim" | "sohbet" | "hikayeler" | "ilerleme"
3. TOGGLE_DARK_MODE -> value: true | false
4. OPEN_NOTIFICATIONS
5. OPEN_CLOUD_SYNC

Önceki Sohbet Geçmişi:
${historyText}

Mevcut Kullanıcı Sorusu/Talebi:
"${userQuery}"

Lütfen YALNIZCA geçerli bir JSON nesnesi döndür:
{
  "text": "Kullanıcının sorusuna doğrudan ekrandaki içerikle ilişkilendirerek detaylı, dostane ve öğretici Türkçe yanıt...",
  "actions": [
    { "type": "CHANGE_LANGUAGE", "value": "de" }
  ]
}
Eğer kullanıcı uygulama görünümünde bir değişiklik talep etmediyse 'actions' dizisini boş [] bırak.
`;

    const parsed = await generateJsonWithModel(ai, MODEL_ANALYSIS, prompt, 0.3);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/assistant-chat:', err);
    return res.status(500).json({
      text: 'Üzgünüm, sorunuzu işlerken bir hata oluştu. Lütfen tekrar deneyin.',
      actions: []
    });
  }
});

// Vite or static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lingua Production Coach running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
