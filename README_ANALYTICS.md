# Web Analytics Setup

This site uses Cloudflare Web Analytics (free) instead of Plausible.

## 1) Get your token

1. Make sure your domain DNS is on Cloudflare (recommended but not strictly required for the beacon).
2. In Cloudflare dashboard, go to Web Analytics.
3. Add your site: alishabestary.com.
4. Copy the Beacon token (a UUID string).

## 2) Add the token to the code

These files already include your token `2bf51f27e97d4e239093462e66dd4b5f`:

- `index.html`
- `projects.html`
- `about.html`
- `contact.html`
- `extendedportfolio.html`
- `project2.html`, `project3.html`, `project4.html`, `project5.html`
- `404.html`

The snippet looks like this:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "2bf51f27e97d4e239093462e66dd4b5f"}'></script>
```

## 3) Verify events

- Deploy your site, then open the live pages in an incognito/private window.
- In DevTools > Network, filter for `beacon.min.js` and `collect` requests.
- In the Cloudflare dashboard, open Web Analytics for `alishabestary.com` to see pageviews.

## Notes

- The beacon is lightweight and privacy-friendly. No cookies are used.
- If you ever want to disable analytics, simply remove that script tag.
- If you also use Cloudflare for DNS/proxying, you get additional metrics in the dashboard.
