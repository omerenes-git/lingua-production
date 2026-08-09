import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ErrorCategory, FossilizedError, LearningItem, TargetLanguage } from '../../types';
import { callLinguaApi } from '../../lib/linguaApi';
import { countUnresolvedErrorCategories } from '../../lib/errorCategory';
import { CefrLevel, DEFAULT_CEFR_LEVEL, estimateCefrLevel } from '../../lib/proficiency';
import {
  Brain,
  Flame,
  Loader2,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

// --- Seviye modu: her dil için A1-C2 müfredat konuları (mini ders içerikli) ---
interface LevelTopic {
  grammarTopic: string;
  cefrLevel: CefrLevel;
  grammarPattern: string;
  fossilizedErrorFocus: string;
  summaryTr: string;
  stepsTr: string[];
  exampleTarget: string;
  exampleTr: string;
  tipTr: string;
}

const LEVEL_TOPICS: Record<TargetLanguage, LevelTopic[]> = {
  en: [
    {
      grammarTopic: 'Simple present — be',
      cefrLevel: 'A1',
      grammarPattern: 'I am + noun / I live in + city',
      fossilizedErrorFocus: 'Am/is/are kullanımı ve geniş zaman.',
      summaryTr: 'Kendini tanıtırken "be" fiilinin özneye göre değiştiğini öğren.',
      stepsTr: [
        'Özne ile eşleşen "be" biçimini seç: I am, you are, he/she is, we/they are.',
        'Meslek/cinsiyet bilgisi için "am/is/are + isim" kalıbını kullan.',
        'Yaşadığın yeri "I live in + şehir" ile ekle.',
      ],
      exampleTarget: 'I am a physiotherapist and I live in Istanbul.',
      exampleTr: 'Ben bir fizyoterapistim ve İstanbul\'da yaşıyorum.',
      tipTr: 'Türkçede fiil gizlenebilir ("Ben doktorum"), ama İngilizcede "am" her zaman yazılır.',
    },
    {
      grammarTopic: 'Polite requests',
      cefrLevel: 'A2',
      grammarPattern: 'Could you please + verb + object?',
      fossilizedErrorFocus: 'Kibar isteklerde yardımcı fiil ve kelime sırası.',
      summaryTr: 'Kibar ricalarda "Could you please...?" kalıbı işini görür.',
      stepsTr: [
        '"Could you please" ile başla — kibar ve doğal bir istek.',
        'Ardından fiilin yalın hâli ve nesne gelir.',
        '"Can you" gündelik, "Could you" kibar; hasta/randevu bağlamında ikincisi daha güvenli.',
      ],
      exampleTarget: 'Could you please send me the new appointment time by email?',
      exampleTr: 'Lütfen bana yeni randevu saatini e-postayla gönderir misiniz?',
      tipTr: 'Türkçedeki "-ebilir misiniz" kibar kalıbının birebir karşılığı "Could you"dur.',
    },
    {
      grammarTopic: 'If clause + imperative',
      cefrLevel: 'B1',
      grammarPattern: 'If + present simple, imperative',
      fossilizedErrorFocus: 'Şart cümlesi ile emir cümlesinin doğru dizilimi.',
      summaryTr: '"Eğer... olursa, ... yap" kuralını "if + geniş zaman, emir" ile kur.',
      stepsTr: [
        'Şart cümlesinde "if"ten sonra geniş zaman kullan (present simple).',
        'Ana cümlede emir fiili yalın hâlde gelir.',
        'Sıra tersine dönebilir: "Stop the movement if the pain increases."',
      ],
      exampleTarget: 'If the pain increases during exercise, stop the movement.',
      exampleTr: 'Egzersiz sırasında ağrı artarsa hareketi durdurun.',
      tipTr: 'Türkçede "-sa/-se" eki yeterli; İngilizcede "if" + zaman yapısı gerekir.',
    },
    {
      grammarTopic: 'Modals of obligation',
      cefrLevel: 'B2',
      grammarPattern: 'must / have to + verb',
      fossilizedErrorFocus: 'must / have to / should arasındaki zorunluluk farkı.',
      summaryTr: '"must" güçlü zorunluluk, "have to" dış kural, "should" tavsiyedir.',
      stepsTr: [
        'Zorunluluk derecesine karar ver: must > have to > should.',
        'Modal fiilden sonra fiilin yalın hâli gelir (to eklenmez).',
        'Resmî/klinik bağlamda "must" ve "are required to" kullanılabilir.',
      ],
      exampleTarget: 'Patients must do regular exercises during the rehabilitation process.',
      exampleTr: 'Rehabilitasyon sürecinde hastalar düzenli egzersiz yapmalıdır.',
      tipTr: 'Olumsuzlukta dikkat: "must not" yasak, "don\'t have to" zorunluluk yok demektir.',
    },
    {
      grammarTopic: 'Third conditional',
      cefrLevel: 'C1',
      grammarPattern: 'If + past perfect, would have + past participle',
      fossilizedErrorFocus: '3. tip şart cümlesi ve gerçekleşmemiş geçmiş varsayımı.',
      summaryTr: 'Geçmişte olmamış bir şeyin sonucunu "if + past perfect, would have + V3" ile anlat.',
      stepsTr: [
        '"If" cümlesinde past perfect kullan: had + V3.',
        'Ana cümlede "would have + V3" ile varsayımsal sonucu ver.',
        'Devrik biçim de doğaldır: "Had we diagnosed it earlier, ..."',
      ],
      exampleTarget: 'If we had diagnosed it earlier, the treatment would have been more successful.',
      exampleTr: 'Daha erken teşhis koymuş olsaydık tedavi daha başarılı olurdu.',
      tipTr: 'Türkçede "-seydi... -irdi" ikilisi; İngilizcede "had... would have" gerekir.',
    },
    {
      grammarTopic: 'Inversion for emphasis',
      cefrLevel: 'C2',
      grammarPattern: 'Under no circumstances + auxiliary + subject + verb',
      fossilizedErrorFocus: 'Olumsuz anlamlı ifadelerle devrik cümle (inversion).',
      summaryTr: 'Olumsuz anlam taşıyan ifadeler cümle başına gelince devrik yapı kurulur.',
      stepsTr: [
        'Olumsuz ifadeyle başla: "Under no circumstances", "Never", "Not only".',
        'Ardından yardımcı fiil + özne + ana fiil sırası gelir.',
        'Sıralama hatası anlamı bozar; bu üst düzey bir yapıdır.',
      ],
      exampleTarget: 'Under no circumstances should patient data be shared with third parties.',
      exampleTr: 'Hiçbir durumda hasta verileri üçüncü kişilerle paylaşılmamalıdır.',
      tipTr: 'Bu yapı Türkçede yok; cümle başındaki olumsuzluğun İngilizcede soru sıralaması tetiklediğini hatırla.',
    },
  ],
  de: [
    {
      grammarTopic: 'Sipariş ve Akkusativ',
      cefrLevel: 'A1',
      grammarPattern: 'Ich möchte + Akkusativ',
      fossilizedErrorFocus: 'Eril isimlerde Akkusativ artikel kullanımı.',
      summaryTr: '"Ich möchte" ile istek bildirirken eril isimlerin article\'ı Akkusativ\'e döner.',
      stepsTr: [
        '"Ich möchte" (isterdim) ile kibarca başla.',
        'Eril isimlerde "der" → "den" olur: einen Kaffee.',
        'Dişil ve nötr isimler değişmez: eine Flasche Wasser.',
      ],
      exampleTarget: 'Ich möchte einen Kaffee und eine Flasche Wasser.',
      exampleTr: 'Bir kahve ve bir şişe su istiyorum.',
      tipTr: 'Türkçede "bir kahve" yeter; Almancada cinsiyete göre "einen/eine/ein" seçmelisin.',
    },
    {
      grammarTopic: 'Perfekt zamanı',
      cefrLevel: 'A2',
      grammarPattern: 'haben + Partizip II (sonda)',
      fossilizedErrorFocus: 'Perfekt kurulumu ve Partizip II\'nin cümle sonunda olması.',
      summaryTr: 'Geçmişte bitmiş olayları "haben + Partizip II (sonda)" ile anlat.',
      stepsTr: [
        'Özneye göre "haben"i çekimle: ich habe, du hast, er hat.',
        'Ana fiili Partizip II\'ye çevir: arbeiten → gearbeitet.',
        'Partizip II cümlenin SONUNA gelir; zaman zarfı önde olabilir.',
      ],
      exampleTarget: 'Gestern habe ich im Krankenhaus viel gearbeitet.',
      exampleTr: 'Dün hastanede çok çalıştım.',
      tipTr: 'Almanca Perfekt\'te fiil sonda kalır — Türkçedeki "çalıştım" tek kelime, Almancada üç parça.',
    },
    {
      grammarTopic: 'Wenn yan cümlesi',
      cefrLevel: 'B1',
      grammarPattern: 'Wenn + özne + ... + fiil, ana cümle',
      fossilizedErrorFocus: 'Yan cümlede çekimli fiilin sona gitmesi.',
      summaryTr: '"Wenn" (eğer/zaman) cümlesinde çekimli fiil en sona gider.',
      stepsTr: [
        '"Wenn" ile yan cümleyi başlat.',
        'Yan cümlede özne + ... + çekimli fiil (en sonda) sırasını koru.',
        'Ana cümle virgülden sonra normal sırayla gelir; V2 kuralı ana cümlede geçerlidir.',
      ],
      exampleTarget: 'Wenn ich Zeit habe, rufe ich dich an.',
      exampleTr: 'Zamanım olduğunda seni arayacağım.',
      tipTr: 'Türkçede fiil zaten sonda; Almancada bu kural yalnızca yan cümlelerde geçerli.',
    },
    {
      grammarTopic: 'Passiv (edilgen çatı)',
      cefrLevel: 'B2',
      grammarPattern: 'werden + Partizip II',
      fossilizedErrorFocus: 'werden + Partizip II ile edilgen çatı kurulumu.',
      summaryTr: 'Öznenin önemli olmadığı cümlelerde edilgen yapı "werden + Partizip II" ile kurulur.',
      stepsTr: [
        '"werden"i zamana göre çekimle (werden + Partizip II).',
        'Partizip II cümle sonunda kalır.',
        'Şimdiki zamanda "werden" + Partizip II = "ediliyor" anlamı verir.',
      ],
      exampleTarget: 'In dieser Klinik werden täglich Dutzende Patienten behandelt.',
      exampleTr: 'Bu klinikte her gün onlarca hasta tedavi ediliyor.',
      tipTr: 'Türkçedeki "-iliyor" eki; Almancada werden + Partizip II yapısı gerekir.',
    },
    {
      grammarTopic: 'Konjunktiv II (nezaket/koşul)',
      cefrLevel: 'C1',
      grammarPattern: 'würde + Infinitiv (sonda)',
      fossilizedErrorFocus: 'würde + Infinitiv yapısı ve cümle sonu fiil.',
      summaryTr: 'Nazik öneri ve koşullu durumlar için "würde + Infinitiv" kullan.',
      stepsTr: [
        '"würde"yi özneye göre çekimle: ich würde, du würdest.',
        'Ana fiil yalın hâlde (Infinitiv) cümlenin sonuna gelir.',
        'Koşul bağlamında "An deiner Stelle" (senin yerinde) kalıbıyla kullanılır.',
      ],
      exampleTarget: 'An deiner Stelle würde ich diese Behandlung nicht ausprobieren.',
      exampleTr: 'Senin yerinde olsam bu tedaviyi denemezdim.',
      tipTr: 'Türkçedeki "-seydim... -mezdim" koşulunun Almanca karşılığı würde + Infinitiv\'dir.',
    },
    {
      grammarTopic: 'Nominalisierung (isimleştirme)',
      cefrLevel: 'C2',
      grammarPattern: 'durch + Nominalisierung + reflexiv',
      fossilizedErrorFocus: 'Fiil yerine isimleştirme kullanımı (durch die Schulung).',
      summaryTr: 'Resmî Almancada fiil yerine isimleştirme ("durch + isim") yaygındır.',
      stepsTr: [
        'Fiili isme çevir: schulen → die Schulung.',
        '"durch + die + sıfat + isim" ile sebep-sonuç ilişkisi kur.',
        'Ana fiili özneye göre çekimle; dönüşlü fiiller (sich bessern) dikkat ister.',
      ],
      exampleTarget: 'Durch die regelmäßige Schulung besserte sich der Zustand des Patienten sichtbar.',
      exampleTr: 'Düzenli eğitim sayesinde hastanın durumu gözle görülür şekilde iyileşti.',
      tipTr: 'Bu üst düzey bir yazı dili özelliği; konuşmada fiil kullanmak daha doğaldır.',
    },
  ],
  sr: [
    {
      grammarTopic: 'Sipariş ve Akuzativ',
      cefrLevel: 'A1',
      grammarPattern: 'Molim vas + Akuzativ',
      fossilizedErrorFocus: 'Kafa ve voda isimlerinin nesne hâli.',
      summaryTr: 'Rica cümlelerinde nesne Akuzativ hâle girer: kafa → kafu, voda → vodu.',
      stepsTr: [
        '"Molim vas" (lütfen) ile kibarca başla.',
        'Dişil isimlerde -a sonu -u olur: jedna kafa → jednu kafu.',
        'Sıfat ve isim birlikte değişir: jednu kafu, jednu vodu.',
      ],
      exampleTarget: 'Molim vas, jednu kafu i jednu vodu.',
      exampleTr: 'Lütfen bir kahve ve bir su.',
      tipTr: 'Türkçede hâl eki "yI" gibidir; Sırpçada dişil isimlerde -u eki görülür.',
    },
    {
      grammarTopic: 'Perfekat (geçmiş zaman)',
      cefrLevel: 'A2',
      grammarPattern: 'jesam (je) + radni glagolski pridev',
      fossilizedErrorFocus: 'Perfekat kurulumu ve je yardımcı fiili.',
      summaryTr: 'Geçmiş olaylar "je + radni glagolski pridev" ile anlatılır.',
      stepsTr: [
        'Yardımcı fiili özneye göre seç: sam, si, je, smo, ste, su.',
        'Ana fiil "radni pridev" biçimine girer: padati → padala.',
        'Cinsiyet uyumu önemlidir: kiša (dişil) → padala kiša.',
      ],
      exampleTarget: 'Juče je ceo dan padala kiša.',
      exampleTr: 'Dün bütün gün yağmur yağdı.',
      tipTr: 'Sırpçada geçmiş zaman cinsiyete göre değişir; Türkçede böyle bir uyum yoktur.',
    },
    {
      grammarTopic: 'Gelecek zaman',
      cefrLevel: 'B1',
      grammarPattern: 'Futur I + povratna zamenica',
      fossilizedErrorFocus: 'Gelecek zaman ve se zamirinin konumu.',
      summaryTr: 'Gelecek zaman "ću/ćeš/će + fiil" ile kurulur; dönüşlü "se" doğru yerde durur.',
      stepsTr: [
        '"ću" (ben), "ćeš" (sen), "će" (o) yardımcılarıyla gelecek zaman kur.',
        'Ana fiil yalın hâlde gelir: sastati → sastaćemo se.',
        'Dönüşlü "se" zamiri yardımcıdan sonra yerleşir: sastaćemo SE sutra.',
      ],
      exampleTarget: 'Sastaćemo se sutra u tri sata.',
      exampleTr: 'Yarın saat üçte buluşacağız.',
      tipTr: 'Türkçede "-ecek" eki; Sırpçada ću/ćeş/će + fiil yapısı kullanılır.',
    },
    {
      grammarTopic: 'Kondicional (şart kipi)',
      cefrLevel: 'B2',
      grammarPattern: 'da + perfekat + bih + ...',
      fossilizedErrorFocus: 'Kondicional kurulumu ve bih kullanımı.',
      summaryTr: '"Senin yerinde olsam" gibi koşullar "da + bih + fiil" ile kurulur.',
      stepsTr: [
        'Koşul cümlesi "da sam..." (olsaydım) ile başlar.',
        'Ana cümlede "bih" (olurdum/ederdim) + fiil kullanılır.',
        'Olumsuzluk "ne bih" biçiminde öne gelir.',
      ],
      exampleTarget: 'Da sam na tvom mestu, ne bih toliko kasnio.',
      exampleTr: 'Senin yerinde olsam bu kadar geç kalmazdım.',
      tipTr: 'Türkçedeki "-seydim... -mezdim"; Sırpçada da + bih yapısı karşılık gelir.',
    },
    {
      grammarTopic: 'Pasiv (edilgen çatı)',
      cefrLevel: 'C1',
      grammarPattern: 'se + povratni pasiv',
      fossilizedErrorFocus: 'se ile edilgen yapı ve kelime sırası.',
      summaryTr: 'Sırpçada edilgen çatı genelde dönüşlü "se" ile kurulur.',
      stepsTr: [
        '"se" ile pasif anlam veren fiili kur: lečiti → leči se.',
        'Özne belirsizse "se" yapısı idealdir.',
        'Kelime sırası esnektir; "se" fiilin hemen önünde durur.',
      ],
      exampleTarget: 'U ovoj klinici se svakodnevno leči na desetine pacijenata.',
      exampleTr: 'Bu klinikte her gün onlarca hasta tedavi ediliyor.',
      tipTr: 'Sırpça pasif "se" kullanır; Türkçedeki "-iliyor" eki birebir karşılık değildir.',
    },
    {
      grammarTopic: 'Enklitike sıralaması',
      cefrLevel: 'C2',
      grammarPattern: 'özne + enklitikler (su, ti, to) + fiil',
      fossilizedErrorFocus: 'Enklitiklerin doğru sıralaması (su → ti → to).',
      summaryTr: 'Kısa yardımcı sözcükler (enklitikler) sabit sırayla dizilir: su → ti → to.',
      stepsTr: [
        'Enklitik sırasını hatırla: yardımcı (su) → datif (ti) → akuzatif (to).',
        'Enklitikler asla cümle başına gelmez; özneden sonra yerleşir.',
        'Ana fiil enklitiklerden sonra gelir: Oni su ti to rekli.',
      ],
      exampleTarget: 'Oni su ti to juče rekli.',
      exampleTr: 'Onlar sana bunu dün söylemişlerdi.',
      tipTr: 'Türkçede "sana bunu" serbest; Sırpçada su→ti→to sırası sabittir.',
    },
  ],
};

// --- Kişisel Gramer Koçu: kategori bazlı 2-3 dakikalık mini dersler ---
const CATEGORY_LESSONS: Record<ErrorCategory, { label: string; emoji: string; summary: string; steps: string[]; tip: string }> = {
  grammar: {
    label: 'Dilbilgisi & Ekler',
    emoji: '📘',
    summary: 'Hedef dilin çekim ekleri ve gramer kalıpları Türkçeden farklı işler.',
    steps: [
      'Cümleyi kurarken önce "hangi zaman/kip" olduğuna karar ver: geçmiş, şimdiki, gelecek...',
      'Fiili özneye göre çekimle: İngilizcede I go / he goes, Almancada ich habe / er hat, Sırpçada ja imam / on ima.',
      'Ekleri Türkçedeki karşılıklarıyla birebir eşleştirmeye çalışma; kalıbı bir bütün olarak ezberle.',
    ],
    tip: 'Yanlış yaptığın cümleyi yüksek sesle oku. Kulağa "garip" geliyorsa büyük ihtimalle ek veya kip hatasıdır.',
  },
  word_order: {
    label: 'Kelime Sırası',
    emoji: '🔀',
    summary: 'Türkçe özne-nesne-fiil (SOV) düzenini kullanır; İngilizce ve Almanca özne-fiil-nesne (SVO), Sırpça esnek ama SVO temellidir.',
    steps: [
      'Temel düzeni hatırla: Özne + Fiil + Nesne (örn. "I drink coffee", "Ich trinke Kaffee").',
      'Almancada ana cümlede çekimli fiil daima 2. sıradadır; yan cümlede (wenn, dass...) fiil sona gider.',
      'Soru cümlelerinde fiil öznenin önüne geçer: "Do you like...?" / "Hast du...?".',
    ],
    tip: 'Cümleni kurduktan sonra kelimeleri özne-fiil-nesne sırasıyla gözden geçir.',
  },
  vocabulary: {
    label: 'Kelime Seçimi',
    emoji: '🗣️',
    summary: 'Anlam olarak yakın ama bağlama uymayan kelimeler seçiliyor.',
    steps: [
      'Türkçeden kelime kelime çevirme; hedef dilde o bağlamda hangi kelimenin doğal olduğunu düşün.',
      'Aynı Türkçe kelimenin hedef dilde birden çok karşılığı olabilir (örn. "yapmak": make/do).',
      'Bilmediğin kelime yerine bildiğin güvenli bir eş anlamlıyla cümleyi tamamla.',
    ],
    tip: 'Kelime seçiminde takılırsan o bağlamdaki doğal karşılığı sözlükte değil, örnek cümlelerde ara.',
  },
  spelling: {
    label: 'Yazım',
    emoji: '✍️',
    summary: 'Hedef dilin yazım kuralları ve aksan işaretleri atlanıyor.',
    steps: [
      'Uzun ve aksanlı harflere dikkat et (Almanca ä/ö/ü/ß, Sırpça č/ć/š/ž).',
      'Kelimeyi telaffuzuna göre değil, yazımına göre yaz; İngilizcede telaffuz-yazım farkı büyüktür.',
      'Büyük harf kurallarını kontrol et (Almancada tüm isimler büyük yazılır).',
    ],
    tip: 'Şüpheli harf varsa önce yazımı kontrol et, sonra gönder.',
  },
  style: {
    label: 'Üslup & Doğallık',
    emoji: '🎭',
    summary: 'Cümle gramer olarak doğru ama hedef dilde kulağa yapay geliyor.',
    steps: [
      'Resmi/gündelik ayrımını gözet: "Could you..." kibar, "Can you..." gündelik, "Give me..." kaba olabilir.',
      'Kısaltmalar ve kalıpları doğal kullan (örn. yazılı dilde "gonna" yerine "going to").',
      'Hedef dilde sık kullanılan kalıp ifadeleri ezberle; çeviri değil, kalıp üret.',
    ],
    tip: 'Kendine sor: "Bu cümleyi hedef dilde bir anadili böyle söyler miydi?"',
  },
};

const LANGUAGE_GRAMMAR_NOTES: Record<TargetLanguage, Partial<Record<ErrorCategory, string>>> = {
  en: {
    grammar: 'İngilizcede -s takısı (3. tekil), -ing ve düzensiz fiiller en sık hata kaynağıdır.',
    word_order: 'İngilizce sorularda do/does yardımcı fiili öznenin önüne gelir.',
    vocabulary: 'make/do, say/tell, borrow/lend gibi ikililer bağlama göre değişir.',
    spelling: 'through/though/thought gibi kelimeler telaffuzdan farklı yazılır.',
    style: 'Kibar istekler genelde "Could you...?" ile başlar.',
  },
  de: {
    grammar: 'Almancada isimlerin cinsiyeti (der/die/das) ve Akkusativ/Dativ ekleri kritiktir.',
    word_order: 'Almancada yan cümlelerde (wenn/dass) fiil cümlenin sonuna gider.',
    vocabulary: 'Almancada birleşik isimler yaygındır (Handschuh = el + ayakkabı → eldiven).',
    spelling: 'ä, ö, ü ve ß harfleri atlanmamalı; tüm isimler büyük harfle başlar.',
    style: 'Sie (resmi) / du (samimi) ayrımı konuşmanın tonunu belirler.',
  },
  sr: {
    grammar: 'Sırpçada isimlerin 7 hâli vardır; en çok akuzativ (nesne hâli) karıştırılır.',
    word_order: 'Sırpça sıralama esnektir ama enklitikler (ga, se, mu) kurala göre yerleşir.',
    vocabulary: 'Vurgu ve uzunluk anlamı değiştirebilir (grad = şehir / dolu).',
    spelling: 'č/ć, š/ž, dž/dj farklı seslerdir; karıştırılmamalı.',
    style: 'molim hem "lütfen" hem "rica ederim"dir; bağlama göre kullanılır.',
  },
};

// --- Oyunlaştırılmış hata testi ---
interface QuizQuestion {
  id: string;
  fossilizedErrorId: string | null;
  errorCategory: string;
  turkishPrompt: string;
  options: string[];
  correctOptionIndex: number;
  explanationTr: string;
}

interface QuizResponse {
  quizTitle?: string;
  questions?: unknown[];
}

const validQuizQuestion = (value: unknown): value is QuizQuestion => {
  if (!value || typeof value !== 'object') return false;
  const question = value as Record<string, unknown>;
  return Boolean(
    typeof question.turkishPrompt === 'string' &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      typeof question.correctOptionIndex === 'number',
  );
};

const GRAMMAR_POINTS_KEY = 'lingua_grammar_points';
const GRAMMAR_STREAK_KEY = 'lingua_grammar_streak';
const GRAMMAR_LAST_QUIZ_DATE_KEY = 'lingua_grammar_last_quiz_date';

type GrammarCoachMode = 'errors' | 'level';

interface GramerPratigiTabProps {
  currentLanguage: TargetLanguage;
  fossilizedErrors: FossilizedError[];
  learningItems: LearningItem[];
  onMarkErrorResolved?: (errorId: string) => void;
}

export const GramerPratigiTab: React.FC<GramerPratigiTabProps> = ({
  currentLanguage,
  fossilizedErrors,
  learningItems,
  onMarkErrorResolved,
}) => {
  // --- Mod seçimi: "Hatalarımdan Öğren" (kişisel) veya "Seviyeme Göre Çalış" (müfredat) ---
  const [mode, setMode] = useState<GrammarCoachMode>('errors');

  // Kişiselleştirme: kullanıcının bu dildeki tahmini CEFR seviyesi (pratik
  // kanıtı varsa) default seçilir; kanıt yoksa güvenli başlangıç A1.
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(() => {
    const estimate = estimateCefrLevel(learningItems, currentLanguage);
    return estimate.level ?? DEFAULT_CEFR_LEVEL;
  });
  const [selectedTopic, setSelectedTopic] = useState<LevelTopic | null>(null);

  // Kişisel Gramer Koçu: hata profili + mini ders + oyunlaştırılmış test
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<ErrorCategory | null>(null);
  const [points, setPoints] = useState<number>(() => {
    try { return Number(localStorage.getItem(GRAMMAR_POINTS_KEY)) || 0; } catch { return 0; }
  });
  const [streak, setStreak] = useState<number>(() => {
    try { return Number(localStorage.getItem(GRAMMAR_STREAK_KEY)) || 0; } catch { return 0; }
  });
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizStatus, setQuizStatus] = useState<string | null>(null);

  // Hata profili: ÇÖZÜLMEMİŞ hataları kategorilere göre sayar (kişiselleştirmenin temeli).
  // Çözüldü işaretlenen hatalar sayılmaz → başarı sonrası konu önceliği doğal olarak azalır.
  const categoryCounts = useMemo(() => countUnresolvedErrorCategories(fossilizedErrors), [fossilizedErrors]);

  const topCategory = useMemo<ErrorCategory | null>(() => {
    let top: ErrorCategory | null = null;
    let topCount = 0;
    for (const [category, count] of Object.entries(categoryCounts)) {
      if (count > topCount) {
        top = category as ErrorCategory;
        topCount = count;
      }
    }
    return top;
  }, [categoryCounts]);

  const activeLessonCategory = selectedLessonCategory ?? topCategory ?? 'grammar';

  // Mini derste gösterilecek, kullanıcının GERÇEK hatasından örnek (çözülmemiş).
  const relatedError = useMemo(() => {
    if (!activeLessonCategory) return null;
    return (
      fossilizedErrors.find(
        (error) => !error.resolved && error.errorCategory === activeLessonCategory,
      ) ?? null
    );
  }, [fossilizedErrors, activeLessonCategory]);

  // Dile ait hatalar; çözülmüş olanlar quiz konusu olarak TEKRAR gönderilmez
  const languageErrors = fossilizedErrors.filter((error) => !error.language || error.language === currentLanguage);
  const unresolvedLanguageErrors = languageErrors.filter((error) => !error.resolved);

  // Seviye modu: o dildeki konular
  const levelTopics = LEVEL_TOPICS[currentLanguage];

  const activeTopic = selectedTopic ?? levelTopics.find((topic) => topic.cefrLevel === cefrLevel) ?? levelTopics[0] ?? null;

  const awardPoints = (earned: number) => {
    setPoints((previous) => {
      const next = previous + earned;
      try { localStorage.setItem(GRAMMAR_POINTS_KEY, String(next)); } catch { /* localStorage kullanılamıyor */ }
      return next;
    });
  };

  const updateStreak = () => {
    const today = new Date().toISOString().slice(0, 10);
    let lastDate: string | null = null;
    try { lastDate = localStorage.getItem(GRAMMAR_LAST_QUIZ_DATE_KEY); } catch { /* localStorage kullanılamıyor */ }
    setStreak((previous) => {
      let next = previous;
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        next = lastDate === yesterday ? previous + 1 : 1;
      }
      try {
        localStorage.setItem(GRAMMAR_STREAK_KEY, String(next));
        localStorage.setItem(GRAMMAR_LAST_QUIZ_DATE_KEY, today);
      } catch { /* localStorage kullanılamıyor */ }
      return next;
    });
  };

  const startQuiz = async () => {
    setIsQuizLoading(true);
    setQuizStatus(null);
    setQuizFinished(false);
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizQuestions([]);
    try {
      const basePayload: Record<string, unknown> = {
        language: currentLanguage,
        cefrLevel,
        errorTopics: [],
      };
      if (mode === 'errors') {
        // Kişisel mod: kullanıcının gerçek, çözülmemiş hatalarından test
        const errorTopics = unresolvedLanguageErrors
          .slice(0, 8)
          .map((error) => {
            const category = error.errorCategory ?? '';
            const description = (error.errorDescription || '').trim();
            return category ? `[${category}] ${description}` : description;
          })
          .filter(Boolean);
        basePayload.errorTopics = errorTopics;
        basePayload.focusCategory = topCategory ?? undefined;
      } else if (activeTopic) {
        // Seviye modu: seçili konuda müfredat kontrolü
        basePayload.topicFocus = {
          grammarTopic: activeTopic.grammarTopic,
          grammarPattern: activeTopic.grammarPattern,
        };
      }

      const payload = await callLinguaApi<QuizResponse>('/api/generate-error-quiz', basePayload);
      const questions = Array.isArray(payload.questions) ? payload.questions.filter(validQuizQuestion) : [];
      if (!questions.length) throw new Error('Sunucu geçerli test sorusu döndürmedi.');
      setQuizQuestions(questions);
      setQuizTitle(typeof payload.quizTitle === 'string' && payload.quizTitle.trim() ? payload.quizTitle : mode === 'level' ? `${cefrLevel} Seviye Testi` : 'Kişisel Hata Testi');
    } catch (error) {
      setQuizStatus(`Test oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Hata kaydın yoksa önce Üret bölümünde pratik yap.`);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const selectQuizOption = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    const question = quizQuestions[quizIndex];
    if (optionIndex === question.correctOptionIndex) {
      setQuizScore((previous) => previous + 1);
      awardPoints(10);
    }
  };

  const nextQuizQuestion = () => {
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
      updateStreak();
    } else {
      setQuizIndex((previous) => previous + 1);
      setSelectedOption(null);
    }
  };

  const markRelatedErrorResolved = () => {
    if (!onMarkErrorResolved) return;
    // Aktif ders kategorisiyle eşleşen ÇÖZÜLMEMİŞ bir hatayı işaretle; yoksa herhangi çözülmemiş hata.
    const target =
      fossilizedErrors.find(
        (error) => !error.resolved && error.errorCategory === activeLessonCategory,
      ) ?? fossilizedErrors.find((error) => !error.resolved);
    if (target) {
      onMarkErrorResolved(target.id);
      setQuizStatus('İlgili hata çözüldü olarak işaretlendi. Gramer Koçu artık o hatayı öncelikli göstermez.');
    }
  };

  const resetQuiz = () => {
    setQuizQuestions([]);
    setQuizFinished(false);
    setQuizStatus(null);
  };

  const selectLevel = (level: CefrLevel) => {
    setCefrLevel(level);
    setSelectedTopic(null);
    resetQuiz();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Mod seçici */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => { setMode('errors'); resetQuiz(); }}
          className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            mode === 'errors'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          🎯 Hatalarımdan Öğren
        </button>
        <button
          type="button"
          onClick={() => { setMode('level'); resetQuiz(); }}
          className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            mode === 'level'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          📚 Seviyeme Göre Çalış
        </button>
      </div>

      {mode === 'errors' ? (
        <section className="bg-white rounded-3xl border-2 border-violet-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="w-5 h-5 text-violet-600" />
            <h2 className="font-black text-slate-900">Gramer Koçu</h2>
            <span className="ml-auto flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-amber-600"><Trophy className="w-4 h-4" /> {points} Puan</span>
              <span className="flex items-center gap-1 text-orange-600"><Flame className="w-4 h-4" /> {streak} Gün Seri</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Üret bölümünde yaptığın hatalardan ders çıkarır: en zayıf olduğun alanı bulur, 2-3 dakikalık mini ders verir ve seni o konuda test eder.
          </p>

          {/* Hata profili */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">Hata Profilin</span>
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Henüz kayıtlı hatan yok. Üret bölümünde pratik yaptıkça burada en çok zorlandığın alanlar ve sana özel dersler görünecek.
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LESSONS) as ErrorCategory[]).map((category) => {
                  const count = categoryCounts[category] || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedLessonCategory(category)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        activeLessonCategory === category
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400'
                      }`}
                      title="Bu konudaki mini dersi aç"
                    >
                      {CATEGORY_LESSONS[category].emoji} {CATEGORY_LESSONS[category].label} ×{count}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2-3 dakikalık mini ders */}
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-violet-900">
                ⏱️ 2-3 Dakikalık Mini Ders: {CATEGORY_LESSONS[activeLessonCategory].emoji} {CATEGORY_LESSONS[activeLessonCategory].label}
              </span>
              {selectedLessonCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedLessonCategory(null)}
                  className="text-[10px] text-violet-500 hover:text-violet-700 font-bold underline cursor-pointer"
                >
                  En zayıf alanıma dön
                </button>
              )}
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">{CATEGORY_LESSONS[activeLessonCategory].summary}</p>
            {topCategory === activeLessonCategory && (
              <div className="text-[10px] font-bold text-violet-700 bg-violet-100/80 border border-violet-200 rounded-lg px-2.5 py-1.5 inline-block">
                🎯 Bu dersi görme nedenin: {CATEGORY_LESSONS[activeLessonCategory].label} en sık yaptığın hata kategorisi ({categoryCounts[activeLessonCategory]} çözülmemiş hata)
              </div>
            )}
            <ol className="space-y-1.5">
              {CATEGORY_LESSONS[activeLessonCategory].steps.map((step, index) => (
                <li key={index} className="text-xs text-slate-700 flex gap-2 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-violet-200 text-violet-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            {LANGUAGE_GRAMMAR_NOTES[currentLanguage][activeLessonCategory] && (
              <div className="p-2.5 rounded-xl bg-white/70 border border-violet-200/60 text-[11px] text-violet-900 leading-relaxed">
                <strong>{currentLanguage.toUpperCase()} için:</strong> {LANGUAGE_GRAMMAR_NOTES[currentLanguage][activeLessonCategory]}
              </div>
            )}
            {relatedError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 space-y-1.5">
                <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider">📝 Senin hatandan örnek</div>
                <div className="text-[11px] text-slate-700 leading-relaxed">
                  <strong>Senin cümlen:</strong> “{relatedError.userAnswer}”
                </div>
                <div className="text-[11px] text-emerald-800 leading-relaxed">
                  <strong>Doğrusu:</strong> “{relatedError.correctReference}”
                </div>
                {relatedError.errorDescription && (
                  <div className="text-[11px] text-slate-600 leading-relaxed">{relatedError.errorDescription}</div>
                )}
              </div>
            )}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
              💡 <strong>Pratik ipucu:</strong> {CATEGORY_LESSONS[activeLessonCategory].tip}
            </div>
          </div>

          {/* Oyunlaştırılmış hata testi */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-900">🎮 Kişisel Hata Testi</span>
              {!isQuizLoading && quizQuestions.length === 0 && !quizFinished && (
                <button
                  type="button"
                  onClick={() => void startQuiz()}
                  disabled={isQuizLoading}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  title={Object.keys(categoryCounts).length === 0 ? 'Henüz hata kaydın yok; genel seviyene uygun bir test üretilir' : 'Hatalarına göre test oluştur'}
                >
                  <Target className="w-4 h-4" /> Testi Başlat (+10 Puan/Doğru)
                </button>
              )}
            </div>
            {Object.keys(categoryCounts).length === 0 && quizQuestions.length === 0 && !quizFinished && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Henüz hata kaydın yok — test yine de üretilir, genel seviyeni ölçer. Üret bölümünde pratik yaptıkça test hatalarına göre kişiselleşir.
              </p>
            )}

            {quizStatus && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">{quizStatus}</div>
            )}

            {isQuizLoading && (
              <div className="flex items-center gap-2 text-xs text-violet-700 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Hatalarına göre test hazırlanıyor...
              </div>
            )}

            {!isQuizLoading && quizQuestions.length > 0 && !quizFinished && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{quizTitle}</span>
                  <span>Soru {quizIndex + 1}/{quizQuestions.length} · Doğru: {quizScore}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                    style={{ width: `${((quizIndex + (selectedOption !== null ? 1 : 0)) / quizQuestions.length) * 100}%` }}
                  />
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 leading-relaxed">
                  {quizQuestions[quizIndex].turkishPrompt}
                </div>
                <div className="space-y-2">
                  {quizQuestions[quizIndex].options.map((option, optionIndex) => {
                    const isCorrectOption = optionIndex === quizQuestions[quizIndex].correctOptionIndex;
                    let style = 'bg-white border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50';
                    if (selectedOption !== null) {
                      if (isCorrectOption) style = 'bg-emerald-50 border-emerald-400 text-emerald-900';
                      else if (selectedOption === optionIndex) style = 'bg-rose-50 border-rose-400 text-rose-900';
                      else style = 'bg-slate-50 border-slate-200 text-slate-400';
                    }
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={selectedOption !== null}
                        onClick={() => selectQuizOption(optionIndex)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${style} disabled:cursor-default`}
                      >
                        {String.fromCharCode(65 + optionIndex)}) {option}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    quizQuestions[quizIndex].correctOptionIndex === selectedOption
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}>
                    <strong>{quizQuestions[quizIndex].correctOptionIndex === selectedOption ? '✅ Doğru! +10 puan' : '❌ Yanlış'}</strong>
                    <p className="mt-1">{quizQuestions[quizIndex].explanationTr}</p>
                    <button
                      type="button"
                      onClick={nextQuizQuestion}
                      className="mt-2 w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer"
                    >
                      {quizIndex >= quizQuestions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isQuizLoading && quizFinished && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 text-center space-y-2">
                <div className="text-2xl">{quizScore === quizQuestions.length ? '🏆' : quizScore >= Math.ceil(quizQuestions.length / 2) ? '🎉' : '💪'}</div>
                <div className="font-black text-violet-900 text-sm">Test Tamamlandı: {quizScore}/{quizQuestions.length} doğru</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {quizScore === quizQuestions.length
                    ? 'Mükemmel! Bu konuda sağlamlaştın.'
                    : quizScore >= Math.ceil(quizQuestions.length / 2)
                      ? 'İyi gidiyorsun! Yanlış yaptığın soruların açıklamalarını mini derste tekrar oku.'
                      : 'Zorlandığın alan net: yukarıdaki mini dersi tekrar oku, sonra testi yeniden dene.'}
                </p>
                {mode === 'errors' && onMarkErrorResolved && unresolvedLanguageErrors.length > 0 && quizScore >= Math.ceil(quizQuestions.length / 2) && (
                  <button
                    type="button"
                    onClick={markRelatedErrorResolved}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black cursor-pointer"
                  >
                    ✅ İlgili hatayı çözüldü işaretle
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer"
                >
                  Yeni Test Oluştur
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-3xl border-2 border-violet-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="w-5 h-5 text-violet-600" />
            <h2 className="font-black text-slate-900">Gramer Koçu · Seviyeme Göre Çalış</h2>
            <span className="ml-auto flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-amber-600"><Trophy className="w-4 h-4" /> {points} Puan</span>
              <span className="flex items-center gap-1 text-orange-600"><Flame className="w-4 h-4" /> {streak} Gün Seri</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Seviyeni seç, o seviyede bir gramer konusunu 60 saniyede öğren ve mini testle pekiştir. Cümle yazmana gerek yok — öğren ve test ol.
          </p>

          {/* CEFR seviye seçici */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">Seviye Seç</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[]).map((level) => {
                const levelColors: Record<string, string> = {
                  A1: 'from-rose-500 to-rose-600 border-rose-500',
                  A2: 'from-orange-500 to-orange-600 border-orange-500',
                  B1: 'from-amber-500 to-yellow-600 border-amber-500',
                  B2: 'from-emerald-500 to-green-600 border-emerald-500',
                  C1: 'from-sky-500 to-blue-600 border-sky-500',
                  C2: 'from-violet-500 to-fuchsia-600 border-violet-500',
                };
                const active = cefrLevel === level;
                return (
                  <motion.button
                    key={level}
                    type="button"
                    onClick={() => selectLevel(level)}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.06 }}
                    className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all cursor-pointer shadow-xs ${
                      active
                        ? `bg-gradient-to-br text-white ${levelColors[level]} shadow-md`
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {level}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Önerilen: {DEFAULT_CEFR_LEVEL} · Uygulama verilerine göre tahminin: {estimateCefrLevel(learningItems, currentLanguage).level ?? '—'}
            </p>
          </div>

          {/* Konu listesi */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">{cefrLevel} Konuları</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {levelTopics
                .filter((topic) => topic.cefrLevel === cefrLevel)
                .map((topic) => {
                  const active = activeTopic?.grammarTopic === topic.grammarTopic;
                  return (
                    <motion.button
                      key={topic.grammarTopic}
                      type="button"
                      onClick={() => { setSelectedTopic(topic); resetQuiz(); }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-fuchsia-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {topic.grammarTopic}
                    </motion.button>
                  );
                })}
            </div>
          </div>

          {/* Seçili konunun mini dersi */}
          {activeTopic && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-sky-50/50 p-4 space-y-3"
            >
              <span className="text-xs font-black text-violet-900">
                ⏱️ Mini Ders: {activeTopic.cefrLevel} · {activeTopic.grammarTopic}
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{activeTopic.summaryTr}</p>
              <ol className="space-y-1.5">
                {activeTopic.stepsTr.map((step, index) => (
                  <li key={index} className="text-xs text-slate-700 flex gap-2 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-violet-200 text-violet-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="p-2.5 rounded-xl bg-white/70 border border-violet-200/60 text-[11px] text-violet-900 leading-relaxed">
                <strong>Kalıp:</strong> {activeTopic.grammarPattern}
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[11px] text-emerald-900 leading-relaxed">
                <strong>Örnek:</strong> “{activeTopic.exampleTarget}”<br />
                <span className="text-emerald-700">{activeTopic.exampleTr}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                💡 <strong>Pratik ipucu:</strong> {activeTopic.tipTr}
              </div>
            </motion.div>
          )}

          {/* Seviye modu testi */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-900">🎮 {cefrLevel} Seviye Testi</span>
              {!isQuizLoading && quizQuestions.length === 0 && !quizFinished && (
                <button
                  type="button"
                  onClick={() => void startQuiz()}
                  disabled={isQuizLoading || !activeTopic}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white text-xs font-black shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  title={activeTopic ? `"${activeTopic.grammarTopic}" konusunda test oluştur` : 'Önce bir konu seç'}
                >
                  <Sparkles className="w-4 h-4" /> Bu Konuda Testi Başlat (+10 Puan/Doğru)
                </button>
              )}
            </div>

            {quizStatus && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">{quizStatus}</div>
            )}

            {isQuizLoading && (
              <div className="flex items-center gap-2 text-xs text-violet-700 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> {cefrLevel} seviye testi hazırlanıyor...
              </div>
            )}

            {!isQuizLoading && quizQuestions.length > 0 && !quizFinished && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{quizTitle}</span>
                  <span>Soru {quizIndex + 1}/{quizQuestions.length} · Doğru: {quizScore}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
                    style={{ width: `${((quizIndex + (selectedOption !== null ? 1 : 0)) / quizQuestions.length) * 100}%` }}
                  />
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 leading-relaxed">
                  {quizQuestions[quizIndex].turkishPrompt}
                </div>
                <div className="space-y-2">
                  {quizQuestions[quizIndex].options.map((option, optionIndex) => {
                    const isCorrectOption = optionIndex === quizQuestions[quizIndex].correctOptionIndex;
                    let style = 'bg-white border-slate-200 text-slate-700 hover:border-fuchsia-400 hover:bg-fuchsia-50';
                    if (selectedOption !== null) {
                      if (isCorrectOption) style = 'bg-emerald-50 border-emerald-400 text-emerald-900';
                      else if (selectedOption === optionIndex) style = 'bg-rose-50 border-rose-400 text-rose-900';
                      else style = 'bg-slate-50 border-slate-200 text-slate-400';
                    }
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={selectedOption !== null}
                        onClick={() => selectQuizOption(optionIndex)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${style} disabled:cursor-default`}
                      >
                        {String.fromCharCode(65 + optionIndex)}) {option}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    quizQuestions[quizIndex].correctOptionIndex === selectedOption
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}>
                    <strong>{quizQuestions[quizIndex].correctOptionIndex === selectedOption ? '✅ Doğru! +10 puan' : '❌ Yanlış'}</strong>
                    <p className="mt-1">{quizQuestions[quizIndex].explanationTr}</p>
                    <button
                      type="button"
                      onClick={nextQuizQuestion}
                      className="mt-2 w-full py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-black cursor-pointer"
                    >
                      {quizIndex >= quizQuestions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isQuizLoading && quizFinished && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-violet-50 border border-fuchsia-200 text-center space-y-2">
                <div className="text-2xl">{quizScore === quizQuestions.length ? '🏆' : quizScore >= Math.ceil(quizQuestions.length / 2) ? '🎉' : '💪'}</div>
                <div className="font-black text-fuchsia-900 text-sm">Test Tamamlandı: {quizScore}/{quizQuestions.length} doğru</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {quizScore === quizQuestions.length
                    ? 'Mükemmel! Bu konuyu öğrendin. Sıradaki seviyeye geçebilirsin.'
                    : quizScore >= Math.ceil(quizQuestions.length / 2)
                      ? 'İyi gidiyorsun! Yanlış yaptığın soruların açıklamalarını oku, sonra tekrar dene.'
                      : 'Bu konu biraz zor geldi: mini dersi tekrar oku, sonra testi yeniden dene.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-black cursor-pointer"
                  >
                    Aynı Konuda Yeni Test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextLevel = (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[])[
                        Math.min(5, (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[]).indexOf(cefrLevel) + 1)
                      ];
                      selectLevel(nextLevel);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black cursor-pointer"
                  >
                    Sonraki Seviye ({(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[])[Math.min(5, (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrLevel[]).indexOf(cefrLevel) + 1)]})
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
