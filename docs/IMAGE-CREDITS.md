# Image credits

Pictures in `public/landing/` are used only by the sample portfolio in the landing page hero. All of them were made for this site; none comes from a third party.

| File | What it is |
|---|---|
| `ada-avatar.png` | A cartoon avatar for the invented sample person "Ada Okonkwo": a flat illustration with a purple skin tone, so it does not stand for any real person or any race. Drawn as an SVG for this site and saved as a PNG. |
| `project-1.jpg`, `project-2.jpg`, `project-3.jpg` | Screens of three invented products (a reconciliation dashboard, a rate-limiter chart, an invoice parser), drawn in HTML and screenshotted. |

## Notes

- An earlier version used a licensed Pexels stock portrait. It was replaced by the cartoon avatar, so no real person is pictured and no third-party licence applies.
- To change a picture, replace the file in `public/landing/` and keep the name. Only files named `/landing/<name>.jpg|jpeg|png|webp` are accepted as local images by the portfolio renderer (`lib/blocks/adapt.ts`); SVG is deliberately not accepted, and every other image must be an https upload.
