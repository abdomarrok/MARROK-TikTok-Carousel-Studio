import type { SavedPostRecord } from '../../types.ts';

/**
 * Bundled repository seed posts for the Saved & Posted Vault.
 * Kept inside `src/lib/storage/` so Vite/Rolldown and Vercel Serverless builds
 * always resolve it even when runtime `data/saved-posts.json` is not present in git.
 */
export const BUNDLED_SAVED_POSTS: SavedPostRecord[] = [
  {
    id: 'post_787318fd-8c1',
    title: 'Is Your Voice Still Yours?',
    category: 'CYBERSECURITY & DIGITAL IDENTITY',
    postStatus: 'validated',
    createdAt: '2026-10-28T11:41:01.716Z',
    updatedAt: '2026-10-28T12:42:32.741Z',
    postedAt: '2026-10-28T11:41:01.716Z',
    creatorHandle: 'Tech Podcaster',
    slideCount: 8,
    qaPassed: true,
    deck: {
      theme: 'violet',
      category: 'CYBERSECURITY & DIGITAL IDENTITY',
      caption:
        '⚡ هل صوتك ملكك فعلاً؟ استكشاف مخاطر استنساخ الصوت بالذكاء الاصطناعي.\n\nتتطور تقنيات استنساخ الصوت بسرعة تفوق الأطر القانونية الحالية. من استنساخ اللهجات الإقليمية إلى انتحال الشخصية الرقمية، إليك كيف تحمي هويتك الصوتية.\n\n🔹 كيف يتم استنساخ الصوت؟\n🔹 التحديات القانونية (Right of Publicity).\n🔹 خطوات عملية عند اكتشاف انتحال صوتك.\n🔹 غياب المرجع التقني الموثوق للتحقق.\n\nهل تعتقد أن القوانين الحالية كافية لحماية هويتنا الرقمية؟ شارك برأيك 👇\n\n🎥 المصدر: تجربة بودكاست تقني حول استنساخ الصوت.\n\n#CyberSecurity #AI #DigitalIdentity #TechEthics #Privacy #VoiceCloning #TechInArabic',
      slides: [
        {
          type: 'hub',
          centerIcon: 'clickhouse',
          centerTag: 'elevenlabs',
          stepNumber: '01',
          enTitle: 'Is Your Voice Still Yours?',
          arTitle: 'هل صوتك ملكك فعلاً؟',
          enBody:
            'AI voice cloning is evolving faster than legal frameworks. Here is the reality of digital identity theft.',
          arBody:
            'تتطور تقنيات استنساخ الصوت بسرعة تفوق الأطر القانونية. إليك واقع سرقة الهوية الرقمية.',
          satLabels: [
            'Accent Markers',
            'Similarity Test',
            'Publicity Rights',
            'Identity Theft',
            'Legal Precedent',
            'Digital Signature',
          ],
        },
        {
          type: 'number',
          stepNumber: '01',
          enTitle: 'The Reality of Voice Cloning.',
          arTitle: 'واقع استنساخ الصوت',
          enBody:
            'AI tools like Eleven Labs can now capture unique regional accents and speech quirks with unsettling precision.',
          arBody:
            'أدوات الذكاء الاصطناعي قادرة الآن على محاكاة اللهجات الإقليمية وسمات الكلام بدقة مقلقة.',
        },
        {
          type: 'row',
          stepNumber: '02',
          enTitle: 'The Identity Fingerprint.',
          arTitle: 'بصمة الهوية الصوتية',
          enBody:
            "Your voice is a unique biometric fingerprint. AI cloning creates a 'masquerade' that undermines personal credibility.",
          arBody:
            "صوتك هو بصمة بيومترية فريدة. استنساخ الذكاء الاصطناعي يخلق 'تنكراً' يضعف المصداقية الشخصية.",
          icons: [
            {
              icon: 'fingerprint',
              label: 'Biometric',
            },
            {
              icon: 'shield-alert',
              label: 'Trust Gap',
            },
            {
              icon: 'user-x',
              label: 'Impersonation',
            },
          ],
          diagramVariant: 'isolation',
        },
        {
          type: 'compare',
          stepNumber: '03',
          compareLeftTitle: 'Platform Metric',
          compareRightTitle: 'Human Perception',
          enTitle: 'The Similarity Threshold.',
          arTitle: 'عتبة التشابه التقني',
          enBody:
            'Platforms use ENCAPA-TDNN tests to measure voice similarity, but these metrics often fail to detect regional nuance.',
          arBody:
            'تستخدم المنصات اختبارات ENCAPA-TDNN لقياس التشابه، لكنها غالباً تفشل في رصد الفروق الدقيقة للهجات.',
        },
        {
          type: 'row',
          stepNumber: '04',
          enTitle: 'Legal Protection Gaps.',
          arTitle: 'فجوات الحماية القانونية',
          enBody:
            "No federal law explicitly protects voices. We rely on state-level 'Right of Publicity' laws to fight misappropriation.",
          arBody:
            "لا يوجد قانون فيدرالي يحمي الأصوات صراحة. نعتمد على قوانين 'حق الدعاية' على مستوى الولايات لمكافحة الانتحال.",
          icons: [
            {
              icon: 'gavel',
              label: 'Publicity Law',
            },
            {
              icon: 'file-text',
              label: 'Evidence',
            },
            {
              icon: 'scale',
              label: 'Precedent',
            },
          ],
          diagramVariant: 'takeaway',
        },
        {
          type: 'number',
          stepNumber: '05',
          enTitle: 'Steps to Protect Yourself.',
          arTitle: 'خطوات لحماية هويتك',
          enBody:
            '1. Collect evidence (links/screenshots). 2. Request platform similarity tests. 3. Consult IP legal counsel.',
          arBody:
            '1. اجمع الأدلة (روابط/لقطات). 2. اطلب اختبارات التشابه. 3. استشر محامياً متخصصاً في الملكية الفكرية.',
        },
        {
          type: 'row',
          enTitle: 'The Hard Truth.',
          arTitle: 'الحقيقة المرة',
          enBody:
            'There is currently no impartial referee for voice identity online. You are often left with only support emails.',
          arBody:
            'لا يوجد حالياً حكم محايد للهوية الصوتية عبر الإنترنت. غالباً ما تترك وحيداً مع رسائل دعم العملاء.',
          icons: [
            {
              icon: 'mail',
              label: 'Support Only',
            },
            {
              icon: 'alert-triangle',
              label: 'No Referee',
            },
            {
              icon: 'lock-keyhole',
              label: 'Vulnerable',
            },
          ],
          diagramVariant: 'takeaway',
        },
        {
          type: 'cta',
          enTitle: 'Stay Vigilant.',
          arTitle: 'ابقَ يقظاً',
          enBody:
            'AI will only get better. Document evidence, ask questions, and support stronger digital identity laws.',
          arBody:
            'الذكاء الاصطناعي في تطور مستمر. وثق الأدلة، اسأل، وادعم القوانين التي تحمي هويتك الرقمية.',
          ctaText: 'Join discussion • شارك برأيك',
          url: 'marrok.org',
        },
      ],
      id: 'post_787318fd-8c1',
      brand: 'MARROK',
      brandUrl: 'marrok.org',
      firstComment:
        'هل تعرضت يوماً لموقف مشابه أو لاحظت أصواتاً مزيفة عبر الإنترنت؟ شاركنا تجربتك في التعليقات. للمزيد من التحليلات التقنية: marrok.org',
      shortCaption:
        'هل صوتك ملكك فعلاً؟ اكتشف مخاطر استنساخ الصوت بالذكاء الاصطناعي وكيف تحمي هويتك الرقمية. 🎙️🛡️',
      screenHook: 'هل صوتك ملكك فعلاً؟',
      scheduleSlot: '18:00 DZ',
      sourceMeta: {
        title: 'When AI Steals Your Voice',
        creator: 'Tech Podcaster',
        url: 'https://example.com',
        published: '2024',
        groundingQueries: [
          'ENCAPA-TDNN voice similarity test',
          'Right of Publicity laws voice cloning',
          'Eleven Labs voice cloning legal issues',
        ],
        groundingSources: [
          {
            title: 'Right of Publicity and AI Voice Cloning',
            url: 'https://example.com',
          },
        ],
        isSearchGrounded: false,
        isFallback: false,
        engine: 'ungrounded',
        model: 'gemini-3.1-flash-lite',
        status: 'unverified_draft',
        userReviewed: true,
      },
      facts: [
        {
          text: 'AI voice cloning can replicate unique regional accents and speech quirks with high realism.',
          type: 'claim',
          verified: 'unconfirmed',
          evidence: 'Podcaster experience with Eleven Labs voice cloning.',
        },
        {
          text: 'ENCAPA-TDNN tests are used by platforms to measure voice similarity, often with a 0.7 threshold.',
          type: 'claim',
          verified: 'unconfirmed',
          evidence: 'Platform response to voice similarity claims.',
        },
        {
          text: "State-level 'Right of Publicity' laws are the primary legal tool for voice misappropriation claims.",
          type: 'claim',
          verified: 'unconfirmed',
          evidence: 'Copyright lawyer consultation.',
        },
      ],
      notesForHuman: [
        'The source mentions a specific similarity test (ENCAPA-TDNN). This is a real technical metric used in speaker verification.',
        "The legal advice provided is based on US 'Right of Publicity' laws as cited in the source; this may vary by jurisdiction.",
        'No fabricated benchmarks were used; all numbers are cited from the source text.',
      ],
      captionVariants: [
        {
          style: 'Bulletins',
          caption:
            '⚡ هل صوتك ملكك فعلاً؟ استكشاف مخاطر استنساخ الصوت بالذكاء الاصطناعي.\n\nتتطور تقنيات استنساخ الصوت بسرعة تفوق الأطر القانونية الحالية. إليك كيف تحمي هويتك الصوتية:\n\n🔹 كيف يتم استنساخ الصوت؟\n🔹 التحديات القانونية (Right of Publicity).\n🔹 خطوات عملية عند اكتشاف انتحال صوتك.\n🔹 غياب المرجع التقني الموثوق للتحقق.\n\nهل تعتقد أن القوانين الحالية كافية لحماية هويتنا الرقمية؟ شارك برأيك 👇\n\n#CyberSecurity #AI #DigitalIdentity #TechEthics #Privacy #VoiceCloning',
        },
        {
          style: 'Narrative',
          caption:
            'تخيل أن تسمع صوتك في فيديو لم تسجله أبداً. هذه ليست خيالاً علمياً، بل واقعاً تقنياً مقلقاً. استكشفنا في هذا العرض كيف يتم استنساخ الأصوات، لماذا يصعب إثبات الانتحال، وما هي الخطوات القانونية المتاحة حالياً لحماية بصمتك الصوتية. 🎙️🛡️\n\n#TechInArabic #AI #Security #IdentityTheft',
        },
      ],
      hookVariants: [
        {
          tag: 'Identity',
          enTitle: 'Is Your Voice Still Yours?',
          arTitle: 'هل صوتك ملكك فعلاً؟',
          enBody: 'AI voice cloning is evolving faster than legal frameworks.',
          arBody: 'تقنيات استنساخ الصوت تتطور أسرع من القوانين.',
          centerIcon: 'mic',
        },
        {
          tag: 'Security',
          enTitle: 'The New Identity Theft.',
          arTitle: 'سرقة الهوية الجديدة',
          enBody: 'AI can now clone your unique speech patterns.',
          arBody: 'الذكاء الاصطناعي يستنسخ أنماط كلامك الفريدة.',
          centerIcon: 'shield-alert',
        },
        {
          tag: 'Legal',
          enTitle: 'Can You Protect Your Voice?',
          arTitle: 'هل يمكنك حماية صوتك؟',
          enBody: 'Navigating the legal labyrinth of AI voice cloning.',
          arBody: 'كيف تتعامل مع المتاهة القانونية لاستنساخ الصوت.',
          centerIcon: 'gavel',
        },
      ],
      visualOptions: {
        showCadReticles: true,
        showSparklines: true,
        terminalScanlines: true,
      },
    },
  },
];
