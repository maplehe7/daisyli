'use strict';
const {runInNewContext}=require('node:vm'),{readFileSync}=require('node:fs'),assert=require('node:assert/strict');
const script=readFileSync(require('node:path').join(__dirname,'../script.js'),'utf8');
const id='D2B78D4F-98E6-47DF-9119-F45CD0401611';
function redirect(url){let result=null;const location=new URL(url);location.replace=value=>result=value;runInNewContext(script,{location,URL,URLSearchParams,document:{addEventListener(){}}});return result;}
for(const [path,expected] of [
  ['/idx/advancedsearch','/search'],['/idx/featuredproperties','/featured'],['/idx/soldproperties','/sold'],
  ['/idx/homedetails/2-Havenhurst/'+id+'$detailViewId','/property/'+id],['/myaccount/','/account'],['/idx/savedhomes','/account?tab=homes']
]) assert.equal(redirect('https://search.daisylibroker.com'+path),'https://daisylibroker.com'+expected);
const search=new URL(redirect('https://search.daisylibroker.com/idx/results/123_city/2000000-3000000_price?lang=zh'));
assert.equal(search.searchParams.get('native'),'/123_city/2000000-3000000_price');assert.equal(search.searchParams.get('lang'),'zh');
assert.equal(redirect('https://search.daisylibroker.com/idx/webservices/getListing.php'),null);
assert.equal(redirect('https://daisylibroker.com/wrapperdo-not-delete/'),null);
console.log('Passed 10 legacy URL checks; provider endpoints and WordPress wrapper preserved.');
