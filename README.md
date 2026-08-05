# SVETLAB company site

Russian-language B2B landing page for lighting selection, custom production coordination and project consolidation in China.

## Technology

- Static HTML, CSS and JavaScript; no framework and no build step.
- Self-hosted Onest variable font with Cyrillic and Latin subsets.
- Responsive WebP images with explicit dimensions and lazy loading below the fold.
- No backend, SMTP credentials, direct file upload or third-party analytics script.
- Project files are sent through Telegram, WhatsApp, MAX or e-mail.

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Configuration

Confirmed contact details and the legal entity are defined once in `config.js`.

## Deployment

The site is published through GitHub Pages and keeps the existing `CNAME` for `shangchengchuang.com`.

```bash
git push -u origin fix/svetlab-one-final-taskbook
git push origin HEAD:main
```
