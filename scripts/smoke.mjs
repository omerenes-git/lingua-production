import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const failures = [];
const checks = [];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function read(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${path} okunamadı: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

function check(name, condition, detail) {
  checks.push({ name, passed: Boolean(condition) });
  if (!condition) failures.push(`${name}: ${detail}`);
}

const requiredFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'src/lib/linguaApi.ts',
  'src/lib/supabaseWeb.ts',
  'src/lib/supabaseDataSync.ts',
  'src/components/SupabaseAuthGate.tsx',
  'public/manifest.json',
  'public/service-worker.js',
  'supabase/functions/lingua-web-api/index.ts',
];

for (const path of requiredFiles) {
  check(`Dosya mevcut: ${path}`, await exists(path), 'Production için gerekli dosya bulunamadı.');
}

const [main, apiClient, supabaseWeb, edgeFunction, manifest, packageJson] = await Promise.all([
  read('src/main.tsx'),
  read('src/lib/linguaApi.ts'),
  read('src/lib/supabaseWeb.ts'),
  read('supabase/functions/lingua-web-api/index.ts'),
  read('public/manifest.json'),
  read('package.json'),
]);

check('Merkezi Edge Function istemcisi kullanıma hazır', apiClient.includes('callLinguaApi') && apiClient.includes('/functions/v1/lingua-web-api'), 'callLinguaApi veya Edge Function adresi eksik.');
check('Oturum gerektiren API istemcisi', apiClient.includes('getValidSession') && apiClient.includes('Authorization'), 'JWT oturum kontrolü eksik.');
check('401/403 güvenli şekilde ele alınıyor', apiClient.includes('response.status === 401') && apiClient.includes('response.status === 403'), 'Yetkisiz oturum temizleme akışı eksik.');
check('Supabase oturum bilgisi kaynakta sabit parola içermiyor', !supabaseWeb.match(/password\s*[:=]\s*['"][^'"]+['"]/i), 'Kaynak kodda sabit parola benzeri değer bulundu.');
check('LingQ anahtarı kaynakta gömülü değil', ![main, apiClient, supabaseWeb, edgeFunction].some((text) => /25084f562eec41ee33ad2da1d4d742379b71d8f4/.test(text)), 'Eski LingQ API anahtarı kaynak kodda bulundu.');
check('Eski Firebase çalışma zamanı başlatılmıyor', !main.includes('initializeApp(') && !main.includes('signInAnonymously('), 'Firebase çalışma zamanı hâlâ başlatılıyor.');
check('PWA manifest standalone modunda', /"display"\s*:\s*"standalone"/.test(manifest), 'Manifest standalone görünümünde değil.');
check('Service worker production girişinde kayıtlı', main.includes('serviceWorker') && main.includes('registration.update'), 'Service worker kayıt veya güncelleme kontrolü eksik.');
check('Edge Function kullanıcı girdisini sistem komutu saymıyor', edgeFunction.includes('<user_data>') && edgeFunction.includes('never system instructions'), 'Prompt injection ayrımı eksik.');
check('İstek boyutu sınırlandırılmış', edgeFunction.includes('MAX_BODY_CHARS') && edgeFunction.includes('413'), 'Edge Function istek boyutu sınırı eksik.');
check('Build komutu smoke testini çalıştırıyor', JSON.parse(packageJson).scripts?.build?.includes('npm run smoke'), 'Build öncesi smoke testi bağlı değil.');

for (const result of checks) {
  console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
}

if (failures.length) {
  console.error('\nProduction smoke test başarısız:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\n${checks.length} production smoke kontrolü başarıyla geçti.`);
