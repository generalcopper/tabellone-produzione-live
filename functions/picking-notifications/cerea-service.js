'use strict';
const {isCereaProduction, automaticCereaAllocations, sameCereaAllocations} = require('./cerea-stock');

function createCereaService({db, timestamp}) {
  async function reconcile(sku) {
    const itemRef = db.doc('amzInventory/concamarise/items/' + sku);
    const productRef = db.doc('amzInventoryProducts/' + sku);
    return db.runTransaction(async tx => {
      const item = await tx.get(itemRef);
      if (!item.exists || !isCereaProduction(item.data())) return {changed:false};
      const data = item.data();
      const target = automaticCereaAllocations(data);
      const product = await tx.get(productRef);
      const itemChanged = !sameCereaAllocations(data.cereaAllocations, target);
      const productChanged = product.exists && !sameCereaAllocations(product.data().cereaAllocations, target);
      const pieces = target.reduce((sum, row) => sum + row.qty, 0);
      if (!itemChanged && !productChanged) return {changed:false, pieces};
      const patch = {cereaAllocations:target, cereaAutoPlacementVersion:1,
        cereaAutoPlacementAt:timestamp(), cereaAutoPlacementSource:'production_area'};
      // The transaction re-reads live stock; it never writes quantities, racks,
      // reservations or stock-owner timestamps, including on duplicate events.
      if (itemChanged) tx.set(itemRef, patch, {merge:true});
      if (productChanged) tx.set(productRef, patch, {merge:true});
      return {changed:true, itemChanged, productChanged, pieces};
    });
  }
  async function onInventoryWritten(event) {
    const after = event.data?.after;
    if (!after?.exists || !isCereaProduction(after.data())) return {changed:false};
    return reconcile(event.params.sku);
  }
  return {reconcile, onInventoryWritten};
}
module.exports = {createCereaService};
