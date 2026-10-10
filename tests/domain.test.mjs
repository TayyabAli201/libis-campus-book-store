import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {compareAmount} from '../lib/payment-status.ts';
import {money,checkoutInput,transitions} from '../lib/contracts.ts';
import {orderSheet, ORDER_EXPORT_COLUMNS, ORDER_EXPORT_COLUMNS_WITH_ADDRESS} from '../lib/orders-spreadsheet.ts';
test('OCR outcomes distinguish exact, lower, higher, unreadable amounts and never claim verification',()=>{assert.equal(compareAmount(400000,400000).status,'AMOUNT_MATCHED');assert.equal(compareAmount(399999,400000).status,'AMOUNT_MISMATCH');assert.equal(compareAmount(500000,400000).status,'AMOUNT_MISMATCH');assert.equal(compareAmount(null,400000).status,'OCR_FAILED');for(const amount of [0,400000,500000,null])assert.notEqual(compareAmount(amount,400000).status,'VERIFIED');});
test('Currency formatting is deterministic between server and browser locales',()=>{assert.equal(money(122500),'Rs. 1,225');assert.equal(money(250),'Rs. 2.50');assert.equal(money(0),'Rs. 0');assert.equal(money(-80000),'Rs. -800');});
test('Checkout rejects fractional or negative quantities',()=>{const data={name:'Student',phone:'03001234567',city:'Lahore',address:'Campus Road',delivery_type:'lahore',campus_id:null,items:[{id:crypto.randomUUID(),quantity:0.5}]};assert.equal(checkoutInput.safeParse(data).success,false);data.items[0].quantity=-2;assert.equal(checkoutInput.safeParse(data).success,false);});
test('Cancellation is terminal and shipped stock cannot be restocked by cancellation',()=>{assert.deepEqual(transitions.CANCELLED,[]);assert.equal(transitions.SHIPPED.includes('CANCELLED'),false);assert.equal(transitions.PAYMENT_PENDING.includes('CONFIRMED'),false);});
test('orderSheet exports theme spreadsheet with standard 7 columns or address for other cities',()=>{
  const sampleOrders = [
    {
      reference: 'ORD-101',
      name: 'Ali Khan',
      created_at: '2026-10-10T12:00:00.000Z',
      city: 'Islamabad',
      address: 'House 12, Street 4, F-8/1',
      delivery_type: 'other',
      items: [
        { code: 'CS101', title: 'Intro to CS', quantity: 1 },
        { code: 'MATH201', title: 'Calculus II', quantity: 2 },
      ],
    },
  ];
  const standardSheet = orderSheet(sampleOrders);
  assert.equal(standardSheet[0].length, 7);
  assert.deepEqual(standardSheet[0].map((c) => c.value), Array.from(ORDER_EXPORT_COLUMNS));
  assert.equal(standardSheet[1][0].rowSpan, 2);
  assert.equal(standardSheet[1][1].value, 'ORD-101');
  assert.equal(standardSheet[1][3].value, '10-10-2026');
  assert.equal(standardSheet[1][4].value, 'CS101');
  assert.equal(standardSheet[2][0], null);
  assert.equal(standardSheet[2][4].value, 'MATH201');

  const otherCitySheet = orderSheet(sampleOrders, { includeAddress: true });
  assert.equal(otherCitySheet[0].length, 8);
  assert.deepEqual(otherCitySheet[0].map((c) => c.value), Array.from(ORDER_EXPORT_COLUMNS_WITH_ADDRESS));
  assert.equal(otherCitySheet[1][4].value, 'House 12, Street 4, F-8/1, Islamabad');
  assert.equal(otherCitySheet[1][4].rowSpan, 2);
  assert.equal(otherCitySheet[1][5].value, 'CS101');
  assert.equal(otherCitySheet[2][4], null);
  assert.equal(otherCitySheet[2][5].value, 'MATH201');
});
test('Real migration enforces pricing categories, totals and atomic stock constraints',()=>{const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(fs.readFileSync('drizzle/0000_modern_marrow.sql','utf8'));db.prepare('INSERT INTO pricing_categories(id,rate) VALUES(?,?)').run('A',250);assert.throws(()=>db.prepare('INSERT INTO pricing_categories(id,rate) VALUES(?,?)').run('E',700));db.exec("INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,created_at) VALUES('b','CS','CS','Computing','Book','Author','Description',100,'A','2026-01-01');INSERT INTO inventory(book_id,stock,reserved) VALUES('b',1,0)");assert.throws(()=>db.exec("UPDATE inventory SET reserved=2 WHERE book_id='b'"));db.exec('BEGIN');db.exec("UPDATE inventory SET reserved=1 WHERE book_id='b'");try{db.exec("INSERT INTO transaction_guards(id,ok) VALUES('g',0)");assert.fail('guard must fail')}catch{db.exec('ROLLBACK');}assert.equal(db.prepare("SELECT reserved FROM inventory WHERE book_id='b'").get().reserved,0);db.close();});

