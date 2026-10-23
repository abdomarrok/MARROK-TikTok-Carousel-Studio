import { CarouselData } from '../types';

export const PRESET_CAROUSELS: Record<string, { name: string; category: string; description: string; data: CarouselData }> = {
  scion: {
    name: "Anthropic's Scion: Moving Beyond Git",
    category: 'AI + ENGINEERING',
    description: 'Anthropic built Scion to handle 25M CI checkouts/day and 100GB repos.',
    data: {
      theme: 'engineering',
      category: 'AI + ENGINEERING',
      caption: `Why did Anthropic move beyond Git? A deeper look at Scion 🚀
لماذا ابتعدت Anthropic عن Git؟ نظرة عميقة على نظام Scion الداخلي

With AI agents making thousands of pull requests around the clock, traditional Git mirrors broke down under 100 GB repo histories and 25 million daily CI checkouts. Here is what Anthropic built instead:

Key Takeaways / أبرز النقاط:
• Commits and merges run server-side via API
• Changesets track only modified files (proportional resource usage)
• Test-after-merge workflow for high-throughput deployment
• 200x smaller CPU/memory footprint & 25% of CI computing freed

Source: Anthropic Engineering Blog ("Scion: Git for AI Agents")
Read more at marrok.org

#SoftwareEngineering #Git #Anthropic #AIAgents #DevOps #SystemDesign #SoftwareArchitecture #هندسة_البرمجيات #MARROK #TechInArabic`,
      captionVariants: [
        {
          style: 'Executive Bulletins & Hard Metrics',
          caption: `Why did Anthropic move beyond Git? A deeper look at Scion 🚀
لماذا ابتعدت Anthropic عن Git؟ نظرة عميقة على نظام Scion الداخلي

With AI agents making thousands of pull requests around the clock, traditional Git mirrors broke down under 100 GB repo histories and 25 million daily CI checkouts. Here is what Anthropic built instead:

Key Takeaways / أبرز النقاط:
• Commits and merges run server-side via API
• Changesets track only modified files (proportional resource usage)
• Test-after-merge workflow for high-throughput deployment
• 200x smaller CPU/memory footprint & 25% of CI computing freed

Source: Anthropic Engineering Blog ("Scion: Git for AI Agents")
Read more at marrok.org

#SoftwareEngineering #Git #Anthropic #AIAgents #DevOps #SystemDesign #SoftwareArchitecture #هندسة_البرمجيات #MARROK #TechInArabic`,
        },
        {
          style: 'Narrative Breakdown & Story',
          caption: `What happens when AI agents write more code than humans? Git starts melting. 🤖💥

Anthropic hit a wall with traditional Git: 100GB mono-repo history and 25,000,000 CI checkouts every single day. Instead of band-aiding Git, they designed Scion: a server-authoritative VCS built from the ground up for always-online software agents.

The core lesson? Don't optimize for how humans worked 15 years ago. Design for the agents building right now.

Full breakdown in the slides above.
Source: Anthropic's Engineering post. Numbers are Anthropic's own.
Learn more: marrok.org

#AIEngineering #DeveloperTools #GitAlternatives #Anthropic #VCS #CloudArchitecture #SoftwareDesign #MARROK`,
        },
      ],
      hookVariants: [
        {
          tag: 'Curiosity & Why',
          enTitle: 'Why did Anthropic\nmove beyond Git?',
          arTitle: 'السبب وراء ابتعاد\nGit عن Anthropic',
          enBody: 'A deeper look at Scion.',
          arBody: 'نظرة أعمق على Scion.',
          centerIcon: 'gitMerge',
        },
        {
          tag: 'Hard Metrics',
          enTitle: '100 GB repos &\n25M CI checkouts.',
          arTitle: '100 جيجابايت مستودع\nو25 مليون سحب يومياً.',
          enBody: 'When AI agents pushed Git to the breaking point.',
          arBody: 'حين دفع وكلاء الذكاء الاصطناعي نظام Git إلى حافة الانهيار.',
          centerIcon: 'database',
        },
        {
          tag: 'The Paradigm Shift',
          enTitle: 'Git was built for humans.\nScion was built for agents.',
          arTitle: 'صُمم Git للبشر،\nوصُمم Scion للوكلاء.',
          enBody: 'How always-online AI changes every tooling assumption.',
          arBody: 'كيف يغير وكلاء الذكاء الاصطناعي كل افتراضات أدوات التطوير.',
          centerIcon: 'robot',
        },
      ],
      slides: [
        {
          type: 'hub',
          centerIcon: 'gitMerge',
          satIcons: ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'],
          enTitle: 'Why did Anthropic\nmove beyond Git?',
          arTitle: 'السبب وراء ابتعاد\nGit عن Anthropic',
          enBody: 'A deeper look at Scion.',
          arBody: 'نظرة أعمق على Scion.',
        },
        {
          type: 'row',
          icons: [{ icon: 'database', label: '~100 GB history' }],
          enTitle: 'The repo outgrew Git.',
          arTitle: 'المستودع تجاوز قدرة Git.',
          enBody: 'Main-branch history near 100 GB, a compressed working copy over 25 GB, and about 25 million CI checkouts a day.',
          arBody: 'تاريخ الفرع الرئيسي يقارب 100 جيجابايت، ونسخة العمل المضغوطة تتجاوز 25 جيجابايت، ونحو 25 مليون عملية سحب يومياً في التكامل المستمر.',
        },
        {
          type: 'row',
          icons: [{ icon: 'server', label: 'Server-side' }],
          enTitle: "Scion's big idea.",
          arTitle: 'فكرة Scion الأساسية.',
          enBody: 'Commits, merges and history queries run on the server. Clients fetch only the files they need, through an API.',
          arBody: 'الإيداع والدمج واستعلامات التاريخ تعمل على الخادم، والعميل يسحب الملفات التي يحتاجها فقط عبر واجهة برمجية.',
        },
        {
          type: 'row',
          icons: [{ icon: 'changesets', label: 'Changesets' }],
          enTitle: 'Small changesets.',
          arTitle: 'تغييرات صغيرة.',
          enBody: 'Each change lists only the files it modified, so creating one costs resources in proportion to the change, not the whole repo.',
          arBody: 'كل تغيير يسجّل الملفات التي عدّلها فقط، فتكلفة إنشائه تتناسب مع حجم التغيير لا مع حجم المستودع كله.',
        },
        {
          type: 'row',
          icons: [{ icon: 'gitMerge', label: 'Merge first' }],
          enTitle: 'Merge, then test.',
          arTitle: 'ادمج ثم اختبر.',
          enBody: 'With so many merges, Anthropic leans more on automated testing after merging and before deploying.',
          arBody: 'مع كثرة عمليات الدمج، تعتمد Anthropic أكثر على الاختبار الآلي بعد الدمج وقبل النشر.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'cpu', label: '200x smaller' },
            { icon: 'clock', label: 'Seconds' },
            { icon: 'gauge', label: '25% freed' },
          ],
          enTitle: 'The results, per Anthropic.',
          arTitle: 'النتائج حسب Anthropic.',
          enBody: 'CPU and memory about 200x smaller than the old Git mirrors, CI checkouts in seconds instead of minutes, and 25% of CI CPU freed.',
          arBody: 'المعالج والذاكرة أصغر بنحو 200 مرة من مرايا Git السابقة، وسحب الشيفرة في ثوانٍ بدل دقائق، وتحرير 25% من قدرة المعالج في التكامل المستمر.',
        },
        {
          type: 'row',
          icons: [{ icon: 'scales', label: 'Not a Git killer' }],
          enTitle: 'Not a Git killer.',
          arTitle: 'ليس قاتل Git.',
          enBody: 'Anthropic says Git still suits most repos. Scion needs custom review, search and CI tools, and has no public release.',
          arBody: 'تقول Anthropic إن Git ما زال مناسباً لمعظم المستودعات. يحتاج Scion أدوات مراجعة وبحث وCI مخصصة، ولا إصدار عام له.',
        },
        {
          type: 'row',
          icons: [{ icon: 'lightbulb', label: 'The lesson' }],
          enTitle: 'Design for who uses it.',
          arTitle: 'صمّم لمن يستخدمها.',
          enBody: 'When the main users are always-online agents, old assumptions change: faster testing, review by risk, tooling that keeps up.',
          arBody: 'حين يكون المستخدمون الأساسيون وكلاء متصلين دائماً، تتغير الافتراضات القديمة: اختبار أسرع ومراجعة حسب الخطورة وأدوات تواكب.',
        },
        {
          type: 'cta',
          enTitle: 'Building with AI agents\nat scale?',
          arTitle: 'تبني بوكلاء الذكاء\nالاصطناعي على نطاق\nواسع؟',
          ctaText: 'DM us  •  رسالة خاصة',
          url: 'marrok.org',
          enCredit: "Based on Anthropic's engineering post. The numbers are Anthropic's own.",
          arCredit: 'مبني على مقال Anthropic الهندسي، والأرقام من Anthropic نفسها.',
        },
      ],
    },
  },

  reverseEng: {
    name: 'Reverse Engineering with AI',
    category: 'AI + SECURITY',
    description: 'Recreating compiled software in under 30 minutes with AI and Ghidra.',
    data: {
      theme: 'security',
      category: 'AI + SECURITY',
      caption: `Can AI reverse engineer software? A breakthrough demo recreated a desktop calculator in 30 minutes! 🔍⚡
هل يستطيع الذكاء الاصطناعي تفكيك البرمجيات وإعادة بنائها؟ تجربة حديثة حوّلت ملفاً تنفيذياً إلى شيفرة مصدرية في 30 دقيقة.

What you need to know / ما يجب أن تعرفه:
• Reverse engineering extracts high-level code logic from compiled binary files
• Traditional decompilers like Ghidra and IDA strip symbols and require expert analysis
• "Reverse Engineer Anything" adds an agentic reasoning loop over decompiled code
• GNOME Calculator was fully rebuilt as a Python script in under 30 mins

Source: Based on a technical breakdown video by Low Level. Full credit to its creator.
Explore security workflows at marrok.org

#CyberSecurity #ReverseEngineering #AppSec #Ghidra #Python #MalwareAnalysis #AIforSecurity #الأمن_السيبراني #الهندسة_العكسية #MARROK`,
      hookVariants: [
        {
          tag: 'Curiosity & Breakthrough',
          enTitle: 'AI can now reverse\nengineer software.',
          arTitle: 'الذكاء الاصطناعي صار\nيفكّك البرامج.',
          enBody: 'A project recreated a calculator app in under 30 minutes, says the video.',
          arBody: 'مشروع أعاد بناء تطبيق حاسبة بالكامل في أقل من 30 دقيقة، حسب الفيديو.',
          centerIcon: 'shieldAlert',
        },
        {
          tag: 'Speed & Demo',
          enTitle: 'From compiled binary\nto Python in 30 mins.',
          arTitle: 'من ملف تنفيذي مجمّع\nإلى Python في 30 دقيقة.',
          enBody: 'Decompilation without the weeks of manual Ghidra analysis.',
          arBody: 'تفكيك الشيفرة دون أسابيع من التحليل اليدوي المرهق في Ghidra.',
          centerIcon: 'calculator',
        },
        {
          tag: 'Security Implication',
          enTitle: 'Is compiled code\nstill safe?',
          arTitle: 'هل الشيفرة المجمّعة\nما زالت آمنة؟',
          enBody: 'What AI-driven reverse engineering means for software defense.',
          arBody: 'ماذا يعني التفكيك المعزز بالذكاء الاصطناعي لدفاعات البرمجيات.',
          centerIcon: 'eyeRisk',
        },
      ],
      slides: [
        {
          type: 'hub',
          centerIcon: 'shieldAlert',
          satIcons: ['binary', 'codeFile', 'search', 'calculator', 'brain', 'terminal'],
          enTitle: 'AI can now reverse\nengineer software.',
          arTitle: 'الذكاء الاصطناعي صار\nيفكّك البرامج.',
          enBody: 'A project recreated a calculator app in under 30 minutes, says the video.',
          arBody: 'مشروع أعاد بناء تطبيق حاسبة بالكامل في أقل من 30 دقيقة، حسب الفيديو.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'binary', label: 'Binary' },
            { icon: 'codeFile', label: 'Source code' },
          ],
          enTitle: 'What is reverse engineering?',
          arTitle: 'ما هي الهندسة العكسية؟',
          enBody: 'Taking a compiled program (a binary) and working out what the original source code meant to do.',
          arBody: 'أخذ برنامج مجمّع (ملف ثنائي) وفهم ما كانت تعنيه الشيفرة المصدرية الأصلية.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'brain', label: 'Expert skill' },
            { icon: 'search', label: 'Ghidra / IDA' },
          ],
          enTitle: 'Why it was hard.',
          arTitle: 'لماذا كانت صعبة؟',
          enBody: 'Compiling strips names and comments, so experts used tools like Ghidra and IDA to rebuild pseudo-code, slowly.',
          arBody: 'عملية التجميع تجرد الأسماء والتعليقات، لذا كان الخبراء يستخدمون أدوات مثل Ghidra وIDA لإعادة بناء الشيفرة ببطء.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'lifecycle', label: 'AI loop' },
            { icon: 'terminal', label: 'Ask, answer, ask' },
          ],
          enTitle: 'Enter Reverse Engineer Anything.',
          arTitle: 'وهنا يأتي Reverse Engineer Anything.',
          enBody: 'An AI loop on top of tools like Ghidra: take the program apart, ask a question, and use the answer to ask a better one.',
          arBody: 'حلقة ذكاء اصطناعي فوق أدوات مثل Ghidra: تفكك البرنامج، تسأل سؤالاً، وتستخدم الإجابة لطرح سؤال أفضل.',
        },
        {
          type: 'row',
          icons: [{ icon: 'calculator', label: 'GNOME Calculator' }],
          enTitle: 'The demo.',
          arTitle: 'التجربة.',
          enBody: 'In the video, the GNOME Calculator was recreated as a working Python app in under 30 minutes, with minor UI glitches.',
          arBody: 'في الفيديو، أُعيد بناء حاسبة GNOME كتطبيق Python شغال في أقل من 30 دقيقة مع مشاكل واجهة طفيفة.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'clock', label: '< 30 mins' },
            { icon: 'codeFile', label: 'Python script' },
            { icon: 'shieldAlert', label: 'Logic intact' },
          ],
          enTitle: 'Fast, but not magic.',
          arTitle: 'سريعة، لكنها ليست سحراً.',
          enBody: 'Complex GUI nuances still break, but the core algorithmic logic and math functions were extracted flawlessly.',
          arBody: 'تفاصيل الواجهات المعقدة ما زالت تتعثر، لكن المنطق الخوارزمي الأساسي والوظائف الحسابية استُخرجت بدقة تامة.',
        },
        {
          type: 'row',
          icons: [{ icon: 'gradCap', label: 'Learn it' }],
          enTitle: 'Should you learn it?',
          arTitle: 'هل تتعلمها؟',
          enBody: "The video says yes: it's valuable for security work. But respect legal limits, and don't run unknown rebuilt binaries.",
          arBody: 'الفيديو يجيب بنعم: مهارة قيّمة جداً لأعمال الحماية. لكن احترم الحدود القانونية ولا تشغل ملفات مجهولة.',
        },
        {
          type: 'cta',
          enTitle: 'Building secure\nsoftware?',
          arTitle: 'تبني برمجيات\nآمنة؟',
          ctaText: 'DM us  •  رسالة خاصة',
          url: 'marrok.org',
          enCredit: 'Based on a video by Low Level. Full credit to its creator.',
          arCredit: 'مبني على فيديو من قناة Low Level، والفضل لصاحبها.',
        },
      ],
    },
  },

  defectDojo: {
    name: 'DevSecOps: Finding vs. Fixing Vulnerabilities',
    category: 'AI + SECURITY',
    description: 'Why finding 1,000 vulnerabilities is useless if you only fix 10.',
    data: {
      theme: 'security',
      category: 'AI + SECURITY',
      caption: `Finding 1,000 security vulnerabilities vs. fixing 10: The DevSecOps paradox 🛡️
إيجاد 1,000 ثغرة أمنية مقابل إصلاح 10 فقط: فخ فرق التطوير والأمن

Automated scanners (SAST/DAST) flood development teams with thousands of low-priority alerts. Here is how modern DevSecOps teams centralize, deduplicate, and prioritize real exploits:

Key Takeaways / أبرز الحلول:
• Connect scanner noise into unified hubs like DefectDojo
• Deduplicate identical findings across Docker Compose environments
• Triage based on reachability and true business impact
• Automate Jira tracking only for exploitable high-severity flaws

Source: Based on DevSecOps architecture insights by Meisam Eslahi, Ph.D.
Learn more at marrok.org

#DevSecOps #AppSec #CyberSecurity #DefectDojo #Docker #VulnerabilityManagement #SoftwareSecurity #الأمن_السيبراني #MARROK`,
      slides: [
        {
          type: 'hub',
          centerIcon: 'shieldAlert',
          satIcons: ['funnel', 'database', 'alerts', 'eyeRisk', 'server', 'codeFile'],
          enTitle: 'Finding 1,000 vulnerabilities\nvs. fixing 10.',
          arTitle: 'إيجاد 1,000 ثغرة\nمقابل إصلاح 10.',
          enBody: 'Security scanners are loud. Triage is where the battle is won.',
          arBody: 'أدوات الفحص صاخبة بالإنذارات. المعركة الحقيقية تُحسم في الفرز وتحديد الأولويات.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'alerts', label: '1,000 alerts' },
            { icon: 'funnel', label: 'Noise flood' },
          ],
          enTitle: 'The alert paradox.',
          arTitle: 'مفارقة التنبيهات.',
          enBody: 'When teams run multiple security scanners, hundreds of duplicate findings create fatigue and stall product shipping.',
          arBody: 'عند تشغيل أدوات فحص متعددة، تتراكم مئات النتائج المكررة مسببة إرهاقاً للمطورين وتعطيلاً لإطلاق البرمجيات.',
        },
        {
          type: 'row',
          icons: [{ icon: 'server', label: 'Docker Compose' }],
          enTitle: 'Centralize the stack.',
          arTitle: 'مركزية بيئة العمل.',
          enBody: 'Tools like DefectDojo spin up in Docker Compose to ingest reports from Semgrep, Trivy, and OWASP ZAP automatically.',
          arBody: 'أدوات مثل DefectDojo تُشغّل عبر Docker Compose لاستيراد تقارير Semgrep وTrivy وZAP تلقائياً في مستودع موحد.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'database', label: 'Centralize' },
            { icon: 'funnel', label: 'Deduplicate' },
          ],
          enTitle: 'Deduplicate first.',
          arTitle: 'التخلص من التكرار أولاً.',
          enBody: 'Normalize CVE names and file paths so 50 scanner alerts collapse into 1 actionable ticket for engineers.',
          arBody: 'توحيد معرّفات CVE ومسارات الملفات يقلص 50 إنذاراً إلى تذكرة عمل واحدة واضحة للمهندس.',
        },
        {
          type: 'row',
          icons: [{ icon: 'eyeRisk', label: 'Reachability' }],
          enTitle: 'Focus on reachability.',
          arTitle: 'التركيز على إمكانية الاستغلال.',
          enBody: 'A vulnerability in code that is never exposed to user input is lower risk than an unauthenticated endpoint flaw.',
          arBody: 'وجود ثغرة في مسار غير متصل بالإنترنت أقل خطورة بكثير من خلل في نقطة وصول عامة غير محمية.',
        },
        {
          type: 'row',
          icons: [
            { icon: 'funnel', label: 'Filter' },
            { icon: 'clock', label: 'Fast SLAs' },
            { icon: 'shieldAlert', label: 'Zero noise' },
          ],
          enTitle: 'Measure true remediation.',
          arTitle: 'قياس الإصلاح الحقيقي.',
          enBody: 'DevSecOps success is not measuring how many bugs you found, but how quickly critical paths were patched.',
          arBody: 'نجاح DevSecOps لا يُقاس بعدد المشاكل المكتشفة، بل بسرعة معالجة وإغلاق المسارات الحرجة في الإنتاج.',
        },
        {
          type: 'row',
          icons: [{ icon: 'lightbulb', label: 'The rule' }],
          enTitle: 'Fix the top 5%.',
          arTitle: 'عالج أهم 5%.',
          enBody: 'Fixing the 5% of flaws that attackers can actually reach provides 95% of real-world defensive security.',
          arBody: 'إصلاح الـ 5% من الثغرات القابلة للاستغلال الفعلي يمنحك 95% من الحماية والأمان الحقيقي لمنظومتك.',
        },
        {
          type: 'cta',
          enTitle: 'Building secure\nsoftware?',
          arTitle: 'تبني برمجيات\nآمنة؟',
          ctaText: 'DM us  •  رسالة خاصة',
          url: 'marrok.org',
          enCredit: 'Based on a post by Meisam Eslahi, Ph.D. Full credit to its creator.',
          arCredit: 'مبني على منشور للدكتور Meisam Eslahi, Ph.D.، والفضل لصاحبه.',
        },
      ],
    },
  },
};
