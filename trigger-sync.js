# Run this in the browser to trigger LinkedIn sync for your connected account
# Or run directly: http://localhost:3000/api/cron/sync-analytics

const url = "http://localhost:3000/api/cron/sync-analytics";

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Sync complete!");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("Sync failed:", err.message);
  });
