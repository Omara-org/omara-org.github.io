# omara-org.github.io

Source of the Omara blog, built with [Jekyll](https://jekyllrb.com) and deployed to GitHub Pages by the workflow in `.github/workflows/jekyll.yml`.

## Writing

Add a Markdown file to `_posts/` named `YYYY-MM-DD-slug.md` with front matter such as:

```yaml
---
title: A short title
tags: [jekyll, notes]
---
```

Put `<!--more-->` after the first paragraph to control the excerpt shown on the home page. Standalone pages go in the project root with a `permalink` and are added to the menu in `_data/navigation.yml`.

## Running locally

With Ruby 3.1 or newer:

```sh
bundle install
bundle exec jekyll serve --livereload
```

Without Ruby, use Docker:

```sh
docker run --rm -it -p 4000:4000 -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -e BUNDLE_PATH=/site/vendor/bundle -v "$PWD":/site -w /site ruby:3.3 \
  sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --livereload"
```

Then open <http://localhost:4000>.

## Theme

The theme is self-contained, with no external theme gem:

- `_layouts/` holds the `default`, `home`, `post`, `page` and `archive` layouts.
- `_includes/` holds the head, header and footer.
- `_sass/` holds the styles. Colours are CSS custom properties defined in `_sass/_tokens.scss`, with a light and a dark set.
- `assets/js/theme.js` drives the theme toggle. It follows the system preference until the visitor picks a theme, which is then remembered in local storage.
