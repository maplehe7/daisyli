=== Daisy Li Site ===
Contributors: maplehe7
Requires PHP: 8.0
Stable tag: 1.0.1

Daisy Li's reviewed English and Chinese website with the existing property-search provider.

== Installation ==
Build the public assets with `node tools/build-release.cjs`, then zip the `wordpress/daisy-site` folder.
Upload the ZIP in WordPress Plugins > Add Plugin > Upload Plugin and activate it.
Open Tools > Daisy Li Site to preview the redesign, publish it, or restore the original pages.

The original WordPress theme and page records remain intact. The IDX wrapper page remains intact.
Search-account sessions use a separate secure cookie and expire after two hours.
Listing inquiries open the visitor's texting or email application; they are not submitted to WordPress.

== Source ==
The reviewed frontend is maintained under `site/` in https://github.com/maplehe7/daisyli.
Generated plugin assets are built from that directory.
