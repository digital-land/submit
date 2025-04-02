-- relies on ./stats.csv file being present

.mode csv
.import ./stats.csv queries_raw

CREATE TABLE IF NOT EXISTS queries (
    id TEXT,
    result_key TEXT,
    label TEXT,
    url TEXT,
    duration INTEGER,
    size INTEGER,
    compressed INTEGER
);

INSERT INTO queries (id, result_key, label, url, duration, size, compressed)
SELECT
    id,
    result_key,
    label,
    url,
    CAST(duration AS INTEGER),
    CAST(size AS INTEGER),
    CAST(compressed AS INTEGER)
FROM
    queries_raw;

drop table queries_raw;
