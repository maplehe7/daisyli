<?php
if (!defined('ABSPATH')) { exit; }
$html = file_get_contents(__DIR__ . '/public/index.html');
$language = daisy_site_language($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
$html = str_replace('<html lang="en">', '<html lang="' . esc_attr($language) . '" data-request-language="' . esc_attr($language) . '">', $html);
if (daisy_site_path() === '/account') { $html=str_replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', $html); }
// Keep the site's WordPress integrations while the reviewed styles load last.
ob_start(); wp_head(); $head=ob_get_clean();
$head=preg_replace('~<title>.*?</title>~si', '', $head);
$head=preg_replace('~<meta[^>]+name=["\']viewport["\'][^>]*>~i', '', $head);
$head=preg_replace('~<style[^>]*id=["\']wp-admin-bar-inline-css["\'][^>]*>.*?</style>~si', '', $head);
$html=str_replace('<head>', '<head>' . $head, $html);
ob_start(); wp_footer(); $footer=ob_get_clean();
echo str_replace('</body>', $footer . '</body>', $html);
