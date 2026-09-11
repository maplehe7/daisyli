# Daisy Li website

Live site: https://daisylibroker.com

The approved English/Chinese frontend is in `site/`. `web/` contains the built CSS, JavaScript, images, and vendor files served by GitHub Pages. WordPress links directly to these GitHub-hosted assets.

## Updating the site

1. Edit the frontend in `site/`.
2. Run `node tools/build-release.cjs` and commit the updated `site/` and `web/` files. GitHub Pages serves `web/` from the main branch.
3. For PHP or entry-point HTML changes, zip `wordpress/daisy-site/` after building and upload it through WordPress Plugins > Add Plugin > Upload Plugin.

WordPress Tools > Daisy Li Site controls publication and restoration. Original WordPress pages, the theme, and the IDX wrapper are retained.

## Verification

- `php tools/test-idx.php`: isolated routing and provider contract checks, with no real accounts or messages.
- `node tools/test-idx-tls.cjs`: read-only provider connection and certificate-chain verification.

The provider currently omits certificates needed by file-based TLS stores. `wordpress/daisy-site/idx-ca.pem` contains the official Let's Encrypt YR2 intermediate, Root YR cross-signed by ISRG Root X1, and ISRG Root X1. All signatures are checked by the TLS test. Verification and hostname checks remain enabled, and the bundle is scoped only to this provider connection. Certificate sources: https://letsencrypt.org/certificates/.

Listing inquiries open the visitor's text-message or email application using Daisy's published contact details. Account and saved-property functions use the existing IDX provider. No credentials are included in the repository.
