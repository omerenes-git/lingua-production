#!/usr/bin/env node
/**
 * AI değerlendirme regresyon testi — /api/evaluate şema + pedagojik doğruluk.
 * Canlı Edge Function'a gerçek istek atar (retry mekanizması dahil).
 *
 * Kullanım:
 *   node scripts/ai-evaluate-regression.mjs [--repeat=N] [--output=test-results/ai-evaluate.json]
 *
 * Ortam: repo kökündeki .env'den E2E_TEST_DE_EMAIL/PASSWORD + SUPABASE_URL okur.
 * Çıkış: her senaryo için geçti/kaldı + özet; 0 = hepsi geçti, 1 = en az biri kaldı.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return {};
  const result = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    result[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return result;
}

const env = loadEnv();
const SUPABASE_URL = process.env.E2E_SUPABASE_URL || env.E2E_SUPABASE_URL || 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const PUBLISHABLE_KEY = process.env.E2E_PUBLISHABLE_KEY || env.E2E_PUBLISHABLE_KEY || 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const EMAIL = process.env.E2E_TEST_DE_EMAIL || env.E2E_TEST_DE_EMAIL;
const PASSWORD = process.env.E2E_TEST_DE_PASSWORD || env.E2E_TEST_DE_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('E2E_TEST_DE_EMAIL/PASSWORD .env içinde tanımlı değil.');
  process.exit(2);
}

// --- Yardımcılar ---
async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login başarısız: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function evaluate(token, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/lingua-web-api`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: '/api/evaluate', payload }),
  });
  if (!res.ok) throw new Error(`Edge ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function checkSchema(r) {
  const valid = new Set(['correct', 'natural_variant', 'minor_issue', 'major_issue', 'incorrect']);
  const sevs = new Set(['none', 'style_only', 'minor', 'moderate', 'critical']);
  const cats = new Set(['grammar', 'vocabulary', 'word_order', 'style', 'spelling']);
  if (!valid.has(r.overallVerdict)) return `geçersiz overallVerdict: ${r.overallVerdict}`;
  if (!sevs.has(r.errorSeverity)) return `geçersiz errorSeverity: ${r.errorSeverity}`;
  if (!['easy', 'good', 'hard', 'again'].includes(r.suggestedRating)) return `geçersiz suggestedRating: ${r.suggestedRating}`;
  if (typeof r.explanationTr !== 'string' || !r.explanationTr) return 'explanationTr eksik/boş';
  if (!Array.isArray(r.errors)) return 'errors dizi değil';
  for (const e of r.errors) {
    if (!cats.has(e.category)) return `geçersiz error category: ${e.category}`;
  }
  if (!Array.isArray(r.naturalAlternatives)) return 'naturalAlternatives dizi değil';
  return null;
}

// --- Senaryolar ---
// Her senaryo: { ad, payload, beklenen: (r) => bool }
const SOURCE_DE = 'Ben yarın arkadaşlarımla sinemaya gidiyorum.';
const REF_DE = 'Ich gehe morgen mit meinen Freunden ins Kino.';
const SOURCE_SR = 'Ben yarın arkadaşlarımla sinemaya gidiyorum.';
const REF_SR = 'Sutra idem u bioskop sa svojim prijateljima.';

const scenarios = [
  {
    ad: 'tamamen Türkçe cevap reddedilir (KRİTİK)',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'Ben yarın sinemaya gidiyorum.', targetReference: REF_DE },
    beklenen: (r) => r.overallVerdict === 'incorrect' && r.errorSeverity === 'critical' && r.suggestedRating === 'again' && r.errors.some((e) => e.category === 'vocabulary'),
  },
  {
    ad: 'birebir doğru cevap kabul',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: REF_DE, targetReference: REF_DE },
    beklenen: (r) => ['correct', 'natural_variant'].includes(r.overallVerdict) && !['incorrect', 'major_issue'].includes(r.overallVerdict),
  },
  {
    ad: 'doğal kelime sırası varyantı kabul',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'Morgen gehe ich mit meinen Freunden ins Kino.', targetReference: REF_DE },
    beklenen: (r) => ['correct', 'natural_variant'].includes(r.overallVerdict),
  },
  {
    ad: 'ins/in das farkı kabul (nüans)',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'Ich gehe morgen mit meinen Freunden in das Kino.', targetReference: REF_DE },
    beklenen: (r) => ['correct', 'natural_variant', 'minor_issue'].includes(r.overallVerdict),
  },
  {
    ad: 'karma dil (Almanca+Türkçe) kritik sayılır',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'Ich gehe sinemaya yarın.', targetReference: REF_DE },
    beklenen: (r) => ['incorrect', 'major_issue'].includes(r.overallVerdict) && ['critical', 'moderate'].includes(r.errorSeverity) && r.errors.some((e) => e.category === 'vocabulary'),
  },
  {
    ad: 'Dativ artikel hatası minor_issue (gramer)',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'Ich gehe morgen mit mein Freunden ins Kino.', targetReference: REF_DE },
    beklenen: (r) => ['minor_issue', 'major_issue'].includes(r.overallVerdict) && r.errors.some((e) => e.category === 'grammar'),
  },
  {
    ad: 'Sırpça doğru cevap kabul',
    payload: { language: 'sr', sourceSentence: SOURCE_SR, userAnswer: REF_SR, targetReference: REF_SR },
    beklenen: (r) => ['correct', 'natural_variant'].includes(r.overallVerdict),
  },
  {
    ad: 'Sırpça doğal varyant (mojim/svojim) kabul',
    payload: { language: 'sr', sourceSentence: SOURCE_SR, userAnswer: 'Sutra idem u bioskop sa mojim prijateljima.', targetReference: REF_SR },
    beklenen: (r) => ['correct', 'natural_variant', 'minor_issue'].includes(r.overallVerdict),
  },
  {
    ad: 'Sırpça zamir atlanması doğal varyant olarak kabul edilebilir',
    payload: { language: 'sr', sourceSentence: SOURCE_SR, userAnswer: 'Sutra idem u bioskop sa prijateljima.', targetReference: REF_SR },
    beklenen: (r) => ['correct', 'natural_variant', 'minor_issue'].includes(r.overallVerdict),
  },
  {
    ad: 'ilgisiz İngilizce cevap reddedilir',
    payload: { language: 'de', sourceSentence: SOURCE_DE, userAnswer: 'The weather is nice today.', targetReference: REF_DE },
    beklenen: (r) => r.overallVerdict === 'incorrect' && r.errors.some((e) => e.category === 'vocabulary'),
  },
];

// --- Çalıştır ---
const repeat = Number(process.argv.find((a) => a.startsWith('--repeat='))?.split('=')[1] || 1);
const outputFile = process.argv.find((a) => a.startsWith('--output='))?.split('=')[1] || 'test-results/ai-evaluate.json';

let token;
try {
  token = await login();
} catch (e) {
  console.error('Login hatası:', e.message);
  process.exit(2);
}

const results = [];
let passed = 0;
let failed = 0;

for (let rep = 1; rep <= repeat; rep++) {
  for (const sc of scenarios) {
    try {
      const r = await evaluate(token, sc.payload);
      const schemaIssue = checkSchema(r);
      const ok = !schemaIssue && sc.beklenen(r);
      if (ok) passed++;
      else failed++;
      results.push({
        ad: sc.ad,
        tekrar: rep,
        gecti: ok,
        schemaIssue,
        yanit: r,
        hata: null,
      });
      console.log(`${ok ? '✅' : '❌'} [${rep}/${repeat}] ${sc.ad}${schemaIssue ? ` — ŞEMA: ${schemaIssue}` : ''}`);
      if (!ok && !schemaIssue) {
        console.log(`   verdict=${r.overallVerdict} sev=${r.errorSeverity} rating=${r.suggestedRating} errs=${JSON.stringify(r.errors.map((e) => e.category))}`);
      }
    } catch (e) {
      failed++;
      results.push({ ad: sc.ad, tekrar: rep, gecti: false, schemaIssue: null, yanit: null, hata: e.message });
      console.log(`❌ [${rep}/${repeat}] ${sc.ad} — HATA: ${e.message}`);
    }
  }
}

fs.mkdirSync(path.dirname(path.join(repoRoot, outputFile)), { recursive: true });
fs.writeFileSync(path.join(repoRoot, outputFile), JSON.stringify({ zaman: new Date().toISOString(), toplam: results.length, gecti: passed, kaldi: failed, sonuclar: results }, null, 2));
console.log(`\nÖZET: ${passed} geçti, ${failed} kaldı (${results.length} toplam)`);
process.exit(failed > 0 ? 1 : 0);
