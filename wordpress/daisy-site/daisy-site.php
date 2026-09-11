<?php
/**
 * Plugin Name: Daisy Li Site
 * Description: Daisy Li's approved website, property search, and account integration.
 * Version: 1.0.0
 * Author: Daisy Li
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) { exit; }
define('DAISY_SITE_VERSION', '1.0.0');
require_once __DIR__ . '/idx-api.php';

function daisy_site_path() { return '/' . trim((string) wp_parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/'); }
function daisy_site_enabled() {
    return get_option('daisy_site_live', false) || (current_user_can('manage_options') && (isset($_GET['daisy_preview']) || !empty($_COOKIE['daisy_site_preview'])));
}
function daisy_site_route($path) {
    return in_array($path, ['/', '/search', '/featured', '/sold', '/about', '/account', '/contact', '/testimonials', '/neighborhoods'], true)
        || preg_match('~^/property/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$~i', $path)
        || preg_match('~^/neighborhoods/(irvine|newport-beach|lake-forest|coto-de-caza)$~', $path);
}
function daisy_site_alias($path) {
    $aliases = ['/about-daisy'=>'/about', '/aboutdaisy'=>'/about', '/aboutdaisy.html'=>'/about', '/245-2'=>'/featured', '/portfolio'=>'/featured', '/portfolio.html'=>'/featured', '/testimonials.html'=>'/testimonials', '/irvine.html'=>'/neighborhoods/irvine', '/newport_beach.html'=>'/neighborhoods/newport-beach', '/lakeforest.html'=>'/neighborhoods/lake-forest', '/cotodecaza.html'=>'/neighborhoods/coto-de-caza'];
    return $aliases[$path] ?? null;
}
add_action('init', function () {
    if (isset($_GET['daisy_preview']) && current_user_can('manage_options')) {
        setcookie('daisy_site_preview', '1', ['expires'=>time()+3600,'path'=>'/','secure'=>is_ssl(),'httponly'=>true,'samesite'=>'Lax']);
    }
});
add_filter('redirect_canonical', function ($redirect) { return daisy_site_enabled() && daisy_site_route(daisy_site_path()) ? false : $redirect; });
add_action('template_redirect', function () {
    if (!daisy_site_enabled()) { return; }
    $alias = daisy_site_alias(daisy_site_path());
    if ($alias) { wp_safe_redirect(home_url($alias) . (isset($_GET['lang']) && in_array($_GET['lang'], ['en','zh'], true) ? '?lang=' . $_GET['lang'] : ''), 301); exit; }
});
add_filter('template_include', function ($template) {
    if (!daisy_site_enabled() || !daisy_site_route(daisy_site_path()) || is_feed()) { return $template; }
    global $wp_query; $wp_query->is_404 = false; status_header(200);
    if (!defined('DONOTCACHEPAGE')) { define('DONOTCACHEPAGE', true); }
    nocache_headers(); header('Vary: Accept-Language, Cookie', false);
    return __DIR__ . '/template.php';
}, 99);
add_action('admin_menu', function () { add_management_page('Daisy Li Site', 'Daisy Li Site', 'manage_options', 'daisy-site', 'daisy_site_admin'); });
function daisy_site_admin() {
    if (!current_user_can('manage_options')) { return; }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        check_admin_referer('daisy_site_publish');
        update_option('daisy_site_live', ($_POST['mode'] ?? '') === 'publish', false);
        wp_cache_flush();
        foreach ([126,245,401] as $id) { clean_post_cache($id); }
        echo '<div class="notice notice-success"><p>Website setting saved.</p></div>';
    }
    $live = get_option('daisy_site_live', false);
    echo '<div class="wrap"><h1>Daisy Li Site</h1><p>Version ' . esc_html(DAISY_SITE_VERSION) . '</p><p>Status: <strong>' . ($live ? 'Published' : 'Private preview') . '</strong></p>';
    echo '<p><a class="button" href="' . esc_url(home_url('/?daisy_preview=1')) . '" target="_blank">Open redesign</a></p>';
    echo '<p><a class="button" href="' . esc_url(admin_url('tools.php?page=daisy-site&daisy_check=1')) . '">Check listing connection</a></p>';
    if (isset($_GET['daisy_check'])) {
        $check=wp_remote_post(Daisy_Site_IDX::ORIGIN.'/idx/webservices/getGlobalInfo.php', ['headers'=>['Accept'=>'application/json','Referer'=>Daisy_Site_IDX::ORIGIN.'/idx/advancedsearch','X-Requested-With'=>'XMLHttpRequest'],'body'=>['action'=>'getGInfoFromCache'],'timeout'=>20,'redirection'=>0,'sslverify'=>true,'sslcertificates'=>__DIR__.'/idx-ca.pem']);
        $report=is_wp_error($check) ? $check->get_error_code().': '.$check->get_error_message() : 'HTTP '.wp_remote_retrieve_response_code($check).' · '.strlen(wp_remote_retrieve_body($check)).' bytes · '.substr(wp_remote_retrieve_body($check),0,250);
        echo '<pre>'.esc_html($report).'</pre>';
    }
    echo '<form method="post">'; wp_nonce_field('daisy_site_publish');
    echo '<button class="button button-primary" name="mode" value="' . ($live ? 'restore' : 'publish') . '">' . ($live ? 'Restore original pages' : 'Publish redesign') . '</button></form>';
    echo '<p>The original WordPress pages and theme remain available. Restoring them here or deactivating this plugin removes the redesign.</p></div>';
}
function daisy_site_language($header) {
    $choices=[];
    foreach (explode(',', (string)$header) as $i=>$entry) {
        $parts=explode(';', trim($entry)); $tag=strtolower(trim(array_shift($parts))); $q=1.0;
        foreach ($parts as $part) { if (preg_match('/^\s*q\s*=\s*(.+)$/i', $part, $match)) { $q=is_numeric($match[1])?(float)$match[1]:0; } }
        if ($q>0 && $q<=1 && preg_match('/^(en|zh)(?:-|$)/', $tag, $match)) { $choices[]=['language'=>$match[1],'quality'=>$q,'index'=>$i]; }
    }
    usort($choices, function($a,$b){return ($b['quality']<=>$a['quality'])?:($a['index']<=>$b['index']);});
    return $choices[0]['language']??'en';
}
