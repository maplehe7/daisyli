<?php
if (!defined('ABSPATH')) { exit; }

final class Daisy_Site_IDX {
    const ORIGIN = 'https://search.daisylibroker.com';
    const TYPES = ['results','featuredproperties','soldproperties','newlistings','openhouses','listingalerts','pricechange','soldlistings','savedhomes','featuredoffices'];
    private $state = ['cookies'=>[], 'user'=>null, 'saved'=>[], 'social'=>[], 'searchIds'=>[]];
    private $session_key = null;
    private $lock_key = null;
    private $dirty = false;

    private function fail($message, $status=400) { throw new RuntimeException($message, $status); }
    private function text($value, $max=250) {
        if (!is_scalar($value)) { return ''; }
        $text=trim((string)$value);
        if (function_exists('mb_substr')) { return mb_substr($text, 0, $max, 'UTF-8'); }
        $characters=preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
        return is_array($characters) ? implode('', array_slice($characters, 0, $max)) : '';
    }
    private function guid($id) { return is_string($id) && preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i', $id); }
    private function email($value) { $email=$this->text($value); if (!is_email($email)) { $this->fail('Please enter a valid email address.'); } return $email; }
    private function user() { if (empty($this->state['user']['id'])) { $this->fail('Please sign in.', 401); } return (string)$this->state['user']['id']; }
    private function new_session() {
        $token=bin2hex(random_bytes(24)); $this->session_key='daisy_s_' . hash('sha256', $token); $this->dirty=true;
        setcookie('daisy_live_session', $token, ['expires'=>time()+7200,'path'=>'/','secure'=>is_ssl(),'httponly'=>true,'samesite'=>'Strict']);
    }
    private function session($create) {
        $token=$_COOKIE['daisy_live_session']??'';
        if (is_string($token) && preg_match('/^[a-f0-9]{48}$/', $token)) {
            $key='daisy_s_' . hash('sha256', $token); $value=get_transient($key);
            if (is_array($value)) { $this->session_key=$key; $this->state=array_merge($this->state,$value); }
        }
        if (!$this->session_key && $create) { $this->new_session(); }
    }
    private function lock() {
        if (!$this->session_key) { return; }
        $key='daisy_l_' . substr($this->session_key,8);
        if (!add_option($key, time(), '', false)) {
            if ((int)get_option($key) < time()-60) { delete_option($key); }
            if (!add_option($key,time(),'',false)) { $this->fail('Please try again.',429); }
        }
        $this->lock_key=$key;
        $fresh=get_transient($this->session_key); if (is_array($fresh)) { $this->state=array_merge($this->state,$fresh); }
    }
    private function rate_limit($action) {
        $limits=['account/login'=>30,'account/signup'=>5,'account/forgot'=>5,'email-property'=>8];
        if (!isset($limits[$action])) { return; }
        $key='daisy_r_' . hash_hmac('sha256',$action.'|'.($_SERVER['REMOTE_ADDR']??''),wp_salt('auth'));
        $count=(int)get_transient($key); if ($count >= $limits[$action]) { $this->fail('Please try again later.',429); }
        set_transient($key,$count+1,600);
    }
    private function upstream($endpoint,$params,$with_session=true) {
        $headers=['Accept'=>'application/json','Referer'=>self::ORIGIN.'/idx/advancedsearch','X-Requested-With'=>'XMLHttpRequest'];
        if ($with_session && $this->state['cookies']) { $parts=[];foreach($this->state['cookies'] as $key=>$value){$parts[]=$key.'='.$value;}$headers['Cookie']=implode('; ',$parts); }
        $response=wp_remote_post(self::ORIGIN.$endpoint,['headers'=>$headers,'body'=>$params,'timeout'=>20,'redirection'=>0,'limit_response_size'=>16*1024*1024,'sslverify'=>true,'sslcertificates'=>__DIR__.'/idx-ca.pem']);
        if (is_wp_error($response)) { $this->fail('Temporarily unavailable. Please try again.',502); }
        $status=(int)wp_remote_retrieve_response_code($response);
        if ($status>=300 && $status<400) { $this->fail('Please sign in again.',401); }
        if ($status<200 || $status>=300) { $this->fail('Temporarily unavailable. Please try again.',502); }
        if ($with_session) {
            $response_headers=wp_remote_retrieve_headers($response);
            foreach ((array)($response_headers['set-cookie']??[]) as $cookie) {
                $first=explode(';',(string)$cookie,2)[0]; $pair=explode('=',$first,2);
                if(count($pair)===2 && preg_match('/^[a-z0-9_.-]+$/i',$pair[0]) && !preg_match('/[\r\n]/',$pair[1])){$this->state['cookies'][$pair[0]]=$pair[1];$this->dirty=true;}
            }
        }
        $body=trim(preg_replace('/^\xEF\xBB\xBF/','',wp_remote_retrieve_body($response)));$value=json_decode($body,true);
        if (json_last_error()===JSON_ERROR_NONE && is_array($value)) { return $value; }
        if (strpos($endpoint,'getUserSearchesOnAjaxCallForBootGrid')!==false && preg_match_all('/\{\s*"(?:current|rowCount|rows|total)"\s*:/',$body,$matches,PREG_OFFSET_CAPTURE)) {
            foreach($matches[0] as $match){$value=json_decode(substr($body,$match[1],strrpos($body,'}')-$match[1]+1),true);if(is_array($value)&&isset($value['rows'])&&is_array($value['rows'])&&is_numeric($value['total']??null)){return $value;}}
        }
        $this->fail('Temporarily unavailable. Please try again.',502);
    }
    private function cached($key,$ttl,$load) {
        $key='daisy_c_'.hash('sha256',$key);$value=get_transient($key);if($value!==false){return $value;}
        $value=$load();set_transient($key,$value,$ttl);return $value;
    }
    private function clean($value) {
        if (!is_array($value)) { $this->fail('Please try again.',502); }
        if (($value['status']??'')==='no' || ((int)($value['code']??0)!==200 && ($value['status']??'')!=='yes')) { $this->fail($this->text($value['message']??'Please check your information and try again.',500)); }
        return $value;
    }
    private function sync_visitor() {
        $user=$this->state['user'];
        $this->state['cookies']['visitorStatus']=rawurlencode(wp_json_encode(['id'=>$user['id'],'email'=>$user['email'],'name'=>$user['firstName']??'']));
        $this->state['cookies']['visitorSavedHomes']=rawurlencode(wp_json_encode(array_values($this->state['saved'])));$this->dirty=true;
    }
    private function accept_user($result,$fallback=[]) {
        $user=$result['data']['userInfo']??null;if(empty($user['id'])){$this->fail('Please check your email and password.');}
        $this->state['user']=['id'=>(string)$user['id'],'email'=>$this->text($user['email']??$fallback['username']??''),'firstName'=>$this->text($user['firstName']??$fallback['name']??''),'lastName'=>$this->text($user['lastName']??''),'phone'=>$this->text($user['phone']??$fallback['phone']??'',50)];
        $this->state['saved']=array_values(array_filter($result['data']['SavedHomes']??[],fn($id)=>$this->guid($id)));$this->state['searchIds']=[];
        $old=$this->session_key;$this->new_session();if($old){delete_transient($old);}$this->sync_visitor();
        return ['user'=>$this->state['user'],'saved'=>$this->state['saved']];
    }
    private function listings($body) {
        $type=in_array($body['pageType']??'',self::TYPES,true)?$body['pageType']:'results';if($type==='savedhomes'){$this->user();}
        $page=max(1,min(10,(int)($body['page']??1)));$query=preg_replace('~/\d+_p/?$~','',$this->text($body['query']??'',5000));
        $params=['queryString'=>$query.'/'.$page.'_p','pageType'=>$type,'searchName'=>'','isAutosearchCity'=>'','areaBuildingName'=>'','areaName'=>'','fetchMapData'=>in_array($body['map']??false,[true,'true'],true)?'yes':'no','action'=>'getListing'];
        $load=fn()=>$this->upstream('/idx/webservices/getListing.php',$params,$type==='savedhomes');
        return $type==='savedhomes'?$load():$this->cached('list:'.wp_json_encode($params),30,$load);
    }
    private function property($body) {
        $id=$body['id']??'';if(!$this->guid($id)){$this->fail('Property not found.',404);}
        $data=$this->cached('property:'.strtoupper($id),60,fn()=>$this->upstream('/idx/webservices/getDetail.php',['id'=>$id,'openHid'=>$this->text($body['openHid']??''),'action'=>'getSinglePropertyDetail'],false));
        if(empty($data[0])){$this->fail('Property not found.',404);}return $data;
    }
    private function dispatch($action,$body) {
        if($action==='listings'){return $this->listings($body);}
        if($action==='cities'){return $this->cached('cities',3600,fn()=>$this->upstream('/idx/webservices/getGlobalInfo.php',['action'=>'getGInfoFromCache'],false));}
        if($action==='property'){return $this->property($body);}
        if($action==='session'){return ['user'=>$this->state['user'],'saved'=>$this->state['saved']];}
        if($action==='inquiry'){$this->fail('Please reload the page.',409);}
        if($action==='account/social/start'){
            $provider=$body['provider']??'';if(!in_array($provider,['google','facebook'],true)){$this->fail('Please choose a sign-in option.');}
            $this->state['social']=array_filter($this->state['social'],fn($attempt)=>$attempt['expires']>time());if(count($this->state['social'])>=8){array_shift($this->state['social']);}
            $id=bin2hex(random_bytes(24));$this->state['social'][$id]=['provider'=>$provider,'expires'=>time()+600];$this->dirty=true;
            return ['attempt'=>$id,'url'=>'https://apexidx.com/custom/'.($provider==='google'?'googleLogin':'facebookLogin').'/?uniqId='.$id];
        }
        if($action==='account/social/complete'){
            $provider=$body['provider']??'';$id=$this->text($body['attempt']??'');$attempt=$this->state['social'][$id]??null;
            if(!$attempt||!in_array($provider,['google','facebook'],true)||$attempt['provider']!==$provider||$attempt['expires']<time()){$this->fail('Please try signing in again.');}
            $result=$this->clean($this->upstream('/idx/webservices/'.($provider==='google'?'getGoogleResponse.php':'getfbResponse.php'),['action'=>$provider==='google'?'processGoogle':'processFB','fileName'=>$id,'isSendUserCreateEmail'=>'no']));
            unset($this->state['social'][$id]);return $this->accept_user($result);
        }
        if(in_array($action,['account/login','account/signup'],true)){
            $username=$this->email($body['username']??'');$password=$body['password']??'';
            if(!is_string($password)||!strlen($password)||strlen($password)>200){$this->fail('Please enter your password.');}
            if($action==='account/signup'&&strlen($password)<4){$this->fail('Use at least 4 characters for your password.');}
            $result=$this->clean($this->upstream('/myaccount/login.php?action=checkAction',['action'=>$action==='account/signup'?'signup':'login','username'=>$username,'password'=>$password,'name'=>$this->text($body['name']??''),'phone'=>$this->text($body['phone']??'',50),'loginType'=>'website']));
            if($action==='account/signup'&&($result['userExist']??'')==='yes'){$this->fail('An account already exists with that email. Please sign in.');}
            return $this->accept_user($result,$body);
        }
        if($action==='account/logout'){$this->state=['cookies'=>[],'user'=>null,'saved'=>[],'social'=>[],'searchIds'=>[]];$this->dirty=true;return ['user'=>null,'saved'=>[]];}
        if($action==='account/forgot'){$result=$this->upstream('/myaccount/login.php?action=checkUserExist',['username'=>$this->email($body['username']??'')]);if(($result['status']??'')==='no'){$this->fail($this->text($result['message']??'Please try again.',500));}return ['ok'=>true];}
        if($action==='account/saved-home'){
            $user=$this->user();$id=$body['id']??'';if(!$this->guid($id)){$this->fail('Property not found.',404);}$remove=($body['remove']??false)===true;
            $this->clean($this->upstream('/idx/webservices/visitorStatus.php',['action'=>$remove?'deleteSingleProperty':'saveSingleProperty','MlsNum'=>$this->text($body['mls']??''),'proId'=>$id,'userId'=>$user]));
            $this->state['saved']=array_values(array_filter($this->state['saved'],fn($saved)=>strtoupper($saved)!==strtoupper($id)));if(!$remove){$this->state['saved'][]=$id;}$this->sync_visitor();return ['saved'=>$this->state['saved']];
        }
        if($action==='account/searches'){
            $data=$this->upstream('/myaccount/index.php?action=getUserSearchesOnAjaxCallForBootGrid',['userId'=>$this->user(),'current'=>max(1,(int)($body['page']??1)),'rowCount'=>20,'searchPhrase'=>'']);
            foreach($data['rows']??[] as $row){$this->state['searchIds'][(string)$row['id']]=true;}$this->dirty=true;return $data;
        }
        if($action==='account/save-search'){
            $user=$this->user();$name=$this->text($body['name']??'',100);if(!$name){$this->fail('Enter a search name.');}
            $type=in_array($body['pageType']??'',self::TYPES,true)?$body['pageType']:'results';$frequency=(string)($body['frequency']??'1');
            $params=['action'=>empty($body['searchId'])?'saveSearch':'updateSearch','id'=>$user,'searchName'=>$name,'emailFreq'=>in_array($frequency,['0','1','2','7','30'],true)?$frequency:'1','receiveEmail'=>!empty($body['receiveEmail'])?'1':'0','url'=>$type.$this->text($body['query']??'',5000)];
            if(!empty($body['searchId'])){$id=$this->text($body['searchId'],40);if(empty($this->state['searchIds'][$id])){$this->fail('Search not found.',404);}$params['searchId']=$id;}
            return $this->clean($this->upstream('/idx/webservices/visitorStatus.php',$params));
        }
        if($action==='account/delete-search'){
            $this->user();$id=$this->text($body['id']??'');if(!ctype_digit($id)||empty($this->state['searchIds'][$id])){$this->fail('Search not found.',404);}
            $result=$this->clean($this->upstream('/myaccount/index.php?action=deleteSearch',['id'=>$id]));unset($this->state['searchIds'][$id]);$this->dirty=true;return $result;
        }
        if($action==='account/delete'){
            $user=$this->user();if(($body['confirm']??false)!==true){$this->fail('Please confirm account deletion.');}
            $this->clean($this->upstream('/myaccount/index.php?action=deleteUser',['userId'=>$user]));$this->state=['cookies'=>[],'user'=>null,'saved'=>[],'social'=>[],'searchIds'=>[]];$this->dirty=true;return ['user'=>null,'saved'=>[]];
        }
        if($action==='email-property'){
            $property=$this->property($body)[0];$recipients=array_map(fn($address)=>$this->email($address),explode(',',$this->text($body['to']??'',1500)));if(count($recipients)>10){$this->fail('Enter up to 10 email addresses.');}
            $name=$this->text($body['name']??'',100);if(!$name){$this->fail('Enter your name.');}
            $url=home_url('/property/'.$body['id']);$info='<p><a href="'.esc_url($url).'">'.esc_html($property['addressA']??$property['address']??'').'</a></p><p>'.esc_html($property['addressB']??$property['CityName']??'').'</p><p>$'.esc_html($property['listprice']??'').' · MLS #'.esc_html($property['MLS_NUM']??'').'</p>';
            return $this->clean($this->upstream('/idx/webservices/visitorStatus.php',['action'=>'sendEmailToFriend','sendTo'=>implode(',',$recipients),'sendFrom'=>$this->email($body['email']??''),'apexidx-a-your-name'=>$name,'message'=>$this->text($body['message']??'',4000),'proInfo'=>$info]));
        }
        $this->fail('Page not found.',404);
    }
    public function handle($request) {
        $status=200;$data=[];
        try {
            $action=(string)$request['action'];$method=$request->get_method();
            if($method==='POST' && rtrim((string)$request->get_header('origin'),'/')!==rtrim(home_url(),'/')){$this->fail('Please reload the page.',403);}
            if($method!=='POST'&&!in_array($action,['listings','cities','property','session','account/searches'],true)){$this->fail('Method not allowed.',405);}
            if(strlen($request->get_body())>32768){$this->fail('The form is too long.',413);}
            $body=$method==='POST'?$request->get_json_params():$request->get_query_params();if(!is_array($body)){$this->fail('Please check the form.');}
            $this->rate_limit($action);$account=strpos($action,'account/')===0;$this->session($account||$action==='session');
            if($account){$this->lock();}
            $data=$this->dispatch($action,$body);
        } catch (RuntimeException $error) { $status=$error->getCode()>=400&&$error->getCode()<600?$error->getCode():500;$data=['error'=>$error->getMessage()]; }
          catch (Throwable $error) { $status=502;$data=['error'=>'Temporarily unavailable. Please try again.']; }
        finally {
            if($this->dirty&&$this->session_key){set_transient($this->session_key,$this->state,7200);}
            if($this->lock_key){delete_option($this->lock_key);}
        }
        $response=new WP_REST_Response($data,$status);$response->header('Cache-Control','no-store, private');$response->header('X-Content-Type-Options','nosniff');return $response;
    }
}
add_action('rest_api_init',function(){register_rest_route('daisy/v1','/idx/(?P<action>[a-z]+(?:/[a-z-]+){0,2})',['methods'=>['GET','POST'],'permission_callback'=>'__return_true','callback'=>function($request){return (new Daisy_Site_IDX())->handle($request);}]);});
