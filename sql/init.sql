CREATE TABLE IF NOT EXISTS loan_review (
  id serial primary key,
  username varchar(64) unique NOT NULL,
  pending boolean NOT NULL
);
