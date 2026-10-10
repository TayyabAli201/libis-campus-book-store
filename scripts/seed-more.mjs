import { globSync } from "node:fs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const d1Files = globSync(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")
  .filter((f) => !f.endsWith("metadata.sqlite"));

const newBooks = [
  ["LAW101", "Introduction to Law & Ethics", "Law & Legal Studies", "Campus Faculty", 310, "B"],
  ["BIO101", "General Biology & Life Sciences", "Biological Sciences", "Campus Faculty", 420, "C"],
  ["CHM101", "General Chemistry & Lab", "Chemistry", "Campus Faculty", 380, "D"],
  ["SOC101", "Introduction to Sociology", "Social Sciences", "Campus Faculty", 240, "A"],
];

for (const file of d1Files) {
  console.log(`Adding new books to ${file}...`);
  const client = createClient({ url: `file:${file}` });
  
  for (const [code, title, course, author, pages, cat] of newBooks) {
    const existing = await client.execute({
      sql: "SELECT id FROM books WHERE code = ?",
      args: [code],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,created_at)
              VALUES(?,?,?,?,?,?,?,?,?,?)`,
        args: [
          randomUUID(),
          code,
          code,
          course,
          title,
          author,
          `Course material for ${code}. A practical companion for lectures, revision and independent study.`,
          pages,
          cat,
          new Date().toISOString(),
        ],
      });
      console.log(`Inserted ${code}: ${title}`);
    } else {
      console.log(`${code} already exists.`);
    }
  }
  client.close();
}

console.log("Seeding extra books complete!");
