
-- EXERCISE SOLUTION AND SETUP --
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(15) UNIQUE NOT NULL,
  color VARCHAR(15)
);

CREATE TABLE visited_country (
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  CONSTRAINT unique_user_country UNIQUE (user_id, country_code)
);


INSERT INTO users (name, color)
VALUES ('Harsh', 'teal'), ('Manvi', 'powderblue');

INSERT INTO visited_country(country_code, user_id)
VALUES ('IN', 1), ('GB', 1), ('TH', 2), ('MY', 2 );

SELECT *
FROM visited_country
JOIN users
ON users.id = user_id;