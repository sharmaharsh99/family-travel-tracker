import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(session({
  secret: "travel-tracker-secret",
  resave: false,
  saveUninitialized: true
}));

function getCurrentUserId(req) {
  return req.session.userId || 1; // Default to Harsh
}

let users = [
  { id: 1, name: "Harsh", color: "teal" },
  { id: 2, name: "Manvi", color: "powderblue" },
];

async function checkVisited(req) {
  const result = await db.query(
    `SELECT c.country_code, c.country_name
     FROM visited_country vc
     JOIN countries c ON vc.country_code = c.country_code
     WHERE vc.user_id = $1
     ORDER BY c.country_name ASC`,
    [getCurrentUserId(req)]
  );
  return result.rows; // [{ country_code: 'IN', country_name: 'India' }, ...]
}

async function getCurrentUser(req) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [getCurrentUserId(req)]);
  return result.rows[0];
}

app.get("/", async (req, res) => {
  const countries = await checkVisited(req);
  const currentUser = await getCurrentUser(req);
  const allUsers = await db.query("SELECT * FROM users");
  const allCountries = await db.query("SELECT * FROM countries ORDER BY country_name ASC");

  res.render("index.ejs", {
    countries,
    total: countries.length,
    users: allUsers.rows,
    color: currentUser.color,
    countryList: allCountries.rows
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const userId = getCurrentUserId(req);

  try {
    const result = await db.query(
      `SELECT country_code
       FROM countries
       WHERE LOWER(country_name) LIKE '%' || $1 || '%'
       ORDER BY CASE
         WHEN LOWER(country_name) = $1 THEN 0
         ELSE 1
       END
       LIMIT 1;`,
      [input.toLowerCase()]
    );

    if (!result.rows.length) {
      console.log("No matching country found for input:", input);
    } else {
      const countryCode = result.rows[0].country_code;
      await db.query(
        "INSERT INTO visited_country (country_code, user_id) VALUES ($1, $2)",
        [countryCode, userId]
      );
    }
  } catch (err) {
    console.log(err);
  }

  res.redirect("/");
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    req.session.userId = parseInt(req.body.user);
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  req.session.userId = result.rows[0].id;

  res.redirect("/");
});

app.post("/remove", async (req, res) => {
  const userId = getCurrentUserId(req);
  const code = req.body.country;

  try {
    await db.query(
      "DELETE FROM visited_country WHERE user_id = $1 AND country_code = $2",
      [userId, code]
    );
  } catch (err) {
    console.log(err);
  }

  res.redirect("/");
});

app.post("/delete-user", async (req, res) => {
  const userId = parseInt(req.body.userId);

  try {
    // Delete all visited countries for the user
    await db.query("DELETE FROM visited_country WHERE user_id = $1", [userId]);

    // Delete the user
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    // If the deleted user was the current session user, reset session
    if (req.session.userId == userId) {
      req.session.userId = null;
    }
  } catch (err) {
    console.log(err);
  }

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
