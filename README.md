# omara-org.github.io

Jekyll site using the [Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) theme, deployed to OVH web hosting over FTPS by `.github/workflows/deploy-ovh.yml` on every push to `main`. The workflow needs the `OVH_FTP_HOST`, `OVH_FTP_USER` and `OVH_FTP_PASSWORD` repository secrets.

- Projects: `_projects/<name>.md` (one page per project)
- Practices: `_practices/<name>.md`
- Pages: `_pages/`
- Menu: `_data/navigation.yml`
- Theme options (skin, author, footer): `_config.yml`

Run locally with `bundle install && bundle exec jekyll serve`, or without Ruby:

```sh
docker run --rm -it -p 4000:4000 -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -e BUNDLE_PATH=/site/vendor/bundle -v "$PWD":/site -w /site ruby:3.3 \
  sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0"
```

## Secret handling for deployments

This repository uses a `production` GitHub Actions environment and expects an environment secret named `SITE_PASSWORD`.

1. Go to **Settings → Environments → production** and add the secret `SITE_PASSWORD`.
2. In that same environment, set protection rules:
   - restrict deployments to branch `main`
   - require reviewers before workflows can access environment secrets
3. Rotate `SITE_PASSWORD` regularly and immediately after any suspected exposure.

> GitHub Pages serves static files only. Do not place passwords in client-side code (`HTML`, `JS`, `CSS`) because they are publicly visible to visitors.
