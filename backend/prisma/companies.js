// Saudi organizations with a published co-op (التدريب التعاوني) program, linked to
// their official program or careers page. Checked against those pages in October 2026.
// Eligibility and intake dates change every cycle, so the admin keeps these current
// from the dashboard; the seed only adds companies that are missing.
// No application emails are listed: these programs take applications on their own sites.
// `logo` is a file in prisma/logos (sources in prisma/logos/SOURCES.md).
export const COOP_COMPANIES = [
  {
    name: 'شركة علم',
    logo: 'elm.png',
    city: 'الرياض',
    sector: 'التقنية والخدمات الرقمية',
    website: 'https://career.elm.sa/elm/go/Coop-Trainee-and-Training-Programs/7792200/',
    majors: ['علوم الحاسب', 'نظم المعلومات', 'هندسة البرمجيات', 'المحاسبة', 'المالية', 'القانون', 'الموارد البشرية', 'التسويق', 'إدارة المشاريع'],
    description: 'برنامج تدريب تعاوني بدفعات متعددة في السنة (مثل يناير ويونيو وأغسطس) بمقر الشركة في الرياض، بمدة من 4 إلى 7 أشهر ومكافأة شهرية. يشترط أن يكون التدريب متطلباً للتخرج، مع إجادة الإنجليزية وحد أدنى للمعدل يُحدَّد في كل إعلان. التقديم عبر بوابة الوظائف.',
  },
  {
    name: 'سابك',
    logo: 'sabic.png',
    city: 'الرياض',
    address: 'برامج تدريب في الرياض والجبيل وينبع',
    sector: 'البتروكيماويات والصناعة',
    website: 'https://www.sabic.com/ar/careers/middle-east-africa/students-and-fresh-graduates',
    majors: [],
    description: 'برنامج تدريب تعاوني لطلاب السنة النهائية في مختلف التخصصات، في مواقع الشركة بالرياض والجبيل وينبع. يشترط أن يكون التدريب متطلباً للتخرج من الجامعة أو الكلية. التقديم من صفحة الطلاب والخريجين.',
  },
  {
    name: 'أرامكو السعودية',
    logo: 'aramco.png',
    city: 'الظهران',
    sector: 'الطاقة',
    website: 'https://www.aramco.com/en/careers/for-saudi-applicants/student-opportunities',
    majors: [],
    description: 'تقدّم برامج للطلاب السعوديين منها التدريب التعاوني لطلبة الجامعات والكليات في مرحلة التدريب، ويُقبل فيها عدد محدود من المتفوقين. يُطلب عادة السجل الأكاديمي وخطاب الجامعة. التفاصيل ومواعيد التسجيل في صفحة فرص الطلاب.',
  },
  {
    name: 'صندوق التنمية الصناعية السعودي',
    logo: 'sidf.png',
    city: 'الرياض',
    sector: 'جهة حكومية - تمويل',
    website: 'https://www.sidf.gov.sa/Coop',
    majors: [],
    description: 'برنامج تدريب تعاوني بالتعاون مع الجامعات المعترف بها من وزارة التعليم. من الشروط المعلنة: الجنسية السعودية، ومعدل لا يقل عن 4 من 5 أو 3.2 من 4، ومستوى متقدم في الإنجليزية.',
  },
  {
    name: 'الشركة السعودية لمنتجات الألبان والأغذية (سدافكو)',
    logo: 'sadafco.png',
    city: 'جدة',
    sector: 'الأغذية والصناعة',
    website: 'https://www.sadafco.com/careers/',
    majors: [],
    description: 'برنامج تدريب تعاوني للطلاب السعوديين الذين تشترط جامعاتهم أو كلياتهم تدريباً عملياً قبل التخرج، حسب المقاعد المتاحة. التقديم من صفحة الوظائف.',
  },
  {
    name: 'مصرف الراجحي',
    logo: 'alrajhi.png',
    city: 'الرياض',
    sector: 'البنوك والخدمات المالية',
    website: 'https://careers.alrajhibank.com.sa/en/page/coop-program/',
    majors: [],
    description: 'يتدرّب الطلاب في إدارات المصرف وفروعه حسب التخصصات المطلوبة في كل فصل. من الشروط المعلنة: أن يكون التدريب ضمن خطة التخرج، ومعدل لا يقل عن 3 من 4 أو 3 من 5، واجتياز المقابلة. المطلوب: الهوية، والسجل الأكاديمي، وخطاب الجامعة بتاريخي البداية والنهاية، والسيرة الذاتية.',
  },
  {
    name: 'البنك الأهلي السعودي',
    logo: 'snb.png',
    city: 'الرياض',
    sector: 'البنوك والخدمات المالية',
    website: 'https://www.alahli.com/en/pages/about-us/careers/snb-cooperative-training-program',
    majors: [],
    description: 'برنامج التدريب التعاوني في البنك الأهلي السعودي يربط دراسة الطالب بتطبيقات العمل الفعلية في إدارات البنك.',
  },
  {
    name: 'البنك السعودي للاستثمار',
    logo: 'saib.png',
    city: 'الرياض',
    sector: 'البنوك والخدمات المالية',
    website: 'https://careers.saib.com.sa/en/page/coop-program/',
    majors: [],
    description: 'برنامج تدريب تعاوني يركّز على المهارات العملية، ويمر بترشيح الجامعة ثم المقابلات ثم القبول، ويُعدّ المتدرب تقريراً ختامياً في نهاية البرنامج.',
  },
  {
    name: 'الشركة السعودية للملاحة الجوية (سانس)',
    logo: 'sans.png',
    city: 'الرياض',
    sector: 'الطيران',
    website: 'https://careers.sans.com.sa/',
    majors: [],
    description: 'برنامج تدريب تعاوني لعدد محدود من الطلاب السعوديين من مختلف الجامعات والكليات، بمدة لا تقل عن 10 أسابيع ولا تزيد على 7 أشهر، مع حد أدنى للمعدل ومقابلة شخصية.',
  },
  {
    name: 'بوبا العربية',
    logo: 'bupa.png',
    city: 'جدة',
    sector: 'التأمين الصحي',
    website: 'https://careers.bupa.com.sa/',
    majors: ['المالية', 'المحاسبة', 'علوم الحاسب'],
    description: 'برنامج تدريب تعاوني منظم يعمل فيه الطلاب مع موظفي الشركة على مشاريع داخل الإدارات التي يختارونها.',
  },
  {
    name: 'المركز الوطني للفعاليات',
    logo: 'nec.png',
    city: 'الرياض',
    sector: 'جهة حكومية',
    website: 'https://nec.gov.sa/en/join-us/coop-training-program',
    majors: [],
    description: 'برنامج تدريب تعاوني لطلاب الجامعات. الشروط ومواعيد التقديم في صفحة البرنامج.',
  },
  {
    name: 'الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)',
    logo: 'sdaia.png',
    city: 'الرياض',
    sector: 'جهة حكومية - البيانات والذكاء الاصطناعي',
    website: 'https://sdaia.gov.sa',
    majors: ['علوم الحاسب', 'علم البيانات والذكاء الاصطناعي'],
    description: 'برنامج التدريب التعاوني عبر أكاديمية سدايا بمقرها في الرياض، يجمع التدريب العلمي بالمشاركة في مشاريع داخل الهيئة في علوم الحاسب والبيانات والذكاء الاصطناعي، بالشراكة مع الجامعات.',
  },
  {
    name: 'وزارة المالية',
    logo: 'mof.png',
    city: 'الرياض',
    sector: 'جهة حكومية',
    website: 'https://www.mof.gov.sa',
    majors: [],
    description: 'برنامج تدريب تعاوني بفرص حسب التخصصات المطلوبة لكل فصل. من الشروط في الدورات السابقة: الجنسية السعودية، ومعدل لا يقل عن 3.75 من 5 أو 2.75 من 4، ومستوى متوسط في الإنجليزية، واجتياز المفاضلة والمقابلة، مع خطاب الجامعة والسيرة الذاتية. تُعلن الدورات على موقع الوزارة وحسابها الرسمي.',
  },
];

