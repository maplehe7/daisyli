'use strict';
const fs=require('node:fs'), https=require('node:https'), {X509Certificate}=require('node:crypto');
const ca=fs.readFileSync(require('node:path').join(__dirname,'../wordpress/daisy-site/idx-ca.pem'),'utf8');
const certificates=ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g).map(pem=>new X509Certificate(pem));
if(certificates.length!==3 || !certificates[0].verify(certificates[1].publicKey) || !certificates[1].verify(certificates[2].publicKey) || certificates[2].fingerprint256!=='96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6') throw Error('Invalid provider CA chain');
const request=https.request('https://search.daisylibroker.com/idx/webservices/getGlobalInfo.php',{method:'POST',ca,headers:{'Content-Type':'application/x-www-form-urlencoded'}},response=>{
  let body=''; response.on('data',chunk=>body+=chunk);response.on('end',()=>{if(response.statusCode!==200||!JSON.parse(body))throw Error('Provider unavailable');console.log('Official CA chain verified; provider returned JSON over verified HTTPS.');});
});
request.on('error',error=>{console.error(error);process.exitCode=1;});request.end('action=getGInfoFromCache');
