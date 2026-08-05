import { AdaptiveStory, LearningItem, Persona, ProductionPrompt } from '../types';

export const INITIAL_PROMPTS: ProductionPrompt[] = [
  // EVERYDAY LIFE & TRAVEL - ENGLISH (Gündelik Yaşam & Seyahat)
  {
    id: 'p_en_everyday_1',
    language: 'en',
    domain: 'general',
    intensityLevel: 'beginner',
    turkishSentence: 'Affedersiniz, en yakın metro istasyonuna nasıl gidebilirim?',
    targetReference: 'Excuse me, how can I get to the nearest subway station?',
    targetVariants: [
      'Excuse me, could you tell me how to get to the closest subway station?',
      'Pardon me, which way is the nearest metro station?'
    ],
    keyTerms: ['excuse me', 'how can I get to', 'nearest subway station'],
    grammarPattern: 'How can I get to + location (Asking for directions)',
    hintLadder: {
      partOfSpeech: 'Yön Sorma Cümlesi (Direction Request)',
      firstLetters: 'E... m..., h... c... I... g...',
      partialWords: 'Exc... me, how can I get to the nea...',
      patternHint: 'Question: "Excuse me, how can I get to [destination]?"',
      keyWordsGiven: 'excuse me / how can I get to / nearest subway station',
      fullAnswer: 'Excuse me, how can I get to the nearest subway station?'
    }
  },
  {
    id: 'p_en_everyday_2',
    language: 'en',
    domain: 'travel',
    intensityLevel: 'intermediate',
    turkishSentence: 'Kahvemi bitte bitkisel sütle ve şekersiz alabilir miyim lütfen?',
    targetReference: 'Could I please have my coffee with plant-based milk and no sugar?',
    targetVariants: [
      'May I get a coffee with oat milk and sugar-free, please?',
      'Could I have my coffee with non-dairy milk and without sugar, please?'
    ],
    keyTerms: ['could I please have', 'plant-based milk', 'no sugar'],
    grammarPattern: 'Could I please have + item + specifications',
    hintLadder: {
      partOfSpeech: 'Nezaket Sipariş Cümlesi (Polite Request)',
      firstLetters: 'C... I... p... h... m...',
      partialWords: 'Could I pl... have my cof...',
      patternHint: 'Request: "Could I please have [item] with [milk type]?"',
      keyWordsGiven: 'could I please have / plant-based milk / no sugar',
      fullAnswer: 'Could I please have my coffee with plant-based milk and no sugar?'
    }
  },
  {
    id: 'p_en_social_1',
    language: 'en',
    domain: 'social',
    intensityLevel: 'intermediate',
    turkishSentence: 'Hafta sonu arkadaşlarımla şehre yakın bir göl kenarında kamp yapmayı planlıyoruz.',
    targetReference: 'We are planning to go camping by a lake near the city with friends this weekend.',
    targetVariants: [
      'This weekend, my friends and I plan to camp by a lake close to town.',
      'We plan on camping near the city lake with some friends over the weekend.'
    ],
    keyTerms: ['planning to go camping', 'lake near the city', 'this weekend'],
    grammarPattern: 'We are planning to + verb (Future Intentions)',
    hintLadder: {
      partOfSpeech: 'Plan Bildirme Cümlesi (Present Continuous for Future Plan)',
      firstLetters: 'W... a... p... t... g...',
      partialWords: 'We are plan... to go cam...',
      patternHint: 'Subject + be planning to + verb + location + time',
      keyWordsGiven: 'planning to go camping / lake near the city / this weekend',
      fullAnswer: 'We are planning to go camping by a lake near the city with friends this weekend.'
    }
  },

  // GERMAN - EVERYDAY LIFE & TRAVEL
  {
    id: 'p_de_everyday_1',
    language: 'de',
    domain: 'general',
    intensityLevel: 'beginner',
    turkishSentence: 'Affedersiniz, yakınlarda iyi bir kafe nerede bulabilirim?',
    targetReference: 'Entschuldigung, wo kann ich hier in der Nähe ein gutes Café finden?',
    targetVariants: [
      'Entschuldigen Sie, gibt es hier in der Nähe ein gutes Café?',
      'Verzeihung, wo ist das nächste gemütliche Café?'
    ],
    keyTerms: ['Entschuldigung', 'wo kann ich', 'Café in der Nähe'],
    grammarPattern: 'Soru Cümlesi: W-Frage + Modalverb (kann) + Subjekt (ich) + Objekt + Verb am Ende (finden)',
    hintLadder: {
      partOfSpeech: 'Nezaket Soru Cümlesi (Fragesatz)',
      firstLetters: 'E..., w... k... i... h...',
      partialWords: 'Entsch... wo kann ich hier in der Näh...',
      patternHint: 'Soru sözcüğü (Wo) + Modal fiil (kann) + Özne (ich) + Nesne + Esas fiil sonda (finden)',
      keyWordsGiven: 'Entschuldigung / wo kann ich / Café in der Nähe / finden',
      fullAnswer: 'Entschuldigung, wo kann ich hier in der Nähe ein gutes Café finden?'
    }
  },
  {
    id: 'p_de_everyday_2',
    language: 'de',
    domain: 'travel',
    intensityLevel: 'beginner',
    turkishSentence: 'Lütfen bir kahve ve bir şişe su alabilir miyim?',
    targetReference: 'Ich möchte bitte einen Kaffee und ein Wasser.',
    targetVariants: [
      'Kann ich bitte einen Kaffee und ein Wasser haben?',
      'Für mich bitte einen Kaffee und ein Wasser.'
    ],
    keyTerms: ['Ich möchte bitte', 'einen Kaffee (Akkusativ)', 'ein Wasser'],
    grammarPattern: 'Nezaket Sipariş Kalıbı: Ich möchte bitte + Akkusativ-Objekt',
    hintLadder: {
      partOfSpeech: 'Yalın Sipariş Cümlesi (Nezaket Üslubu)',
      firstLetters: 'I... m... b... e... K...',
      partialWords: 'Ich möc... bit... einen Kaf...',
      patternHint: 'İstek kalıbı: "Ich möchte bitte [Akkusativ nesne]"',
      keyWordsGiven: 'Ich möchte bitte / einen Kaffee / ein Wasser',
      fullAnswer: 'Ich möchte bitte einen Kaffee und ein Wasser.'
    }
  },

  // SERBIAN - EVERYDAY LIFE & FAMILY
  {
    id: 'p_sr_everyday_1',
    language: 'sr',
    domain: 'social',
    intensityLevel: 'beginner',
    turkishSentence: 'Yarın öğleden sonra şehir merkezinde kahve içmek için buluşabilir miyiz?',
    targetReference: 'Možemo li se naći sutra popodne na kafi u centru grada?',
    targetVariants: [
      'Da li možemo da se nađemo sutra popodne na kafi u centru?',
      'Hoćemo li sutra popodne popiti kafu u centru grada?'
    ],
    keyTerms: ['možemo li se naći', 'sutra popodne', 'u centru grada'],
    grammarPattern: 'Soru Yapısı: Modalni glagol (Možemo) + li + se + infinitiv (naći)',
    hintLadder: {
      partOfSpeech: 'Yalın Buluşma Teklif Cümlesi',
      firstLetters: 'M... l... s... n...',
      partialWords: 'Možemo li se naći sut...',
      patternHint: 'Modal fiil + li + se + mastar fiil + zaman/yer',
      keyWordsGiven: 'možemo li se naći / sutra popodne / na kafi',
      fullAnswer: 'Možemo li se naći sutra popodne na kafi u centru grada?'
    }
  },
  {
    id: 'p_sr_everyday_2',
    language: 'sr',
    domain: 'general',
    intensityLevel: 'beginner',
    turkishSentence: 'Lütfen bir kahve ve bir su alabilir miyim?',
    targetReference: 'Molim vas, jednu kafu i jednu vodu.',
    targetVariants: [
      'Mogu li dobiti jednu kafu i vodu, molim vas?',
      'Za mene jednu kafu i vodu.'
    ],
    keyTerms: ['molim vas', 'jednu kafu (Akuzativ)', 'jednu vodu'],
    grammarPattern: 'Gündelik Sipariş Kalıbı: Molim vas + Akuzativ nesneler (-u)',
    hintLadder: {
      partOfSpeech: 'Yalın Gündelik Sipariş Cümlesi',
      firstLetters: 'M... v..., j... k...',
      partialWords: 'Molim vas, jed... kafu...',
      patternHint: 'Nezaket + Nesne (Akuzativ -u eki): "Molim vas, jednu kafu..."',
      keyWordsGiven: 'molim vas / jednu kafu / jednu vodu',
      fullAnswer: 'Molim vas, jednu kafu i jednu vodu.'
    }
  },

  // CLINICAL - ENGLISH
  {
    id: 'p_en_clin_1',
    language: 'en',
    domain: 'clinical',
    intensityLevel: 'intermediate',
    turkishSentence: 'Egzersiz sırasında omuz ağrınız artarsa hareketi derhal durdurun ve bana bildirin.',
    targetReference: 'If your shoulder pain increases during exercise, stop the movement immediately and let me know.',
    targetVariants: [
      'If you experience increased shoulder pain while exercising, stop right away and inform me.',
      'Should your shoulder pain worsen during the exercise, cease the movement immediately and notify me.'
    ],
    keyTerms: ['shoulder pain', 'increases', 'stop the movement', 'immediately'],
    grammarPattern: 'If + Present Simple (condition), Imperative (stop, let me know)',
    hintLadder: {
      partOfSpeech: 'Şart cümlesi (If clause) + Emir kipi',
      firstLetters: 'I... y... s... p... i...',
      partialWords: 'If your sh... pa... inc...',
      patternHint: 'Condition: "If [noun] [verb]", Main clause: "stop [noun], let me know"',
      keyWordsGiven: 'shoulder pain / increases / stop movement / immediately',
      fullAnswer: 'If your shoulder pain increases during exercise, stop the movement immediately and let me know.'
    }
  },
  {
    id: 'p_en_clin_2',
    language: 'en',
    domain: 'clinical',
    intensityLevel: 'advanced',
    turkishSentence: 'Bel rehabilitasyonunda temel amacımız omurga stabilitesini artırmak ve kas spazmlarını azaltmaktır.',
    targetReference: 'Our primary goal in lumbar rehabilitation is to increase spinal stability and reduce muscle spasms.',
    targetVariants: [
      'In lower back rehab, our main objective is enhancing spinal stability and decreasing muscle spasms.',
      'Our main goal during lumbar rehabilitation is increasing spinal stability and relieving muscle spasms.'
    ],
    keyTerms: ['lumbar rehabilitation', 'primary goal', 'spinal stability', 'muscle spasms'],
    grammarPattern: 'Our goal is to + verb / verb-ing',
    hintLadder: {
      partOfSpeech: 'İsim cümlesi + Mastar (Infinitive)',
      firstLetters: 'O... p... g... i... l...',
      partialWords: 'Our prim... goal in lum...',
      patternHint: 'Subject: "Our primary goal", Verb: "is to increase... and reduce..."',
      keyWordsGiven: 'lumbar rehab / primary goal / spinal stability / muscle spasms',
      fullAnswer: 'Our primary goal in lumbar rehabilitation is to increase spinal stability and reduce muscle spasms.'
    }
  },

  // GERMAN - CLINICAL
  {
    id: 'p_de_clin_1',
    language: 'de',
    domain: 'clinical',
    intensityLevel: 'intermediate',
    turkishSentence: 'Lütfen sırtüstü yatın ve dizlerinizi hafifçe bükün.',
    targetReference: 'Bitte legen Sie sich auf den Rücken und beugen Sie die Knie leicht.',
    targetVariants: [
      'Legen Sie sich bitte in Rückenlage und beugen Sie Ihre Knie leicht an.',
      'Bitte legen Sie sich flach auf den Rücken und winkeln Sie die Knie leicht an.'
    ],
    keyTerms: ['auf den Rücken legen', 'die Knie beugen', 'leicht'],
    grammarPattern: 'Imperativ Form (Sie-Form): Legen Sie sich... / Beugen Sie...',
    hintLadder: {
      partOfSpeech: 'Resmî Emir Kipi (Sie-Form)',
      firstLetters: 'B... l... S... s...',
      partialWords: 'Bitte leg... Sie sich auf den Rü...',
      patternHint: 'Reflexivverb: "sich auf den Rücken legen", Imperativ mit Sie',
      keyWordsGiven: 'auf den Rücken / beugen / Knie / leicht',
      fullAnswer: 'Bitte legen Sie sich auf den Rücken und beugen Sie die Knie leicht.'
    }
  },

  // SERBIAN - FAMILY & SOCIAL
  {
    id: 'p_sr_fam_1',
    language: 'sr',
    domain: 'family',
    intensityLevel: 'beginner',
    turkishSentence: 'Akşam yemeğinden sonra kahve içip ailece sohbet edeceğiz.',
    targetReference: 'Posle večere ćemo popiti kafu i razgovarati kao porodica.',
    targetVariants: [
      'Nakon večere popićemo kafu i pričati sa porodicom.',
      'Posle večere popijemo kafu i razgovaramo svi zajedno.'
    ],
    keyTerms: ['posle večere', 'popiti kafu', 'razgovarati', 'porodica'],
    grammarPattern: 'Futur I (ćemo + infinitiv)',
    hintLadder: {
      partOfSpeech: 'Gelecek Zaman (Futur I)',
      firstLetters: 'P... v... ć... p...',
      partialWords: 'Posle več... ćemo pop...',
      patternHint: 'Vremenska odredba + ćemo + glagol',
      keyWordsGiven: 'posle večere / popiti kafu / razgovarati',
      fullAnswer: 'Posle večere ćemo popiti kafu i razgovarati kao porodica.'
    }
  },

  // IELTS - ENGLISH
  {
    id: 'p_en_ielts_1',
    language: 'en',
    domain: 'ielts',
    intensityLevel: 'advanced',
    turkishSentence: 'Gelişmekte olan ülkelerdeki hızlı şehirleşme, altyapı üzerinde ciddi baskı oluşturmaktadır.',
    targetReference: 'Rapid urbanization in developing countries puts severe pressure on infrastructure.',
    targetVariants: [
      'The swift urbanization seen in developing nations exerts immense pressure on existing infrastructure.',
      'Rapid urban growth in developing countries places significant strain on public infrastructure.'
    ],
    keyTerms: ['rapid urbanization', 'developing countries', 'puts severe pressure on', 'infrastructure'],
    grammarPattern: 'Subject (Rapid urbanization in...) + Verb (puts/places) + Object + Preposition (on)',
    hintLadder: {
      partOfSpeech: 'Akademik Bildirim Cümlesi (Task 2 Writing Style)',
      firstLetters: 'R... u... i... d... c...',
      partialWords: 'Rap... urban... in dev... coun...',
      patternHint: 'Phrasal collocation: "put pressure / strain ON something"',
      keyWordsGiven: 'rapid urbanization / developing countries / severe pressure / infrastructure',
      fullAnswer: 'Rapid urbanization in developing countries puts severe pressure on infrastructure.'
    }
  }
];

