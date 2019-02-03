CREATE TABLE users (
    id INT NOT NULL PRIMARY KEY,
    twitch TEXT,
    youtube TEXT,
    twitter TEXT,
    main VARCHAR(24),
    mainavatarsmall TEXT,
    mainavatarmed TEXT,
    mainavatarlarge TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);