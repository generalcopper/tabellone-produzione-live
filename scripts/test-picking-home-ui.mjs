// Browser integration against the actual Picking document, with a read-only inventory fixture.
// All network requests are intercepted; no production stock is read or written.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'), origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
let html=await readFile(root+'/picking.html','utf8');
assert.equal(html.split('    initFirebase();').length,2);
const fixture = `
    state.user={uid:'home-fixture',isWhitelisted:true,isAdmin:true};
    state.authGateState='signed_in';
    state.inventory.concamarise.meta={loaded:true,count:2};
    state.inventory.concamarise.items=[
      {sku:'TEST-SKU',title:'Prodotto prova <img src=x onerror=alert(1)>',qty:100,stockLots:[{lot:'LOTTO-20261104',qty:100}],rackAllocations:[{code:'C00-L1-P1',lot:'LOTTO-20261104',qty:20},{code:'C00-L3-P3',lot:'LOTTO-20261104',qty:40}],cereaAllocations:[{lot:'LOTTO-20261104',qty:10}]},
      {sku:'GROUND',title:'Prodotto nella stanza',qty:50,stockLots:[{lot:'LOTTO-20261103',qty:50}],rackAllocations:[{code:'G03-L1-P2',lot:'LOTTO-20261103',qty:50}]}
    ];
    state.pickingPreview.fbm={loaded:true,count:3};
    state.pickingPreview.fba={loaded:true,count:2};
    document.documentElement.classList.remove('bootCold');
    document.getElementById('authOverlay').style.display='none';
    window.__homeTest={state,render:()=>{invalidateInventoryRuntimeCaches('fixture');renderHomeDashboard();},navigate:setPickingHomeView};
    renderHomeDashboard();
`;
html=html.replace('    initFirebase();',fixture);
const browser=await chromium.launch({headless:true,channel:'chrome'});
let requests=0;
try{
  for(const width of [1440,390,768]){
    const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      requests++;
      const url=new URL(route.request().url());
      if(url.origin!==origin)return route.fulfill({status:200,body:''});
      const file=resolve(root,'.'+url.pathname);assert.ok(file.startsWith(root+'/'));
      try{return route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream',body:file.endsWith('/picking.html')?html:await readFile(file)});}catch{return route.fulfill({status:404,body:''});}
    });
    await page.goto(origin+'/picking.html');
    await page.locator('#phTotal').filter({hasText:'150 pz'}).waitFor();
    assert.equal(await page.locator('#homeOverviewBox.is-active').count(),1);
    assert.equal(await page.locator('#phUnlocated').innerText(),'40 pz');
    assert.equal(await page.locator('#phCerea').innerText(),'10 pz');
    assert.equal(await page.locator('[data-home-bay]').count(),27);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow at '+width);
    await page.locator('#phBaySelect').selectOption('C00');
    assert.equal(await page.locator('.ph-slot').count(),9);
    assert.equal(await page.locator('.ph-product').count(),2);
    assert.equal(await page.locator('.ph-product img').count(),0,'untrusted product names are plain text');
    await page.locator('[data-ph-level="L3"]').click();
    assert.equal(await page.locator('.ph-slot').count(),3);
    await page.locator('[data-ph-product="TEST-SKU"]').click();
    await page.locator('#sheetProductDetails.show').waitFor();
    assert.ok((await page.locator('#productDetailsContent').textContent()).includes('Ubicazioni assegnate'));
    assert.equal(await page.locator('.ph-target-allocation[data-old-code="C00-L3-P3"]').count(),1);
    assert.equal(await page.locator('[data-action="pdDeleteRackAlloc"]').count(),3,'same existing removal controls');
    assert.equal(await page.locator('[data-action="pdSaveRackAlloc"]').count(),3,'same existing move controls');
    await page.locator('#btnCloseProductDetails').click();
    // Mimic the normal cloud snapshot after a move, then a removal, without writing stock.
    await page.evaluate(()=>{const s=window.__homeTest.state;s.inventory.concamarise.items[0].rackAllocations=[{code:'C00-L1-P1',lot:'LOTTO-20261104',qty:20},{code:'A01-L2-P1',lot:'LOTTO-20261104',qty:40}];window.__homeTest.render();});
    await page.waitForFunction(()=>document.querySelectorAll('.ph-product').length===0);
    await page.locator('#phBaySelect').selectOption('A01');
    assert.equal(await page.locator('.ph-product').count(),1);
    await page.evaluate(()=>{window.__homeTest.state.inventory.concamarise.items[0].rackAllocations=[];window.__homeTest.render();});
    await page.waitForFunction(()=>document.querySelector('#phUnlocated').textContent==='100 pz');
    assert.equal(await page.locator('.ph-product').count(),0);
    await page.locator('#phBaySelect').selectOption('G03');
    assert.equal(await page.locator('.ph-slot').count(),2);
    assert.equal(await page.locator('[data-ph-level="L2"]').count(),0,'G has no phantom upper levels');
    await page.locator('#phSearch').fill('nessun-risultato');
    await page.locator('#phSearchFeedback').filter({hasText:'Nessuna campata trovata'}).waitFor();
    await page.locator('#phSearch').fill('GROUND');
    await page.locator('#phSearchFeedback').filter({hasText:'1 campata trovata'}).waitFor();
    await page.locator('#phSearch').fill('');
    await page.locator('[data-ph-view="noLocation"]').click();
    assert.equal(await page.locator('#homeNoLocationBox.is-active').count(),1);
    await page.evaluate(()=>window.__homeTest.navigate('home'));
    await page.locator('[data-home-bay="G03"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#phBaySelect').inputValue(),'G03');
    await page.locator('[data-ph-zoom="in"]').click();
    assert.equal(await page.locator('#phZoomValue').innerText(),'125%');
    await page.locator('[data-ph-zoom="reset"]').click();
    // Unknown data must never become a misleading empty warehouse.
    await page.evaluate(()=>{window.__homeTest.state.inventory.concamarise.meta.loaded=false;window.__homeTest.render();});
    await page.waitForFunction(()=>document.querySelector('#phTotal').textContent==='—');
    assert.equal(await page.locator('.ph-product').count(),0);
    await page.evaluate(()=>{window.__homeTest.state.inventory.concamarise.meta.loaded=true;window.__homeTest.render();});
    await page.waitForFunction(()=>document.querySelector('#phTotal').textContent==='150 pz');
    await page.screenshot({path:'/tmp/picking-home-'+width+'.png',fullPage:true});
    await page.evaluate(()=>{window.__homeTest.state.user=null;window.__homeTest.render();});
    await page.waitForFunction(()=>document.querySelector('#phTotal').textContent==='—');
    assert.equal(await page.locator('.ph-product').count(),0,'sign-out clears the visible warehouse');
    assert.deepEqual(errors,[],'runtime errors at '+width);
    await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify({passed:true,widths:[1440,390,768],existingModal:true,liveWrites:0,interceptedRequests:requests,cloudMovesAndRemoval:true,keyboard:true,unknownAndSignout:true}));