/** @deprecated Prototype showcase rows; never use as user progress. */
export const LEGACY_DEMO_ITEMS: LearningItem[] = [
  {
    id: 'item_1',
    language: 'en',
    domain: 'general',
    turkishText: 'en yakın metro istasyonu',
    targetText: 'nearest subway station',
    keyTermOrPattern: 'nearest subway station',
    masteryState: 'independently_producible',
    isActiveVocabulary: true,
    contextCount: 2,
    nextReviewDate: new Date().toISOString(),
    stability: 4.5,
    difficulty: 3.5,
    fossilizedCount: 0
  },
  {
    id: 'item_2',
    language: 'en',
    domain: 'clinical',
    turkishText: 'omurga stabilitesi',
    targetText: 'spinal stability',
    keyTermOrPattern: 'spinal stability',
    masteryState: 'independently_producible',
    isActiveVocabulary: true,
    contextCount: 2,
    nextReviewDate: new Date().toISOString(),
    stability: 4.5,
    difficulty: 5.0,
    fossilizedCount: 0
  },
  {
    id: 'item_3',
    language: 'en',
    domain: 'clinical',
    turkishText: 'hareketi derhal durdurun',
    targetText: 'stop the movement immediately',
    keyTermOrPattern: 'stop the movement immediately',
    masteryState: 'hint_producible',
    isActiveVocabulary: true,
    contextCount: 1,
    nextReviewDate: new Date().toISOString(),
    stability: 2.1,
    difficulty: 6.2,
    fossilizedCount: 1
  },
  {
    id: 'item_4',
    language: 'de',
    domain: 'general',
    turkishText: 'yakınlarda bir kafe',
    targetText: 'Café in der Nähe',
    keyTermOrPattern: 'Café in der Nähe',
    masteryState: 'recognized_in_context',
    isActiveVocabulary: false,
    contextCount: 1,
    nextReviewDate: new Date().toISOString(),
    stability: 1.2,
    difficulty: 4.0,
    fossilizedCount: 0
  },
  {
    id: 'item_5',
    language: 'sr',
    domain: 'social',
    turkishText: 'şehir merkezinde buluşmak',
    targetText: 'naći se u centru grada',
    keyTermOrPattern: 'naći se u centru grada',
    masteryState: 'independently_producible',
    isActiveVocabulary: true,
    contextCount: 3,
    nextReviewDate: new Date().toISOString(),
    stability: 8.0,
    difficulty: 3.5,
    fossilizedCount: 0
  }
];

