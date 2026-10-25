# Image credits

Pictures in `public/landing/` are used only by the sample portfolio in the landing page hero.

| File | What it is | Source and licence |
|---|---|---|
| `ada-portrait.jpg` | Studio portrait of a smiling woman in a black jacket, used as the face of the invented sample person "Ada Okonkwo" | Pexels photo 29852895 by `ifeyinkastudios` (https://www.pexels.com/photo/professional-corporate-headshot-of-smiling-woman-29852895/). Pexels licence: free to use, no attribution required, may be modified. |
| `project-1.jpg`, `project-2.jpg`, `project-3.jpg` | Screens of three invented products (a reconciliation dashboard, a rate-limiter chart, an invoice parser) | Made for this site (HTML drawn and screenshotted). No third-party material. |

## Things to know about the portrait

- A real person appears in it. The sample is labelled on the page: "A sample with invented details; the photo is a licensed stock image." Keep that wording if you keep the photo.
- The Pexels licence says not to imply that the person endorses a product, and not to show identifiable people in a bad light. A sample portfolio that gives this woman an invented name and job is common practice, but if you ever want zero risk, replace the file with a photo of someone who has agreed to be shown (for example a team member), keeping the same file name and a similar head-and-shoulders crop. Nothing else needs to change.
- The file is served from our own site. It is never hot-linked from Pexels.
- To change a picture, replace the file in `public/landing/` and keep the name. Only files named `/landing/<name>.jpg|jpeg|png|webp` are accepted as local images by the portfolio renderer (`lib/blocks/adapt.ts`); every other image must be an https upload.
