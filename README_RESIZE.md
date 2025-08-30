How to generate responsive resized images

This project can benefit from serving smaller images on mobile. The included
script `scripts/resize-images.js` will generate resized copies of images in
`images/` into `images/resized/{width}/` for widths 400, 800, and 1200.

Steps (Windows PowerShell):

1. Install Node.js (if not already installed).
2. From the project root, initialize npm and install sharp:

   npm init -y; npm install sharp

3. Run the script:

   node .\scripts\resize-images.js

4. The resized images will appear under `images/resized/400`, `images/resized/800`, etc.

Usage:
- After generating the resized images, update your HTML to use `srcset` and `sizes` to serve appropriately-sized images. Example:

  <img src="images/resized/800/project1-1.jpg"
       srcset="images/resized/400/project1-1.jpg 400w, images/resized/800/project1-1.jpg 800w, images/resized/1200/project1-1.jpg 1200w"
       sizes="(max-width: 600px) 100vw, 50vw"
       alt="...">

Notes:
- `sharp` preserves file formats (JPG/PNG) and supports outputting WebP if you prefer smaller files.
- If you'd like, I can add an automated HTML update script to swap `data-src` to `srcset` for flipbook images once resized images exist.