/** A new account starts with no fabricated learning evidence. */
export const INITIAL_ITEMS: LearningItem[] = [];

export const INITIAL_PERSONAS: Persona[] = [
  {
    id: 'alex_everyday',
    name: 'Alex & Sophia (Gündelik Yaşam)',
    roleTr: 'Gündelik Sohbet & Seyahat Partneri',
    languages: ['en', 'de', 'sr'],
    descriptionTr: 'Kahve sohbetleri, seyahat, hobiler, restoranlar ve arkadaş ortamlarında doğal konuşma pratikleri.',
    greetingTr: 'Selam! Bugün gündelik hayattan veya son gezilerinden konuşmak ister misin?',
    greetingTarget: {
      en: 'Hey there! How has your week been going so far? Want to chat about hobbies or weekend plans?',
      de: 'Hallo! Wie war deine Woche bis jetzt? Wollen wir über Hobbys oder Pläne sprechen?',
      sr: 'Zdravo! Kako si danas? Hoćemo li popiti kafu i pričati o vikendu?'
    }
  },
  {
    id: 'dr_sarah',
    name: 'Dr. Sarah Jenkins',
    roleTr: 'Klinik Fizyoterapist & Uzman Meslektaş',
    languages: ['en', 'de'],
    descriptionTr: 'Hasta vakaları, tedavi protokolleri, manuel terapi ve mesleki iletişim konularında uzman meslektaşınız.',
    greetingTr: 'Merhaba! Bugün klinikte hangi vakayı veya rehabilitasyon protokolünü tartışmak istersin?',
    greetingTarget: {
      en: 'Hello! Ready to discuss patient progress or review a clinical rehabilitation case today?',
      de: 'Guten Tag! Sind Sie bereit, die heutigen Rehabilitationsfälle und Behandlungsprotokolle zu besprechen?',
      sr: 'Zdravo! Da li ste spremni da razgovaramo o pacijentima?'
    }
  },
  {
    id: 'alex_examiner',
    name: 'Alex Vance',
    roleTr: 'IELTS Speaking Mülakatçısı',
    languages: ['en'],
    descriptionTr: 'IELTS Band 8+ hedefi için resmi ve akademik anlatım pratikleri yaptırır, üslup ve kelime çeşitliliği doğrulaması sunar.',
    greetingTr: 'Welcome to this IELTS Speaking simulation. Let us begin Part 2 with a topic card.',
    greetingTarget: {
      en: 'Welcome to this practice IELTS Speaking interview. Shall we start with Part 2 regarding healthcare & technology?',
      de: 'Willkommen zur Prüfungssimulation.',
      sr: 'Dobrodošli na pripremni čas.'
    }
  }
];

