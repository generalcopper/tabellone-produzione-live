// Render the existing LG logo into opaque app icons. No new logo or external assets.
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory='public/minimal-originale/warehouse-assets';
const logo=(await readFile(directory+'/lgtrading-logo-CtixND30.png')).toString('base64');
await mkdir(directory+'/icons',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for(const size of [180,192,512]){
    const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<html><head><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#1b2c38}body{display:grid;place-items:center}.logo{width:72%;aspect-ratio:512/426;background:#f18359;mask:url(data:image/png;base64,${logo}) center/contain no-repeat}</style></head><body><div class="logo"></div></body></html>`);
    // Explicitly wait for the source image before rasterising the CSS mask.
    await page.evaluate(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=src;}),'data:image/png;base64,'+logo);
    await page.screenshot({path:directory+'/icons/lg-app-icon-'+size+'.png'});
    await page.close();
  }
}finally{await browser.close();}
