<?php
// Isolated contract checks: no network calls or real messages/accounts are created.
define('ABSPATH', __DIR__);
$transients=[]; $options=[]; $requests=[]; $responses=[]; $checks=0;
function add_action(...$args) {} function add_filter(...$args) {}
function get_transient($key){return $GLOBALS['transients'][$key]??false;}
function set_transient($key,$value,$ttl){$GLOBALS['transients'][$key]=$value;return true;}
function delete_transient($key){unset($GLOBALS['transients'][$key]);}
function get_option($key,$default=false){return $GLOBALS['options'][$key]??$default;}
function add_option($key,$value,...$args){if(isset($GLOBALS['options'][$key]))return false;$GLOBALS['options'][$key]=$value;return true;}
function delete_option($key){unset($GLOBALS['options'][$key]);}
function wp_salt($scheme){return 'local-contract-fixture';}
function wp_json_encode($value){return json_encode($value);}
function is_ssl(){return true;}
function is_email($value){return filter_var($value,FILTER_VALIDATE_EMAIL)!==false;}
function home_url($path=''){return 'https://daisylibroker.com'.$path;}
function wp_parse_url(...$args){return parse_url(...$args);}
function is_wp_error($response){return false;}
function esc_url($value){return htmlspecialchars($value,ENT_QUOTES);}
function esc_html($value){return htmlspecialchars($value,ENT_QUOTES);}
function wp_remote_post($url,$args){
    $GLOBALS['requests'][]=[$url,$args];
    if(!$GLOBALS['responses'])throw new LogicException('Unexpected upstream request: '.$url);
    return array_shift($GLOBALS['responses']);
}
function wp_remote_retrieve_response_code($r){return $r['status']??200;}
function wp_remote_retrieve_headers($r){return $r['headers']??[];}
function wp_remote_retrieve_body($r){return is_string($r['body'])?$r['body']:json_encode($r['body']);}
class WP_REST_Response {
    public $data; public $status; public $headers=[];
    function __construct($data,$status){$this->data=$data;$this->status=$status;}
    function header($name,$value){$this->headers[$name]=$value;}
}
class FixtureRequest extends ArrayObject {
    function __construct($action,public $params=[],public $method='POST',public $origin='https://daisylibroker.com'){parent::__construct(['action'=>$action]);}
    function get_method(){return $this->method;}
    function get_header($name){return $this->origin;}
    function get_body(){return json_encode($this->params);}
    function get_json_params(){return $this->params;}
    function get_query_params(){return $this->params;}
}
require __DIR__.'/../wordpress/daisy-site/daisy-site.php';
function check($truth,$message){if(!$truth)throw new RuntimeException($message);$GLOBALS['checks']++;}
function call_api($action,$body=[],$method='POST',$origin='https://daisylibroker.com'){return (new Daisy_Site_IDX())->handle(new FixtureRequest($action,$body,$method,$origin));}
function reply_with($body,$headers=[],$status=200){$GLOBALS['responses'][]=compact('body','headers','status');}
function last_params(){return $GLOBALS['requests'][count($GLOBALS['requests'])-1][1]['body'];}
function state_key(){foreach($GLOBALS['transients'] as $key=>$state){if(str_starts_with($key,'daisy_s_')&&!empty($state['user']))return $key;}return null;}
$id='D2B78D4F-98E6-47DF-9119-F45CD0401611';
check(call_api('account/login',['username'=>'fixture@example.com','password'=>'fake'],'POST','https://foreign.example')->status===403,'Reject foreign-origin writes');
check(call_api('account/delete',[],'GET')->status===405,'Reject mutation GET');
check(call_api('account/saved-home',['id'=>$id])->status===401,'Require verified login');
check(call_api('listings',['pageType'=>'savedhomes'])->status===401,'Saved homes are private');
check(call_api('property',['id'=>'../../secret'])->status===404,'Validate property IDs');
check(call_api('inquiry')->status===409,'Retired inquiry never sends');
check(count($requests)===0,'Invalid requests never reach provider');
reply_with(['properties'=>[]]);
check(call_api('listings',['query'=>'/Irvine/8_p','page'=>2,'map'=>true])->status===200,'Public search succeeds');
check(last_params()['queryString']==='/Irvine/2_p'&&last_params()['fetchMapData']==='yes','Native search paging and map contract');
check(!isset($requests[0][1]['headers']['Cookie']),'Public search does not forward account cookies');
$before=count($requests);call_api('listings',['query'=>'/Irvine/8_p','page'=>2,'map'=>true]);
check(count($requests)===$before,'Repeated public search uses cache');
reply_with([['ID'=>$id,'addressA'=>'2 Havenhurst Drive']]);
check(call_api('property',['id'=>$id])->data[0]['ID']===$id,'Property detail shape preserved');
$token=str_repeat('a',48);$_COOKIE['daisy_live_session']=$token;$old='daisy_s_'.hash('sha256',$token);
$transients[$old]=['cookies'=>[],'user'=>null,'saved'=>[],'social'=>[],'searchIds'=>[]];
reply_with(['code'=>200,'data'=>['userInfo'=>['id'=>'verified-user','email'=>'fixture@example.com','firstName'=>'测试'],'SavedHomes'=>[$id]]],['set-cookie'=>['PHPSESSID=fixture-only; Path=/; HttpOnly']]);
$login=call_api('account/login',['username'=>'fixture@example.com','password'=>'fake-password-never-store']);
check($login->status===200&&$login->data['user']['id']==='verified-user','Accept provider-confirmed user');
check(!isset($transients[$old]),'Rotate session after authentication');
$new=state_key();check($new!==null&&!str_contains(json_encode($transients),'fake-password-never-store'),'Password is not retained');
check($transients[$new]['cookies']['PHPSESSID']==='fixture-only','Keep upstream cookie separately');
// Attach the fixture browser token to the rotated state without depending on PHP headers.
$transients[$old]=$transients[$new];unset($transients[$new]);
reply_with(['code'=>200]);
call_api('account/saved-home',['id'=>$id,'userId'=>'attacker-selected-id','remove'=>true]);
check(last_params()['userId']==='verified-user','Derive account identity from verified session');
check(call_api('session',[],'GET')->data['saved']===[],'Saved-home change is reflected in session');
check(call_api('account/delete-search',['id'=>'999'])->status===404,'Reject unowned saved search');
reply_with('PHP warning fixture {"current":1,"rowCount":20,"rows":[{"id":"17"}],"total":1}');
check(call_api('account/searches',[],'GET')->data['rows'][0]['id']==='17','Parse provider prefixed saved-search response');
reply_with(['status'=>'yes']);
check(call_api('account/delete-search',['id'=>'17'])->status===200,'Permit a returned account search');
$social=call_api('account/social/start',['provider'=>'google']);
check($social->status===200&&str_starts_with($social->data['url'],'https://apexidx.com/custom/googleLogin/?uniqId='),'Keep original Google provider');
check(call_api('account/social/complete',['provider'=>'facebook','attempt'=>$social->data['attempt']])->status===400,'Social attempt is provider-bound');
check(call_api('account/social/complete',['provider'=>'google','attempt'=>'foreign'])->status===400,'Reject foreign social attempt');
check(call_api('account/delete')->status===400,'Account deletion requires explicit confirmation');
check(call_api('account/logout')->data['user']===null&&call_api('session',[],'GET')->data['saved']===[],'Logout clears private state');
check($options===[],'Account locks are released');
check(daisy_site_language('zh-CN;q=0.9,en-US;q=0.5')==='zh'&&daisy_site_language('zh;q=0,en;q=0.8')==='en','Respect Accept-Language quality');
check(daisy_site_route('/neighborhoods/coto-de-caza')&&daisy_site_route('/property/'.$id)&&!daisy_site_route('/wrapperdo-not-delete'),'Serve app routes without replacing IDX wrapper');
check(daisy_site_alias('/about-daisy')==='/about','Keep old WordPress page links working');
check($responses===[],'All mocked upstream responses consumed');
echo "Passed $checks isolated production API and routing checks. No network calls were made.\n";
