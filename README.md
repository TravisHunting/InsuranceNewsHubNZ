# Koru Intelligence Hub

Koru monitors New Zealand health insurance and public health sources, stores traceable intelligence records, and maintains a Health NZ evidence library.

Live app: https://koru.travishunting.com

## Application

The app lives in `app/` and uses React, Vinext, TypeScript and Cloudflare Workers. Sites manages deployment, the `DB` D1 database, and the `FILES` R2 bucket. The existing Site identity and binding declarations are in `app/.openai/hosting.json`.

## Local development

Use Node.js 22.13 or later. From `app/`:

```sh
npm ci
npm run dev
npm test
npm run build
```

See `app/.env.example` for runtime settings. Keep secrets out of Git; configure hosted values through Sites. Local Worker state is separate from production. Source configuration is in `app/lib/sources.ts`.

## Health NZ quarterly reports

Choose **Scan all sources** to discover Word attachments on the configured Health NZ quarterly report publication page. Discovery accepts DOC/DOCX links and Word-labelled download links, excludes PDF alternatives and off-allowlist hosts, and retains the actual published URL rather than guessing a filename.

Downloads respect robots rules, check redirects against allowed hosts, time out after 15 seconds per request, and enforce a 25 MB streaming limit. Word container signatures are checked before storage. Stable IDs derived from source URLs prevent repeat scans from downloading reports already stored. Failures are recorded while other reports and sources continue.

Acquired files appear in **Health NZ reports** with a download link and source URL in their summary. Word files are marked **needs manual review**: automatic Word text extraction, pagination and metric extraction are not implemented. Existing PDF uploads retain page-aware extraction. The upload form also accepts DOC and DOCX files when automatic access is blocked.

Health NZ can return HTTP 403 or a bot challenge. In that case, the scan records the failure and leaves existing reports intact. Upload the publisher's file manually; do not bypass its access controls. The configured collection currently covers 2025/26; update its seed URL when the publisher opens a new reporting year.

## Publishing and source control

Use the installed Sites building and hosting skills from the `app/` project. Validate and build, push the exact app source revision to the existing Site source repository using an ephemeral per-command credential, package the built Worker, save a version, and deploy it to the existing audience. Verify deployment success and preserve the custom domain.

This GitHub repository stores the app under `app/`; the Sites source repository stores the app at its root. Synchronize using an isolated source checkout, excluding dependencies, build output, local state and credentials. Keep root documentation here and include a copy in the Site source checkout. Commit and push the completed work to GitHub. Never force-push over unrelated remote changes.
