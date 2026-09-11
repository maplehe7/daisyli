/* Chinese translations of existing interface wording; the biography is user supplied. */
'use strict';
let savedSiteLanguage=null;
for(const name of ['localStorage','sessionStorage']){
  try{const value=window[name].getItem('daisy-site-language');if(['en','zh'].includes(value)){savedSiteLanguage=value;break;}}catch{}
}
let siteLanguage=DaisyLanguage.select({
  explicit:new URLSearchParams(location.search).get('lang'),saved:savedSiteLanguage,
  languages:navigator.languages?.length?navigator.languages:[navigator.language],
  headerLanguage:document.documentElement.dataset.requestLanguage
});
const originalTextNodes=new WeakMap();
const originalAttributes=new WeakMap();
const chineseUI={
  'Portfolio':'房产案例','San Diego':'圣迭戈','Rancho Santa Margarita':'兰乔圣玛格丽塔',
  'Broker':'房地产经纪人','Orange County Real Estate':'橙县房地产','Search':'搜索','Search by Address, City, or ZIP code':'按地址、城市或邮政编码搜索','Address, City, or ZIP code':'地址、城市或邮政编码',
  'Text Me':'发短信联系我','Message on Weixin':'微信联系','Weixin QR code':'微信二维码',"Daisy Li's Weixin QR code":'Daisy Li 的微信二维码','Weixin ID':'微信号','Copy':'复制',
  'Tap to enlarge':'点击放大','Enlarge Weixin QR code':'放大微信二维码','Close QR code':'关闭二维码','Close':'关闭',
  'Skip to content':'跳至内容','DESIGN PREVIEW':'设计预览','Your live site is unchanged.':'正式网站尚未更改。',
  'Daisy Li home':'Daisy Li 首页','Home Search':'房源搜索','Home search':'房源搜索','Featured Homes':'精选房源','Featured homes':'精选房源','Featured Properties':'精选房源','Sold Homes':'已售房源','Sold homes':'已售房源',
  'About Me':'关于 Daisy','About Daisy':'关于 Daisy','Contact Me':'微信联系','Contact':'微信联系','Neighborhoods':'社区介绍','All neighborhoods':'社区介绍','Testimonials':'客户评价','Client testimonial':'客户评价',
  'Turning dream':'让梦想中的家','homes into':'成为','reality':'现实','LEARN MORE':'了解更多','Work With Daisy':'与 Daisy 合作',
  'List with Daisy today and she’ll get you the best deal on your home!':'今天就委托 Daisy 出售房屋，她将为您争取最好的交易！','LET’S CONNECT':'微信联系','Featured Videos':'精选视频',
  'Email / Phone':'邮箱 / 电话','Email':'邮箱','Phone':'电话','Address':'地址','Open Hours':'办公时间','MON-FRI 9AM-5PM':'周一至周五 上午9点至下午5点',
  '© 2025 Daisy Li, Broker. All rights reserved.':'© 2025 Daisy Li, Broker. 版权所有。','DRE #01986831 · Equal Housing Opportunity':'DRE #01986831 · 平等住房机会',
  'Location':'地区','All locations':'所有地区','All four communities':'全部四个社区','Irvine':'尔湾','Newport Beach':'新港海滩','Lake Forest':'森林湖','Coto de Caza':'科托德卡萨','Coto De Caza':'科托德卡萨',
  'Price range':'价格范围','Any price':'不限价格','Up to $1.5M':'150万美元以下','Up to $2.5M':'250万美元以下','Up to $5M':'500万美元以下','Up to $10M':'1,000万美元以下',
  'Bedrooms':'卧室','Bathrooms':'浴室','Any bedrooms':'不限卧室数','Find a home':'搜索房源','Advanced Search':'高级搜索','Minimum price':'最低价格','Maximum price':'最高价格','Property type':'房产类型',
  'Single family home':'独栋住宅','Condo / Townhome':'公寓 / 联排住宅','Other properties':'其他房产','Any':'不限','Tract code':'社区代码','Enter tract code':'输入社区代码','Use exact bedroom count':'精确匹配卧室数',
  'Listing Type':'房源状态','For sale':'在售','Pending / backup offers':'待成交 / 接受备选报价','Sold':'已售','Short sales':'短售','Foreclosures / REO':'法拍 / 银行持有',
  'New or price changed':'新增或调价房源','Sold within':'成交时间','Any time':'不限时间','Today':'今天','Last week':'过去一周','Last month':'过去一个月','Last 3 months':'过去三个月','Last year':'过去一年',
  'OR Search by one of the following':'或使用以下条件搜索','(Cities will be deselected)':'（将取消已选城市）','ZIP code':'邮政编码','Street address':'街道地址','MLS number':'MLS 编号','Enter MLS number':'输入 MLS 编号','e.g. 92602':'例如 92602','e.g. 2 Havenhurst':'例如 2 Havenhurst',
  'More':'更多筛选','Pool':'泳池','No preference':'不限','Has a pool':'有泳池','No pool':'无泳池','Garage':'车库','Year built':'建造年份','Any year':'不限年份','Living area':'室内面积','Any size':'不限面积','Lot size':'地块面积','Stories':'楼层','Keyword':'关键词','e.g. ocean view':'例如 ocean view',
  'Sort by':'排序依据','Price':'价格','Order':'排序','Highest to lowest':'从高到低','Lowest to highest':'从低到高','Only show virtual tours':'仅显示有虚拟看房的房源','Reset filters':'重置筛选','Save this search':'保存搜索','Search homes':'搜索房源',
  'Searches use live listings from Daisy’s Apex IDX. Full property details, maps, saved searches, and email alerts open on the existing IDX site.':'搜索使用 Daisy 的 Apex IDX 实时房源。完整详情、地图、已保存搜索和邮件提醒将在现有 IDX 网站打开。',
  'Loading listings…':'正在加载房源…','Loading live homes…':'正在加载房源…','LIVE IDX RESULTS':'IDX 实时搜索结果','LIVE IDX LISTINGS':'IDX 实时房源','Edit search':'修改搜索','Map & saved searches on IDX ↗':'IDX 地图与已保存搜索 ↗','Full details ↗':'完整详情 ↗','View photos on IDX':'在 IDX 查看照片','Photo unavailable':'暂无照片',
  'Active':'在售','Price Change':'价格调整','Pending':'待成交','Backup Offer':'接受备选报价','Backup Offers':'接受备选报价','New Listing':'新房源',
  'Previous':'上一页','Next':'下一页','Featured order':'默认排序','Price: low to high':'价格从低到高','Price: high to low':'价格从高到低','Filter by city':'按城市筛选','Sort homes':'房源排序','My IDX account ↗':'我的 IDX 账户 ↗',
  'Listings unavailable':'房源暂不可用','Live listings unavailable':'实时房源暂不可用','The live IDX service couldn’t return listings right now.':'IDX 服务暂时无法返回房源。','Try again':'重试','Open Daisy’s IDX search ↗':'打开 Daisy 的 IDX 搜索 ↗','No matching homes':'没有符合条件的房源',
  'No homes match these filters in the current IDX results. Try widening your price or location.':'当前 IDX 搜索结果中没有符合条件的房源。请扩大价格或地区范围。','No homes match these filters right now. Try another location.':'目前没有符合条件的房源。请尝试其他地区。',
  'Apex displays up to 200 homes per search. Narrow your filters to explore more.':'Apex 每次搜索最多显示200套房源。请缩小筛选范围以查看其他房源。','Apex displays up to 200 homes. Use the location filter or home search to narrow your results.':'Apex 最多显示200套房源。请使用地区筛选或房源搜索缩小结果范围。',
  'Listing information & disclosures':'房源信息与声明','View the original IDX listing page and full notices ↗':'查看原始 IDX 房源页面与完整声明 ↗',
  'YOUR HOME SEARCH':'房源搜索','Save search':'保存搜索','Continue to these results on Daisy’s IDX site, then choose':'在 Daisy 的 IDX 网站打开这些结果，然后选择','Save Search':'保存搜索','to sign in and set up email alerts.':'登录并设置邮件提醒。','Continue to IDX ↗':'前往 IDX ↗','Your existing IDX account handles saved searches and alerts.':'您现有的 IDX 账户将管理已保存搜索和提醒。',
  'Open navigation':'打开导航','Close saved search dialog':'关闭保存搜索窗口','Close video':'关闭视频','Play':'播放',
  'Page not found':'页面不存在','Back to home':'返回首页','Property details':'房产详情','Current photos, availability, and property information are on Daisy’s IDX site.':'最新照片、房源状态和房产信息请查看 Daisy 的 IDX 网站。','View property on IDX ↗':'在 IDX 查看房源 ↗'
};
Object.assign(chineseUI,{
  'IDX powered by RealtyTech Inc.':'IDX 技术支持：RealtyTech Inc.',
  'Close navigation':'关闭导航',
  'Previous video':'上一个视频','Next video':'下一个视频','Watch on Vimeo ↗':'在 Vimeo 观看 ↗','Loading video…':'视频加载中…','Video could not load.':'视频无法加载。','Try again':'重试',
  'Main navigation':'主导航','· Client testimonial':'· 客户评价',
  'New':'新房源','Closed':'已成交','Leased':'已出租','Contingent':'附条件成交','Short Sale':'短售','Foreclosure':'法拍房','Reduced':'降价','Price Reduced':'降价','View status':'查看状态',
  'Choose a maximum price greater than or equal to the minimum.':'最高价格必须大于或等于最低价格。',
  'Use one ZIP, street address, or MLS search at a time.':'请一次仅使用邮政编码、街道地址或 MLS 编号中的一种条件搜索。',
  'Choose either new/price-changed homes or recently sold homes.':'请在新增或调价房源与近期已售房源中选择一种。',
  'Choose at least one property type.':'请至少选择一种房产类型。','Choose at least one listing status.':'请至少选择一种房源状态。','Choose one of the available communities.':'请选择列表中的社区。',
  'Daisy Li, Orange County real estate broker':'Daisy Li，橙县房地产经纪人','Irvine neighborhood':'尔湾社区',
  'Daisy Li featured property film':'Daisy Li 精选房产视频','Play Daisy’s featured property film':'播放 Daisy 的精选房产视频','48 Panorama property walkthrough':'48 Panorama 房产视频','48 Panorama · Property walkthrough':'48 Panorama · 房产视频',
  'Coto de Caza · Photography via CRMLS':'科托德卡萨 · 图片来自 CRMLS','2 Havenhurst Drive, a Spanish-style estate in Coto de Caza':'位于科托德卡萨的西班牙风格庄园，2 Havenhurst Drive',
  'Search result pages':'搜索结果页','— Based on information from California Regional Multiple Listing Service, Inc. and/or other sources. All data, including all measurements and calculations of area, is obtained from various sources and has not been, and will not be, verified by broker or MLS. All information should be independently reviewed and verified for accuracy. Properties may or may not be listed by the office/agent presenting the information.':'— 信息来自 California Regional Multiple Listing Service, Inc. 及／或其他来源。所有数据，包括面积的测量和计算，均来自多种来源，经纪人或 MLS 尚未核实，也不会核实。所有信息的准确性均应独立审查和验证。展示信息的机构或经纪人可能并非该房产的挂牌方。',
  '— Based on information from CRISNet MLS. All data, including all measurements and calculations of area, is obtained from various sources and has not been, and will not be, verified by broker or MLS. All information should be independently reviewed and verified for accuracy. Properties may or may not be listed by the office/agent presenting the information.':'— 信息来自 CRISNet MLS。所有数据，包括面积的测量和计算，均来自多种来源，经纪人或 MLS 尚未核实，也不会核实。所有信息的准确性均应独立审查和验证。展示信息的机构或经纪人可能并非该房产的挂牌方。',
  '— This information is deemed reliable but not guaranteed. You should rely on this information only to decide whether or not to further investigate a particular property. Personally investigate the facts, including square footage and lot size, with the assistance of an appropriate professional. Use this information only to identify properties you may be interested in investigating further. All uses except personal, non-commercial use for that purpose are prohibited. Redistribution or copying of this information, photographs or video tours is strictly prohibited. Listings may be held by another brokerage. Listing information and photographs are protected by copyright.':'— 此信息被视为可靠，但不作保证。您应仅用此信息决定是否进一步了解某处房产。请在适当专业人士的协助下，亲自核实包括建筑面积和地块面积在内的事实。此信息仅可用于识别您有兴趣进一步了解的房产，禁止上述目的之外的任何用途，包括任何商业用途。严禁重新分发或复制这些信息、照片或视频。房源可能由其他经纪公司挂牌。房源信息和照片受版权保护。'
});
function zh(text){
  const trimmed=text.trim();
  if(chineseUI[trimmed])return text.replace(trimmed,chineseUI[trimmed]);
  const patterns=[
    [/^Play (.+)$/,(_,title)=>`播放 ${zh(title)}`],
    [/^(.+), (Irvine|Lake Forest|Coto de Caza)$/,(_,address,city)=>`${address}，${chineseUI[city]||city}`],
    [/^(\d+)\+ bedrooms$/,(_,n)=>`${n}间卧室及以上`],
    [/^(\d+)\+ spaces?$/,(_,n)=>`${n}个车位及以上`],
    [/^(\d{4}) or newer$/,(_,n)=>`${n}年及以后`],
    [/^([\d,]+)\+ sq ft$/,(_,n)=>`${n}平方英尺及以上`],
    [/^(\d+)\+ acre$/,(_,n)=>`${n}英亩及以上`],
    [/^(\d+)\+? stor(?:y|ies)$/,(_,n)=>`${n}层${n==='1'?'':'及以上'}`],
    [/^(\d+(?:\.\d+)?) beds$/,(_,n)=>`${n}卧室`],
    [/^(\d+(?:\.\d+)?) baths$/,(_,n)=>`${n}浴室`],
    [/^([\d,]+) sq ft$/,(_,n)=>`${n}平方英尺`],
    [/^([\d,]+) homes?$/,(_,n)=>`${n}套房源`],
    [/^Showing ([\d,]+)–([\d,]+) matching homes\.$/,(_,a,b)=>`显示第${a}–${b}套符合条件的房源。`],
    [/^Page (\d+) of (\d+)$/,(_,a,b)=>`第${a}页，共${b}页`],
    [/^([\d,]+) homes? · Showing ([\d,]+)–([\d,]+)$/,(_,n,a,b)=>`${n}套房源 · 显示第${a}–${b}套`],
    [/^Search (.+) homes$/,(_,city)=>`搜索${chineseUI[city]||city}房源`],
    [/^(.+) homes$/,(_,city)=>`${chineseUI[city]||city}房源`],
    [/^Welcome to (.+)$/,(_,city)=>`欢迎来到${chineseUI[city]||city}`],
    [/^View homes$/,()=> '查看房源'],
    [/^(Irvine|Newport Beach|Lake Forest|Coto [Dd]e Caza), California$/,(_,city)=>`${chineseUI[city]||city}，加州`],
    [/^(Irvine|Newport Beach|Lake Forest|Coto [Dd]e Caza), CA (.*)$/,(_,city,zip)=>`${chineseUI[city]||city}，加州 ${zip}`],
    [/^View and save (.+) on IDX$/,(_,address)=>`在 IDX 查看并保存 ${address}`],
    [/^View (.+)$/,(_,address)=>`查看 ${address}`],
    [/^Live listings retrieved (.+)\. IDX powered by RealtyTech Inc\. · MLS numbers and current details are available on each listing\.$/,(_,date)=>`房源获取时间：${date}。IDX 技术支持：RealtyTech Inc.。各房源提供 MLS 编号和最新详情。`]
  ];
  for(const [pattern,replacement] of patterns)if(pattern.test(trimmed))return text.replace(trimmed,trimmed.replace(pattern,replacement));
  return text;
}
function applyLanguage(container=document.body){
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(node.parentElement?.closest('script,style,[data-language-switch],[data-no-translate]'))continue;
    const saved=originalTextNodes.get(node);
    let original=saved&&node.nodeValue===saved.display?saved.original:node.nodeValue;
    const display=siteLanguage==='zh'?zh(original):original;
    if(display!==node.nodeValue)node.nodeValue=display;
    originalTextNodes.set(node,{original,display});
  }
  for(const element of container.querySelectorAll('[aria-label],[placeholder],[alt],[title]')){
    if(element.closest('[data-language-switch]'))continue;
    let attributes=originalAttributes.get(element)||{};
    for(const name of ['aria-label','placeholder','alt','title']){
      if(!element.hasAttribute(name))continue;
      const current=element.getAttribute(name),old=attributes[name];
      const original=old&&current===old.display?old.original:current;
      const display=siteLanguage==='zh'?zh(original):original;
      element.setAttribute(name,display);attributes[name]={original,display};
    }
    originalAttributes.set(element,attributes);
  }
  document.documentElement.lang=siteLanguage==='zh'?'zh-Hans':'en';
  document.querySelectorAll('[data-site-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.siteLanguage===siteLanguage)));
  const heading=document.querySelector('main h1');if(heading)document.title=(heading.id==='home-title'?(siteLanguage==='zh'?'橙县房地产':'Orange County Real Estate'):heading.textContent)+' · Daisy Li';
}
function rememberLanguageURL(href){const url=new URL(href,location.origin);if(siteLanguage==='zh')url.searchParams.set('lang','zh');else url.searchParams.delete('lang');return url.pathname+url.search+url.hash;}
function setSiteLanguage(language){
  if(!['en','zh'].includes(language))return;
  const changed=language!==siteLanguage;
  siteLanguage=language;savedSiteLanguage=language;
  for(const name of ['localStorage','sessionStorage']){try{window[name].setItem('daisy-site-language',language);}catch{}}
  const current=new URL(location.href);current.searchParams.set('lang',language);history.replaceState({},'',current.pathname+current.search);
  const path=location.pathname;
  if(changed&&(path==='/'||path==='/about'||path==='/testimonials'||path.startsWith('/neighborhoods/')))route();
  else applyLanguage();
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-site-language]');if(button){setSiteLanguage(button.dataset.siteLanguage);window.DaisyLanguagePrompt?.close();}});
