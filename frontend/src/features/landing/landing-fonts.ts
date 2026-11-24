/**
 * Self-hosted landing fonts (SIL OFL 1.1, @fontsource packages pinned in
 * package.json). Imported only by the lazy landing chunk; no runtime CDN.
 * Only the subsets and weights the page needs; every face uses
 * `font-display: swap`. French: Anton, Caveat 700, Inter (variable, latin
 * range). Arabic: Lalezar, Aref Ruqaa 400, Cairo (variable; arabic + latin
 * ranges). The browser downloads a file only when text in its range uses it.
 */
import '@fontsource/anton/latin-400.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/lalezar/arabic-400.css';
import '@fontsource/aref-ruqaa/arabic-400.css';
import '@fontsource-variable/cairo/wght.css';
