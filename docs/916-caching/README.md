# NOTES

This documents describes how to gather data which is helps with decisions regarding caching.

Current branch includes changes to the datasette interfacing code, additional middleware 
that talks to Redis (not production ready, needs more careful error handling), and middleware
and extra plumbing to enable data gathering and export.

The directory containing this document also contains scripts that allow to repeat the 
process in the future. After running these staps, you'll have a `stats.sqlite` database file
with a `queries` table populated with data gathered in step 1.


1. Start the app + docker compose etc (so that Redis instance is running)
2. Run `./docs/916-caching/execute-requests.sh` - this may take a while
3. Run `node docs/916-caching/request-stats.js fetch` - this will save a JSON file in CWD and prints the FILENAME
4. Run `node docs/916-caching/request-stats stats FILENAME LABEL` - where `FILENAME` is the file name printed by previous step, `LABEL` is a label to distinguish this data run in the DB from others. If successful this step will create `stats.csv` file.
5. Run `sqlite3 stats.sqlite` and run `.read docs/916-caching/queries-stats.sql`

The `id` column contains a request id, an UUID, which is assigned to each Request object in the app. This makes it to gather all datasette calls triggered by a requested page. 

Examples of useful queries:

```sql
-- get total duration and total compressed size of data for each request
select url, sum(duration) as duration, sum(compressed) as compressed 
from queries where label = 'main' 
group by id order by duration desc
```