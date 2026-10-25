# Image credits

Pictures in `public/landing/` are used only by the sample portfolio in the landing page hero. All of them were made for this site; none comes from a third party.

| File | What it is |
|---|---|
| `dev-avatar.jpg` | The vector avatar of the sample person "Clifford Nwanna" (a developer with glasses), supplied by the site owner as `Professional Vector Avatar Portrait.png` and resized to 800px for the web. The original is kept outside the repository. |
| `project-1.jpg`, `project-2.jpg`, `project-3.jpg` | Screens of three invented products (a reconciliation dashboard, a rate-limiter chart, an invoice parser), drawn in HTML and screenshotted. |

## Notes

- An earlier version used a licensed Pexels stock portrait. It was replaced by the cartoon avatar, so no real person is pictured and no third-party licence applies.
- To change a picture, replace the file in `public/landing/` and keep the name. Only files named `/landing/<name>.jpg|jpeg|png|webp` are accepted as local images by the portfolio renderer (`lib/blocks/adapt.ts`); SVG is deliberately not accepted, and every other image must be an https upload.
