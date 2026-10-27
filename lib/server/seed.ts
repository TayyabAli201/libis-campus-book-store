import { batch, stmt, one, now, uid, runtime, AppError } from "./db";
import { passwordHash, hash } from "./security";
import type { StoreSettings } from "../contracts";
export async function bootstrap(req: Request) {
  const config = runtime();
  if (
    !config.BOOTSTRAP_TOKEN ||
    hash(req.headers.get("authorization") || "") !==
      hash(`Bearer ${config.BOOTSTRAP_TOKEN}`)
  )
    throw new AppError(403, "Bootstrap authorization required.");
  if (await one("SELECT id FROM settings WHERE id=1"))
    throw new AppError(409, "This database has already been initialized.");
  if (
    typeof config.BOOTSTRAP_PASSWORD !== "string" ||
    config.BOOTSTRAP_PASSWORD.length < 8
  )
    throw new AppError(503, "Set BOOTSTRAP_PASSWORD securely before setup.");
  const settings: StoreSettings = {
    store_name: "Campus Bookstore",
    header_tagline: "Your one-stop shop for educational books",
    whatsapp: "03034049973",
    support_email: "",
    support_hours: "Support hours to be announced",
    distribution_center_address: "Qanchi",
    facebook_link: "https://facebook.com/campusbookstore",
    twitter_link: "https://twitter.com/campusbookstore",
    instagram_link: "https://instagram.com/campusbookstore",
    linkedin_link: "https://linkedin.com/company/campusbookstore",
    store_open: true,
    maintenance_message: "We are currently conducting scheduled system maintenance. Ordering is temporarily closed. Please check back soon!",
    bank_name: "Meezan Bank",
    bank_account: "11550109645933",
    bank_iban: "PK29MEZN0011550109645933",
    account_title: "DIGITAL GROWTH HUB",
    delivery_campus: 10000,
    delivery_campus_enabled: true,
    delivery_lahore: 50000,
    delivery_lahore_enabled: true,
    delivery_other: 80000,
    delivery_other_enabled: true,
    currency: "PKR",
    order_prefix: "VU",
    max_upload_mb: 5,
  };
  const statements = [
    stmt(
      "INSERT INTO settings(id,value) VALUES(1,?)",
      JSON.stringify(settings),
    ),
    stmt(
      "INSERT INTO users(id,email,name,password_hash,role,must_change,created_at) VALUES(?,?,?,?,?,?,?)",
      uid(),
      String(
        config.BOOTSTRAP_EMAIL || "admin@campusbookstore.com",
      ).toLowerCase(),
      "Store Administrator",
      passwordHash(config.BOOTSTRAP_PASSWORD),
      "SUPER_ADMIN",
      1,
      now(),
    ),
  ];
  for (const [id, rate] of [
    ["A", 250],
    ["B", 350],
    ["C", 500],
    ["D", 600],
  ])
    statements.push(
      stmt("INSERT INTO pricing_categories(id,rate) VALUES(?,?)", id, rate),
    );
  const seeds = [
    [
      "CS101",
      "Introduction to Computing",
      "Computing fundamentals",
      "Campus Faculty",
      350,
      "B",
      75,
    ],
    [
      "MTH101",
      "Calculus & Analytical Geometry",
      "Mathematics",
      "Campus Faculty",
      300,
      "B",
      45,
    ],
    [
      "ENG101",
      "English Comprehension",
      "Communication & English",
      "Campus Faculty",
      220,
      "A",
      60,
    ],
    [
      "MGT101",
      "Principles of Management",
      "Business & Management",
      "Campus Faculty",
      280,
      "C",
      32,
    ],
    [
      "PHY101",
      "Physics for Engineers",
      "Physics",
      "Campus Faculty",
      410,
      "C",
      28,
    ],
    [
      "CS201",
      "Introduction to Programming",
      "Computer Science",
      "Campus Faculty",
      390,
      "D",
      35,
    ],
    ["ECO101", "Microeconomics", "Economics", "Campus Faculty", 260, "A", 18],
    [
      "STA301",
      "Statistics & Probability",
      "Mathematics",
      "Campus Faculty",
      320,
      "B",
      5,
    ],
    [
      "LAW101",
      "Introduction to Law & Ethics",
      "Law & Legal Studies",
      "Campus Faculty",
      310,
      "B",
      20,
    ],
    [
      "BIO101",
      "General Biology & Life Sciences",
      "Biological Sciences",
      "Campus Faculty",
      420,
      "C",
      15,
    ],
    [
      "CHM101",
      "General Chemistry & Lab",
      "Chemistry",
      "Campus Faculty",
      380,
      "D",
      25,
    ],
    [
      "SOC101",
      "Introduction to Sociology",
      "Social Sciences",
      "Campus Faculty",
      240,
      "A",
      10,
    ],
  ] as const;
  for (const [code, title, course, author, pages, cat] of seeds) {
    const id = uid();
    statements.push(
      stmt(
        "INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        id,
        code,
        code,
        course,
        title,
        author,
        `Course material for ${code}. A practical companion for lectures, revision and independent study. Seed catalog entry: replace with your approved edition before accepting live orders.`,
        pages,
        cat,
        now(),
      ),
    );
  }
  await batch(statements);
  return { initialized: true };
}