// Recognized training and e-learning platforms students use alongside their co-op
// (self-learning tasks, certificates). Websites checked in November 2026: each one
// was opened directly or confirmed by its operator's official accounts and press.
// The training unit listed them as accredited, so they carry the badge; the admin
// can withdraw it. No logos are bundled for these; the admin can upload them.
const ONLINE = 'عن بُعد';
const TECH_MAJORS = ['علوم الحاسب', 'نظم المعلومات', 'هندسة البرمجيات', 'تقنية المعلومات', 'الأمن السيبراني', 'علم البيانات', 'الذكاء الاصطناعي'];

export const TRAINING_PLATFORMS = [
  {
    name: 'منصة دروب',
    city: ONLINE,
    address: 'منصة إلكترونية تابعة لصندوق تنمية الموارد البشرية (هدف)',
    sector: 'منصات التدريب الإلكتروني',
    website: 'https://doroob.sa/ar/',
    majors: [],
    description: 'المنصة الوطنية للتدريب الإلكتروني، إحدى مبادرات صندوق تنمية الموارد البشرية (هدف). تقدّم دورات إلكترونية مجانية في مهارات سوق العمل مع شهادات إتمام، ويمكن الاستفادة منها في مهام التعلّم الذاتي ضمن خطة التدريب.',
  },
  {
    name: 'مؤسسة مسك',
    city: 'الرياض',
    sector: 'منصات التدريب وتنمية المهارات',
    website: 'https://misk.org.sa/',
    majors: [],
    description: 'مؤسسة محمد بن سلمان غير الربحية (مسك)، تأسست عام 2011 لتنمية التعلّم والقيادة لدى الشباب السعودي. تقدّم برامج في القيادة وريادة الأعمال والمهارات والمجتمع، ويُسجَّل في برامجها عبر منصاتها الرسمية.',
  },
  {
    name: 'منصة إثرائي',
    city: ONLINE,
    address: 'منصة إلكترونية تابعة لمعهد الإدارة العامة',
    sector: 'منصات التدريب الإلكتروني',
    website: 'https://ethrai.sa/',
    majors: [],
    description: 'منصة التدريب الإلكتروني التابعة لمعهد الإدارة العامة، أُطلقت عام 2017. تقدّم برامج تدريب عن بُعد في التطوير الإداري والممارسات الإدارية الحديثة، وتُمنح شهادة من معهد الإدارة العامة عند إتمام البرنامج في مدته.',
  },
  {
    name: 'منصة إدراك',
    city: ONLINE,
    address: 'منصة إلكترونية تابعة لمؤسسة الملكة رانيا (الأردن)',
    sector: 'منصات التدريب الإلكتروني',
    website: 'https://www.edraak.org/',
    majors: [],
    description: 'منصة عربية للتعليم الإلكتروني أطلقتها مؤسسة الملكة رانيا عام 2014، تقدّم دورات مجانية باللغة العربية عبر الإنترنت في مجالات متعددة.',
  },
  {
    name: 'أكاديمية منشآت',
    city: ONLINE,
    address: 'منصة إلكترونية تابعة للهيئة العامة للمنشآت الصغيرة والمتوسطة (منشآت)',
    sector: 'منصات التدريب الإلكتروني',
    website: 'https://academy.monshaat.gov.sa/',
    majors: [],
    description: 'الذراع التدريبي للهيئة العامة للمنشآت الصغيرة والمتوسطة (منشآت). برامج مجانية باللغة العربية عبر الإنترنت لبناء المهارات المالية والإدارية والتقنية وريادة الأعمال، مع شهادة إنجاز عند إتمام المتطلبات. الدخول عبر النفاذ الوطني الموحد.',
  },
  {
    name: 'أكاديمية طويق',
    city: 'الرياض',
    sector: 'التدريب التقني',
    website: 'https://tuwaiq.edu.sa/',
    majors: TECH_MAJORS,
    description: 'أكاديمية مقرها الرياض تقدّم معسكرات وبرامج تدريبية وشهادات احترافية في مجالات التقنية مثل البرمجة والأمن السيبراني والبيانات والذكاء الاصطناعي، والتسجيل في برامجها مجاني عبر موقعها الرسمي.',
  },
  {
    name: 'منصة سطر',
    city: ONLINE,
    address: 'منصة إلكترونية أطلقتها أكاديمية طويق',
    sector: 'منصات التدريب الإلكتروني',
    website: 'https://satr.codes/',
    majors: TECH_MAJORS,
    description: 'منصة وطنية مجانية لتعلّم البرمجة والتقنيات الحديثة أطلقتها أكاديمية طويق، بمسارات مثل تطوير الويب والتطبيقات وعلم البيانات والذكاء الاصطناعي، مع شهادات إتمام للدورات.',
  },
].map((p) => ({ ...p, accredited: true }));
