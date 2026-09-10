# Working on Koru

- The Sites application is in `app/`; run npm commands there. Preserve its lockfile and existing architecture.
- Use the Sites building and hosting skills. Reuse `app/.openai/hosting.json` and its Site ID, DB and FILES bindings. Preserve the custom domain `koru.travishunting.com` and existing access policy.
- Keep source changes in this repository and synchronize the app source to the Site repository when publishing. Never store credentials in files, remote URLs, or Git configuration.
- For scraper changes, preserve host allowlists, robots checks, bounded requests, typed failures and duplicate protection. Never bypass blocked source responses.
- Health NZ scans acquire DOC/DOCX attachments from its quarterly report collection into FILES and reports metadata into DB. Word files require manual review; do not invent extracted metrics or page numbers.
- Run `npm test` and the Sites build before publishing. Add focused regression coverage for changed scraper behavior. Do not perform browser testing unless requested.
- Update README.md when behavior or operation changes. When the user requests a live update, finish deployment, verify terminal success, and commit/push the completed changes to GitHub as well as the Sites source repository.

