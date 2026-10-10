const r = await fetch("http://127.0.0.1:5173/api/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "CampusBookstore",
    "Origin": "http://127.0.0.1:5173",
  },
  body: JSON.stringify({
    email: "admin@campusbookstore.com",
    password: "Libis.plhr43",
    portal: "admin",
  }),
});
const d = await r.json();
console.log("Login HTTP Status:", r.status);
console.log("Login Response Data:", d);
