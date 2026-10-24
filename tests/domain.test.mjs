import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {compareAmount} from '../lib/payment-status.ts';
import {money,checkoutInput,transitions,getOrderWhatsAppMessage,formatWhatsAppPhone,getWhatsAppUrl,formatReceiptBookTitle} from '../lib/contracts.ts';
import {orderSheet, ORDER_EXPORT_COLUMNS, ORDER_EXPORT_COLUMNS_WITH_MOBILE, ORDER_EXPORT_COLUMNS_WITH_ADDRESS} from '../lib/orders-spreadsheet.ts';
test('OCR outcomes distinguish exact, lower, higher, unreadable amounts and never claim verification',()=>{assert.equal(compareAmount(400000,400000).status,'AMOUNT_MATCHED');assert.equal(compareAmount(399999,400000).status,'AMOUNT_MISMATCH');assert.equal(compareAmount(500000,400000).status,'AMOUNT_MISMATCH');assert.equal(compareAmount(null,400000).status,'OCR_FAILED');for(const amount of [0,400000,500000,null])assert.notEqual(compareAmount(amount,400000).status,'VERIFIED');});
test('Currency formatting is deterministic between server and browser locales',()=>{assert.equal(money(122500),'Rs. 1,225');assert.equal(money(250),'Rs. 2.50');assert.equal(money(0),'Rs. 0');assert.equal(money(-80000),'Rs. -800');});
test('Checkout rejects fractional or negative quantities',()=>{const data={name:'Student',phone:'03001234567',city:'Lahore',address:'Campus Road',delivery_type:'lahore',campus_id:null,items:[{id:crypto.randomUUID(),quantity:0.5}]};assert.equal(checkoutInput.safeParse(data).success,false);data.items[0].quantity=-2;assert.equal(checkoutInput.safeParse(data).success,false);});
test('Cancellation is terminal and shipped stock cannot be restocked by cancellation',()=>{assert.deepEqual(transitions.CANCELLED,[]);assert.equal(transitions.SHIPPED.includes('CANCELLED'),false);assert.equal(transitions.PAYMENT_PENDING.includes('CONFIRMED'),false);});
test('orderSheet exports theme spreadsheet with standard 7 columns or address for other cities',()=>{
  const sampleOrders = [
    {
      reference: 'ORD-101',
      name: 'Ali Khan',
      phone: '03001234567',
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
  assert.equal(standardSheet.length, 4); // header + 2 item rows + grand total
  assert.equal(standardSheet[0].length, 7);
  assert.deepEqual(standardSheet[0].map((c) => c.value), Array.from(ORDER_EXPORT_COLUMNS));
  assert.equal(standardSheet[1][0].rowSpan, 2);
  assert.equal(standardSheet[1][1].value, 'ORD-101');
  assert.equal(standardSheet[1][2].value, 'Ali Khan');
  assert.equal(standardSheet[1][3].value, 'CS101');
  assert.equal(standardSheet[1][4].value, 'Intro to CS');
  assert.equal(standardSheet[1][5].value, 1);
  assert.equal(standardSheet[1][6].value, 3); // Total books for order
  assert.equal(standardSheet[1][6].rowSpan, 2);
  assert.equal(standardSheet[2][0], null);
  assert.equal(standardSheet[2][3].value, 'MATH201');
  assert.equal(standardSheet[2][5].value, 2);
  assert.equal(standardSheet[2][6], null);
  // Grand total row
  assert.equal(standardSheet[3].length, 7);
  assert.deepEqual(standardSheet[3].slice(0, 5), [null, null, null, null, null]);
  assert.equal(standardSheet[3][5].value, '(Total Books: 3)');
  assert.equal(standardSheet[3][5].columnSpan, 2);
  assert.equal(standardSheet[3][5].fontFamily, 'Lora');
  assert.equal(standardSheet[3][5].height, 22.5);
  assert.equal(standardSheet[3][5].backgroundColor, '#1F65A8');
  assert.equal(standardSheet[3][6], null);
  // Verify Lora font and 22.5pt height across headers and data cells
  assert.equal(standardSheet[0][0].fontFamily, 'Lora');
  assert.equal(standardSheet[0][0].height, 22.5);
  assert.equal(standardSheet[1][0].fontFamily, 'Lora');
  assert.equal(standardSheet[1][0].height, 22.5);

  const otherCitySheet = orderSheet(sampleOrders, { includeAddress: true });
  assert.equal(otherCitySheet.length, 4);
  assert.equal(otherCitySheet[0].length, 9);
  assert.deepEqual(otherCitySheet[0].map((c) => c.value), Array.from(ORDER_EXPORT_COLUMNS_WITH_ADDRESS));
  assert.equal(otherCitySheet[1][3].value, '03001234567');
  assert.equal(otherCitySheet[1][3].rowSpan, 2);
  assert.equal(otherCitySheet[1][3].fontFamily, 'Lora');
  assert.equal(otherCitySheet[1][3].height, 22.5);
  assert.equal(otherCitySheet[1][4].value, 'House 12, Street 4, F-8/1, Islamabad');
  assert.equal(otherCitySheet[1][4].rowSpan, 2);
  assert.equal(otherCitySheet[1][4].fontFamily, 'Lora');
  assert.equal(otherCitySheet[1][4].height, 22.5);
  assert.equal(otherCitySheet[1][5].value, 'CS101');
  assert.equal(otherCitySheet[1][7].value, 1);
  assert.equal(otherCitySheet[1][8].value, 3);
  assert.equal(otherCitySheet[1][8].rowSpan, 2);
  assert.equal(otherCitySheet[2][3], null);
  assert.equal(otherCitySheet[2][4], null);
  assert.equal(otherCitySheet[2][5].value, 'MATH201');
  assert.equal(otherCitySheet[2][8], null);
  // Grand total row with address
  assert.equal(otherCitySheet[3].length, 9);
  assert.deepEqual(otherCitySheet[3].slice(0, 7), [null, null, null, null, null, null, null]);
  assert.equal(otherCitySheet[3][7].value, '(Total Books: 3)');
  assert.equal(otherCitySheet[3][7].columnSpan, 2);
  assert.equal(otherCitySheet[3][7].fontFamily, 'Lora');
  assert.equal(otherCitySheet[3][7].height, 22.5);
  assert.equal(otherCitySheet[3][7].backgroundColor, '#1F65A8');
  assert.equal(otherCitySheet[3][8], null);

  const shippedCampusLahoreSheet = orderSheet(sampleOrders, { includeMobile: true });
  assert.equal(shippedCampusLahoreSheet.length, 4);
  assert.equal(shippedCampusLahoreSheet[0].length, 8);
  assert.deepEqual(shippedCampusLahoreSheet[0].map((c) => c.value), Array.from(ORDER_EXPORT_COLUMNS_WITH_MOBILE));
  assert.equal(shippedCampusLahoreSheet[1][2].value, 'Ali Khan');
  assert.equal(shippedCampusLahoreSheet[1][3].value, '03001234567');
  assert.equal(shippedCampusLahoreSheet[1][3].rowSpan, 2);
  assert.equal(shippedCampusLahoreSheet[1][4].value, 'CS101');
  assert.equal(shippedCampusLahoreSheet[1][7].value, 3);
  assert.equal(shippedCampusLahoreSheet[3].length, 8);
  assert.deepEqual(shippedCampusLahoreSheet[3].slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(shippedCampusLahoreSheet[3][6].value, '(Total Books: 3)');
});
test('Real migration enforces pricing categories, totals and atomic stock constraints',()=>{const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(fs.readFileSync('drizzle/0000_modern_marrow.sql','utf8'));db.prepare('INSERT INTO pricing_categories(id,rate) VALUES(?,?)').run('A',250);assert.throws(()=>db.prepare('INSERT INTO pricing_categories(id,rate) VALUES(?,?)').run('E',700));db.exec("INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,created_at) VALUES('b','CS','CS','Computing','Book','Author','Description',100,'A','2026-01-01');INSERT INTO inventory(book_id,stock,reserved) VALUES('b',1,0)");assert.throws(()=>db.exec("UPDATE inventory SET reserved=2 WHERE book_id='b'"));db.exec('BEGIN');db.exec("UPDATE inventory SET reserved=1 WHERE book_id='b'");try{db.exec("INSERT INTO transaction_guards(id,ok) VALUES('g',0)");assert.fail('guard must fail')}catch{db.exec('ROLLBACK');}assert.equal(db.prepare("SELECT reserved FROM inventory WHERE book_id='b'").get().reserved,0);db.close();});

test('WhatsApp phone formatting preserves exact digits as entered by user without alterations',()=>{
  assert.equal(formatWhatsAppPhone('03001234567'), '03001234567');
  assert.equal(formatWhatsAppPhone('+92 300 1234567'), '923001234567');
  assert.equal(formatWhatsAppPhone('0310-4584041'), '03104584041');
  assert.equal(formatWhatsAppPhone('923001234567'), '923001234567');
  assert.equal(formatWhatsAppPhone('3001234567'), '3001234567');
  assert.equal(formatWhatsAppPhone('+1 (555) 234-5678'), '15552345678');
});

test('WhatsApp message generator accurately generates messages for Confirmed, Processing, Shipped and Delivered',()=>{
  // 1. Confirmed (All types)
  const confirmedOrder = { name: 'Muhammad Ali', status: 'CONFIRMED', total: 150000, phone: '03001234567' };
  assert.equal(
    getOrderWhatsAppMessage(confirmedOrder),
    'Salam Muhammad Ali, your payment has been verified. Your order is now confirmed and will be processed soon.'
  );

  // 2. Processing (All types)
  const processingOrder = { name: 'Ayesha Khan', status: 'PROCESSING', total: 245000, phone: '03219876543' };
  assert.equal(
    getOrderWhatsAppMessage(processingOrder),
    'Salam Ayesha Khan, your order worth Rs. 2,450 is currently in processing. It will be shipped very soon.'
  );

  // 3. Shipped - Campus Order
  const campusShippedOrder = {
    name: 'Bilal Ahmed',
    status: 'SHIPPED',
    delivery_type: 'campus',
    city: 'VU Qanchi Campus',
    phone: '03335555555'
  };
  assert.equal(
    getOrderWhatsAppMessage(campusShippedOrder),
    'Salam Bilal Ahmed, your books have arrived at VU Qanchi campus. You can receive them now.'
  );

  // 3. Shipped - Lahore Delivery Order
  const lahoreShippedOrder = {
    name: 'Usman Tariq',
    status: 'SHIPPED',
    delivery_type: 'lahore',
    city: 'Lahore',
    phone: '03451112233'
  };
  assert.equal(
    getOrderWhatsAppMessage(lahoreShippedOrder),
    'Salam Usman Tariq, your books have reached us and will be delivered to you within 1 day.'
  );

  // 3. Shipped - Other Cities Order
  const otherShippedOrder = {
    name: 'Zainab Fatima',
    status: 'SHIPPED',
    delivery_type: 'other',
    city: 'Rawalpindi',
    phone: '03129998877'
  };
  assert.equal(
    getOrderWhatsAppMessage(otherShippedOrder),
    'Salam Zainab Fatima, your order has been shipped via courier.'
  );

  // 4. Delivered (All types)
  const deliveredOrder = { name: 'Hamza Farooq', status: 'DELIVERED', phone: '03007778899' };
  assert.equal(
    getOrderWhatsAppMessage(deliveredOrder),
    'Salam Hamza Farooq, your order has been delivered. Please confirm.'
  );

  // WhatsApp wa.me URL format with encodeURIComponent (preserving exact digits)
  const fullUrl = getWhatsAppUrl(campusShippedOrder);
  assert.equal(
    fullUrl,
    'https://wa.me/03335555555?text=' + encodeURIComponent('Salam Bilal Ahmed, your books have arrived at VU Qanchi campus. You can receive them now.')
  );
});

test('formatReceiptBookTitle prefixes book code to book title and normalizes duplicates', () => {
  assert.equal(formatReceiptBookTitle('CS101', 'Introduction To Computing'), 'CS101 - Introduction To Computing');
  assert.equal(formatReceiptBookTitle('CS607', 'Artificial Intelligence'), 'CS607 - Artificial Intelligence');
  assert.equal(formatReceiptBookTitle('CS614', 'Dataware Housing'), 'CS614 - Dataware Housing');
  assert.equal(formatReceiptBookTitle('CS101', 'CS101 - Introduction To Computing'), 'CS101 - Introduction To Computing');
  assert.equal(formatReceiptBookTitle('CS101', 'cs101: Introduction To Computing'), 'CS101 - Introduction To Computing');
  assert.equal(formatReceiptBookTitle('CS101', 'CS101'), 'CS101');
  assert.equal(formatReceiptBookTitle('', 'Artificial Intelligence'), 'Artificial Intelligence');
  assert.equal(formatReceiptBookTitle(null, 'Introduction To Computing'), 'Introduction To Computing');
  assert.equal(formatReceiptBookTitle('CS101', null), 'CS101');
});

test('orderSheet highlights missing books with red fill and keeps normal style when all received', () => {
  const partiallyReceivedOrder = [
    {
      reference: 'ORD-SHORTAGE',
      name: 'Ahmed Raza',
      phone: '03001234567',
      status: 'PROCESSING',
      vendor_dispatched_at: '2026-10-25T00:00:00.000Z',
      items: [
        { code: 'CS101', title: 'Intro to CS', quantity: 1, received_from_vendor: 1 },
        { code: 'MTH101', title: 'Calculus', quantity: 1, received_from_vendor: 0 },
      ],
    },
  ];

  const sheet = orderSheet(partiallyReceivedOrder);
  // Row 0: Header
  // Row 1: CS101 (Received -> no red fill)
  // Row 2: MTH101 (Missing -> red fill #FEE2E2 & text #991B1B)
  const receivedRow = sheet[1];
  const missingRow = sheet[2];

  // CS101 Code cell (index 3 in standard 7-col sheet)
  assert.equal(receivedRow[3].value, 'CS101');
  assert.equal(receivedRow[3].backgroundColor, undefined);

  // MTH101 Code cell (index 3 in subsequent row)
  assert.equal(missingRow[3].value, 'MTH101');
  assert.equal(missingRow[3].backgroundColor, '#FEE2E2');
  assert.equal(missingRow[3].textColor, '#991B1B');

  // MTH101 Title cell (index 4)
  assert.equal(missingRow[4].value, 'Calculus');
  assert.equal(missingRow[4].backgroundColor, '#FEE2E2');
  assert.equal(missingRow[4].textColor, '#991B1B');

  // MTH101 Quantity cell (index 5)
  assert.equal(missingRow[5].value, 1);
  assert.equal(missingRow[5].backgroundColor, '#FEE2E2');
  assert.equal(missingRow[5].textColor, '#991B1B');

  // Full received order: no background color on any item
  const allReceivedOrder = [
    {
      reference: 'ORD-COMPLETE',
      name: 'Sara Khan',
      status: 'PROCESSING',
      vendor_dispatched_at: '2026-10-25T00:00:00.000Z',
      items: [
        { code: 'CS101', title: 'Intro to CS', quantity: 1, received_from_vendor: 1 },
      ],
    },
  ];
  const allSheet = orderSheet(allReceivedOrder);
  assert.equal(allSheet[1][3].backgroundColor, undefined);
});
