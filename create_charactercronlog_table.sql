CREATE TABLE CharacterCronLog (
	id SERIAL PRIMARY KEY,
	created_at timestamptz NOT NULL DEFAULT now(),
	epoch_datetime BIGINT,
	category TEXT,
	message TEXT,
	error jsonb NOT NULL DEFAULT '{}'
)