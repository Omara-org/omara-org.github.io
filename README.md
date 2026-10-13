# omara-org.github.io

Jekyll site using the [Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) theme, deployed to GitHub Pages by `.github/workflows/jekyll.yml`.

- Posts: `_posts/YYYY-MM-DD-title.md`
- Pages: `_pages/`
- Menu: `_data/navigation.yml`
- Theme options (skin, author, footer): `_config.yml`

Run locally with `bundle install && bundle exec jekyll serve`, or without Ruby:

```sh
docker run --rm -it -p 4000:4000 -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -e BUNDLE_PATH=/site/vendor/bundle -v "$PWD":/site -w /site ruby:3.3 \
  sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0"
```
