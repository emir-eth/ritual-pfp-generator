# Private assets (in Git)

Ritual rasters live under **`ritual/`** and are **committed** with the repo (WebP in production; PNG still supported by the app and conversion script).

## Layout

```
private-assets/
  ritual/
    ritual-001.webp … ritual-147.webp   # main binding pool (or .png)
    ocean/      *.webp (or .png)
    volcanic/
    clockwork/
    glass/
    ancient/
    energy/
    mystical/
    cosmic/
```

## Adding new art (PNG → WebP)

1. Add or replace PNGs under `private-assets/ritual/` (main or world folders).
2. From the repo root:

   ```bash
   npm run convert-webp -- --quality=92 --delete-png
   ```

3. Commit the new `.webp` files (and any code/data changes).

Placeholder main pool only (dev, not realm art):

```bash
node scripts/write-ritual-pngs.mjs
```

Then run `convert-webp` if you want those placeholders as WebP too.
