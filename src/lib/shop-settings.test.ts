import { test } from "node:test";
import { strict as assert } from "node:assert";
import { emptyHours, validateHours, validatePaymentAmount, unrecordedOrderCosts } from "./shop-settings";
test("opening hours require closing after opening", () => { const h=emptyHours(); h.Monday={closed:false,opens:"09:00",closes:"08:00"}; assert.throws(()=>validateHours(h)); h.Monday.closes="17:00"; assert.doesNotThrow(()=>validateHours(h)); });
test("supplier payments require a positive currency amount",()=>{ assert.equal(validatePaymentAmount("84.50"),84.5); for(const v of ["0","-10","84.001","NaN"]) assert.throws(()=>validatePaymentAmount(v)); });
test("paid orders are not added twice to expenses",()=>{ assert.deepEqual(unrecordedOrderCosts([{id:"paid"},{id:"pending"}], [{stock_order_id:"paid"}]),[{id:"pending"}]); });