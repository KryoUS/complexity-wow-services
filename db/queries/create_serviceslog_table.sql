CREATE TABLE ServicesLog (
	id SERIAL PRIMARY KEY,
	created_at timestamptz NOT NULL DEFAULT now(),
	epoch_datetime BIGINT,
	category TEXT,
	message TEXT,
	info jsonb NOT NULL DEFAULT '{}'
)