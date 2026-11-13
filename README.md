# Antonio Cucciniello Real Estate Track Record

Repository: `real-estate-track-record`

A public, link-shareable track record for hard-money lender review. This is a plain static site: no build step, no framework.

The page is set to `noindex` so search engines should not list it.

## Update the data

Edit `data/properties.json` only. You do not need to change the HTML, CSS, or JavaScript for a new deal, a status change, or a figure update.

- `properties` — one object per row. Use the same fields as the existing rows (`id`, `address`, `city`, `state`, optional `zip`, `type`, `strategy`, `entity`, optional `purchaseDate`, `purchasePrice`, `rehab`, `saleDate`, `salePrice`, `status`).
- `rentalSheet: true` — include the property on the Rental experience tab. `1601 Hanger St` also appears on the flip view, as on the source Page.
- `countsAsCompleted: true` — count the property in **Completed exits**. Leave this off for Salisbury and any under-contract purchase.
- `saleVolumeIds` — property ids that sum into **Sale volume**. Keep this limited to the completed flip sales that should appear in that total.
- `title`, `owner`, `summary`, `asOf`, `entities`, and `role` — header copy. Update `asOf` when the figures change.

Leave unknown numbers out of the JSON rather than estimating them. The site displays a dash for blank fields.

To preview locally:

```bash
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173/.

## Deploy

Push this folder to the `acucciniello/real-estate-track-record` GitHub repository and import that repo as a Vercel project. No build command or output directory is required; Vercel can serve the files as a static site.

After a data-only change, commit the updated `data/properties.json` and push. Vercel will republish on the next deployment.
