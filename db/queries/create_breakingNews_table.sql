CREATE TABLE breakingNews (
    id SERIAL PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    epoch_datetime BIGINT,
    alert TEXT
);