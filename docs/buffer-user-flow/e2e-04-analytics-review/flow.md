# E2E Flow 04: Analytics Review and Reporting

**Captured**: 2026-05-31
**Account**: kanishkanamdeo@hotmail.com — "My Organization" (Dubai, UTC+4)
**Plan**: Free plan (1/3 channel slots used)
**Connected Channels**: Instagram, Threads, Bluesky (LinkedIn — connection error)

## User Journey

| # | Step | Action | Expected Result | Screenshot |
|---|------|--------|-----------------|------------|
| 01 | Login | Navigate to login page | Already authenticated — redirects to authenticated page | `01-login.png` |
| 02 | Navigate to Insights | Navigate to /insights/682d9a4af49c987a958a7075 | Insights dashboard loads with overview metrics | `02-navigate-to-insights.png` |
| 03 | Insights Dashboard | Capture the main Insights dashboard | Shows "Weekly Takeaways" AI insights, Summary metrics (Posts: 11, Reactions: 62, Comments: 1, Eng. Rate: 1.9%, Impressions: 3,391, Reach: 2,208), and Performance per Post table | `03-insights-dashboard.png` |
| 04 | Select Date Range | View date range filter options | Radio buttons for: Last 7 days, Last 30 days (selected), Month to date, Last month, Custom (upgrade) | `04-date-range-filter.png` |
| 05 | Metrics Dashboard | Capture full metrics view | Followers chart (13,150), Summary section with 9 metric cards, Performance per Post table with sortable columns (Reactions, Comments, Eng. Rate, Impressions) | `05-metrics-dashboard.png` |

## Key Observations

1. **Weekly Takeaways**: AI-generated insights at the top of the dashboard with 3 actionable recommendations:
   - "Catch Up on Your Posting Goal" — identifies 1/12 posts sent this week, suggests using templates
   - "Engage with Top Performing Posts" — highlights a post with 21 likes and 3 comments from April 28
   - "Revise Your Posting Schedule" — recommends adding more time slots

2. **Summary Metrics**: 9 metric cards with trend arrows and percentage changes vs previous period:
   - Posts: 11 (Up 37.5%)
   - Reactions: 62 (Up 10.7%)
   - Comments: 1 (Down 66.7%)
   - Engagement Rate: 1.9% (Up 9%)
   - Impressions: 3,391 (Down 1.8%)
   - Reach: 2,208 (Down 3.4%)
   - Shares: 0
   - Views: 0
   - Watch Time: 0

3. **Performance per Post**: Table showing individual post performance with sortable columns (Reactions, Comments, Eng. Rate, Impressions). Shows top 10 posts with full post text, date, and metrics.

4. **Followers Chart**: Line chart comparing current period (13,150) vs previous period (13,102) with toggle for "This period", "Comparison", or "Both"

5. **Date Range Filter**: Radio buttons — "Last 7 days", "Last 30 days" (default), "Month to date", "Last month", "Custom" (requires paid upgrade)

6. **Export Feature**: Export button with dropdown menu available for data export

7. **Beta Label**: Insights is labeled as "Beta" in the sidebar navigation

8. **Post-Level Analysis**: Each post row shows full text preview, date, reactions, comments, engagement rate, and impressions with "More actions" menu

9. **Tag Filtering**: "Filter by Tags" available for segmenting analytics by custom tags

## Notable UX Patterns

- **AI-powered insights**: Weekly Takeaways provides contextual, actionable recommendations
- **Comparison periods**: All metrics show percentage change vs previous period with up/down arrows
- **Sortable columns**: Performance table allows sorting by Reactions, Comments, or Eng. Rate
- **Share as Post**: Button to share metrics as a social media post
- **View All Sent Posts**: Link from summary to the sent posts tab for drill-down
- **Responsive layout**: Three-section layout (Takeaways → Summary → Performance)
- **Upgrade gates**: Custom date range requires paid plan