export const INITIAL_STORIES: AdaptiveStory[] = [
  // ENGLISH STORIES
  {
    id: 'story_gen_1',
    titleTarget: 'A Coffee Break in the Heart of the City',
    titleTr: 'Şehrin Kalbinde Bir Kahve Molası',
    language: 'en',
    domain: 'general',
    level: 'B1 Everyday Life',
    summaryTr: 'Gündelik seyahat, sipariş verme ve şehir içi sosyal diyalog pratikleri.',
    sentences: [
      {
        targetText: 'I met my friend at a cozy coffee shop near the central subway station.',
        turkishText: 'Arkadaşımla merkez metro istasyonunun yakınındaki şirin bir kafede buluştum.',
        vocabulary: [
          { term: 'cozy coffee shop', meaningTr: 'şirin/sıcak kafe', isKey: true },
          { term: 'subway station', meaningTr: 'metro istasyonu', isKey: true }
        ]
      },
      {
        targetText: 'We ordered oat milk lattes and discussed our upcoming weekend hiking trip.',
        turkishText: 'Yulaf sütlü latte sipariş ettik ve yaklaşan hafta sonu doğa yürüyüşü gezimiz hakkında konuştuk.',
        vocabulary: [
          { term: 'oat milk', meaningTr: 'yulaf sütü', isKey: true },
          { term: 'upcoming hiking trip', meaningTr: 'yaklaşan doğa yürüyüşü gezisi', isKey: true }
        ]
      }
    ]
  },
  {
    id: 'story_clin_1',
    titleTarget: 'A Busy Morning at the Rehabilitation Clinic',
    titleTr: 'Rehabilitasyon Kliniğinde Yoğun Bir Sabah',
    language: 'en',
    domain: 'clinical',
    level: 'B2 Clinical',
    summaryTr: 'Bir fizyoterapistin hastanın omuz mobilizasyonu ve egzersiz eğitimi sırasındaki aktif iletişimi.',
    sentences: [
      {
        targetText: 'The patient presented with limited range of motion in the right shoulder joint.',
        turkishText: 'Hasta, sağ omuz ekleminde kısıtlı eklem hareket açıklığı ile başvurdu.',
        vocabulary: [
          { term: 'range of motion', meaningTr: 'eklem hareket açıklığı', isKey: true },
          { term: 'presented with', meaningTr: 'şikayetiyle başvurdu', isKey: false }
        ]
      },
      {
        targetText: 'Before starting manual therapy, I measured his abduction angle carefully.',
        turkishText: 'Manuel terapiye başlamadan önce, abduksiyon açısını dikkatlice ölçtüm.',
        vocabulary: [
          { term: 'abduction angle', meaningTr: 'abduksiyon açısı', isKey: true },
          { term: 'manual therapy', meaningTr: 'manuel terapi', isKey: true }
        ]
      }
    ]
  },

  // GERMAN STORIES
  {
    id: 'story_de_gen_1',
    titleTarget: 'Ein gemütlicher Nachmittag im Café in Berlin',
    titleTr: 'Berlin’de Kafede Keyifli Bir Öğleden Sonra',
    language: 'de',
    domain: 'general',
    level: 'B1 Gündelik Yaşam',
    summaryTr: 'Almanca sipariş verme, V2 fiil kuralı ve günlük sohbet diyalogları.',
    sentences: [
      {
        targetText: 'Ich habe mich mit meiner Freundin in einem gemütlichen Café nahe dem Hauptbahnhof getroffen.',
        turkishText: 'Arkadaşımla tren garının yakınındaki şirin bir kafede buluştum.',
        vocabulary: [
          { term: 'gemütlichen Café', meaningTr: 'şirin kafe (Dativ)', isKey: true },
          { term: 'nahe dem Hauptbahnhof', meaningTr: 'ana tren garı yakınında', isKey: true }
        ]
      },
      {
        targetText: 'Wir haben einen Cappuccino mit Hafermilch bestellt und über unsere Pläne für das Wochenende gesprochen.',
        turkishText: 'Yulaf sütlü cappucino sipariş ettik ve hafta sonu planlarımız hakkında konuştuk.',
        vocabulary: [
          { term: 'einen Cappuccino', meaningTr: 'bir cappucino (Akkusativ)', isKey: true },
          { term: 'Hafermilch', meaningTr: 'yulaf sütü', isKey: true },
          { term: 'über unsere Pläne', meaningTr: 'planlarımız hakkında', isKey: true }
        ]
      }
    ]
  },
  {
    id: 'story_de_clin_1',
    titleTarget: 'Ein geschäftiger Morgen in der Rehabilitationsklinik',
    titleTr: 'Rehabilitasyon Kliniğinde Yoğun Bir Sabah',
    language: 'de',
    domain: 'clinical',
    level: 'B2 Klinik Fizyoterapi',
    summaryTr: 'Almanya’da fizyoterapi muayenesi, hareket kısıtlılığı değerlendirmesi ve hasta bilgilendirmesi.',
    sentences: [
      {
        targetText: 'Der Patient stellte sich mit einer deutlichen Bewegungseinschränkung der rechten Schulter vor.',
        turkishText: 'Hasta sağ omuzunda belirgin bir hareket kısıtlılığı şikayetiyle başvurdu.',
        vocabulary: [
          { term: 'Bewegungseinschränkung', meaningTr: 'hareket kısıtlılığı', isKey: true },
          { term: 'stellte sich vor', meaningTr: 'başvurdu / kendini tanıttı', isKey: true }
        ]
      },
      {
        targetText: 'Vor Beginn der manuellen Therapie habe ich den Abduktionswinkel der Schulter sorgfältig gemessen.',
        turkishText: 'Manuel terapiye başlamadan önce omuzun abduksiyon açısını dikkatlice ölçtüm.',
        vocabulary: [
          { term: 'manuelle Therapie', meaningTr: 'manuel terapi', isKey: true },
          { term: 'Abduktionswinkel', meaningTr: 'abduksiyon açısı', isKey: true }
        ]
      }
    ]
  },

  // SERBIAN STORIES
  {
    id: 'story_sr_gen_1',
    titleTarget: 'Popodnevna kafa u centru Beograda',
    titleTr: 'Belgrad Merkezinde Öğleden Sonra Kahvesi',
    language: 'sr',
    domain: 'general',
    level: 'A2-B1 Gündelik Yaşam',
    summaryTr: 'Sırpça kafede buluşma, akuzativ sipariş kalıpları ve günlük iletişim.',
    sentences: [
      {
        targetText: 'Sreo sam se sa prijateljem u lepom kafiću blizu Knez Mihailove ulice.',
        turkishText: 'Arkadaşımla Knez Mihailova caddesi yakınlarındaki güzel bir kafede buluştum.',
        vocabulary: [
          { term: 'Sreo sam se', meaningTr: 'Buluştum (geçmiş zaman kuralı)', isKey: true },
          { term: 'lepom kafiću', meaningTr: 'güzel kafede (Lokativ)', isKey: true }
        ]
      },
      {
        targetText: 'Naručili smo jednu kafu sa mlekom i svež sok od pomorandže.',
        turkishText: 'Sütlü bir kahve ve taze portakal suyu sipariş ettik.',
        vocabulary: [
          { term: 'jednu kafu', meaningTr: 'bir kahve (Akuzativ -u takısı)', isKey: true },
          { term: 'svež sok', meaningTr: 'taze meyve suyu', isKey: true }
        ]
      }
    ]
  },
  {
    id: 'story_sr_clin_1',
    titleTarget: 'Uspešan pregled u rehabilitacionom centru',
    titleTr: 'Rehabilitasyon Merkezinde Başarılı Muayene',
    language: 'sr',
    domain: 'clinical',
    level: 'B1-B2 Klinik Fizyoterapi',
    summaryTr: 'Sırpça klinik ortamlarda hasta takibi, eklem hareket açıklığı ve manuel terapi.',
    sentences: [
      {
        targetText: 'Pacijent je došao na pregled sa ograničenim pokretom u desnom ramenu.',
        turkishText: 'Hasta sağ omuzda kısıtlı hareket şikayetiyle muayeneye geldi.',
        vocabulary: [
          { term: 'ograničenim pokretom', meaningTr: 'kısıtlı hareket ile (Instrumental)', isKey: true },
          { term: 'desnom ramenu', meaningTr: 'sağ omuzda', isKey: true }
        ]
      },
      {
        targetText: 'Pre početka manuelne terapije, pažljivo sam izmerio ugao abdukcije ramena.',
        turkishText: 'Manuel terapiye başlamadan önce omuzun abduksiyon açısını dikkatlice ölçtüm.',
        vocabulary: [
          { term: 'manuelne terapije', meaningTr: 'manuel terapi (Genitiv)', isKey: true },
          { term: 'ugao abdukcije', meaningTr: 'abduksiyon açısı', isKey: true }
        ]
      }
    ]
  }
];
