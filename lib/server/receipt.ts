import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { statuses, money } from "../contracts";
import { receiptDate, receiptPaymentNote } from "../receipt-format";

export async function receipt(o: any) {
  const doc = await PDFDocument.create();
  const storeName = o.store?.store_name || "Campus Bookstore";
  doc.setTitle(`Receipt ${o.reference}`);
  doc.setAuthor(storeName);
  doc.setSubject("Order receipt");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28,
    height = 841.89,
    margin = 44,
    content = width - margin * 2;
  const ink = rgb(0.1, 0.2, 0.31),
    muted = rgb(0.37, 0.44, 0.53);
  const blue = rgb(0.15, 0.39, 0.65),
    pale = rgb(0.93, 0.96, 1),
    rule = rgb(0.83, 0.88, 0.94);
  let page = doc.addPage([width, height]),
    y = 0;
  // Standard PDF fonts support Latin text; browser printing retains Unicode support.
  const clean = (value: unknown) =>
    String(value ?? "")
      .replace(/[^\x20-\x7e]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const wrap = (
    value: unknown,
    maxWidth: number,
    size = 10,
    font: PDFFont = regular,
  ) => {
    const lines: string[] = [];
    let line = "";
    for (const word of clean(value).split(" ")) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };
  const text = (
    value: unknown,
    x: number,
    top: number,
    size = 10,
    strong = false,
    color = ink,
  ) => {
    page.drawText(clean(value), {
      x,
      y: top - size,
      size,
      font: strong ? bold : regular,
      color,
    });
  };
  const lines = (
    values: string[],
    x: number,
    top: number,
    size = 10,
    strong = false,
    color = ink,
  ) => {
    values.forEach((value, i) =>
      text(value, x, top - i * (size + 4), size, strong, color),
    );
    return values.length * (size + 4);
  };
  const right = (
    value: unknown,
    edge: number,
    top: number,
    size = 10,
    strong = false,
    color = ink,
  ) => {
    const font = strong ? bold : regular;
    text(
      value,
      edge - font.widthOfTextAtSize(clean(value), size),
      top,
      size,
      strong,
      color,
    );
  };
  const separator = (top: number) =>
    page.drawLine({
      start: { x: margin, y: top },
      end: { x: width - margin, y: top },
      thickness: 0.7,
      color: rule,
    });
  const header = (continued = false) => {
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: blue });
    const brand = wrap(storeName, 340, 20, bold);
    const brandHeight = lines(brand, margin, height - 43, 20, true, blue);
    right("ORDER RECEIPT", width - margin, height - 49, 9, true, blue);
    right(
      continued ? "CONTINUED" : "CUSTOMER COPY",
      width - margin,
      height - 66,
      7,
      false,
      muted,
    );
    text(
      "BOOKS FOR YOUR NEXT CHAPTER",
      margin,
      height - 48 - brandHeight,
      7,
      true,
      muted,
    );
    y = height - 77 - brandHeight;
    separator(y);
    y -= 20;
    text("ORDER ID", margin, y, 7, true, muted);
    right("ISSUED ON", width - margin, y, 7, true, muted);
    y -= 16;
    text(o.reference, margin, y, 11, true);
    right(receiptDate(o.created_at), width - margin, y, 9);
    y -= 33;
  };
  const nextPage = () => {
    page = doc.addPage([width, height]);
    header(true);
  };
  const ensure = (space: number) => {
    if (y - space < 107) nextPage();
  };
  const tableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: content,
      height: 28,
      color: pale,
    });
    text("BOOK / DESCRIPTION", margin + 10, y - 9, 8, true, blue);
    right("QTY", 352, y - 9, 8, true, blue);
    right("UNIT PRICE", 446, y - 9, 8, true, blue);
    right("AMOUNT", width - margin - 10, y - 9, 8, true, blue);
    y -= 28;
  };
  header();
  const customerLines = [
    ...wrap(o.name, 220, 11, bold),
    ...wrap(o.phone, 220, 10),
  ];
  const addressLines = [...wrap(o.address, 230), ...wrap(o.city, 230)];
  const customerHeight =
    Math.max(customerLines.length * 15, addressLines.length * 14) + 40;
  ensure(customerHeight);
  text("BILLED TO", margin, y, 7, true, muted);
  const isPickup =
    o.delivery_type === "campus" ||
    (o.city && String(o.city).toLowerCase().includes("campus")) ||
    (o.address && String(o.address).toLowerCase().includes("campus"));
  text(isPickup ? "PICKUP LOCATION (VU QANCHI CAMPUS)" : "DELIVER TO", 310, y, 7, true, muted);
  const nameHeight = lines(
    wrap(o.name, 220, 11, bold),
    margin,
    y - 17,
    11,
    true,
  );
  lines(wrap(o.phone, 220), margin, y - 20 - nameHeight, 10, false, muted);
  lines(addressLines, 310, y - 17);
  y -= customerHeight;
  ensure(95);
  tableHeader();
  for (const item of o.items) {
    const titleLines = wrap(item.title, 248, 10, bold);
    const detailLines = wrap(`${item.code} | ${item.pages} pages`, 248, 8);
    const rowHeight = Math.max(
      52,
      titleLines.length * 14 + detailLines.length * 12 + 22,
    );
    if (y - rowHeight < 107) {
      nextPage();
      tableHeader();
    }
    const top = y - 12;
    lines(titleLines, margin + 10, top, 10, true);
    lines(
      detailLines,
      margin + 10,
      top - titleLines.length * 14 - 4,
      8,
      false,
      muted,
    );
    right(item.quantity, 352, top, 9);
    right(money(item.unit_price, o.currency), 446, top, 9);
    const amount = money(item.quantity * item.unit_price, o.currency);
    const amountSize = Math.min(
      9,
      84 / bold.widthOfTextAtSize(clean(amount), 1),
    );
    right(amount, width - margin - 10, top, amountSize, true);
    y -= rowHeight;
    separator(y);
  }
  y -= 24;
  const summaryHeight = 90;
  ensure(summaryHeight);
  text("Subtotal", 335, y, 10, false, muted);
  right(money(o.subtotal, o.currency), width - margin - 10, y, 10);
  const isBaseDelivery =
    o.delivery_type === "lahore" || o.delivery_type === "other";
  text(
    isBaseDelivery ? "Delivery (Base / Min)" : "Delivery",
    335,
    y - 23,
    10,
    false,
    muted,
  );
  right(money(o.delivery, o.currency), width - margin - 10, y - 23, 10);
  page.drawRectangle({
    x: 323,
    y: y - 83,
    width: width - margin - 323,
    height: 34,
    color: pale,
  });
  text("GRAND TOTAL", 335, y - 61, 8, true, blue);
  const total = money(o.total, o.currency);
  const totalSize = Math.min(12, 113 / bold.widthOfTextAtSize(clean(total), 1));
  right(total, width - margin - 10, y - 59, totalSize, true, blue);
  y -= summaryHeight;
  if (o.instructions) {
    const instructionLines = wrap(o.instructions, content, 9);
    ensure(29 + instructionLines.length * 13);
    text("DELIVERY INSTRUCTIONS", margin, y, 7, true, muted);
    y -= 18;
    y -= lines(instructionLines, margin, y, 9);
    y -= 16;
  }
  if (isBaseDelivery) {
    const noticeLines = [
      ...wrap(
        "• Base Advance Fee: The delivery charge included in this order is a minimum base advance fee.",
        content - 24,
        8,
        regular,
      ),
      ...wrap(
        "• Excess Rider / Courier Fare: If actual rider fare (e.g. Bykea, InDrive) or courier charges exceed this base amount, the student must pay the remaining difference directly upon delivery.",
        content - 24,
        8,
        regular,
      ),
    ];
    const boxHeight = 24 + noticeLines.length * 12;
    ensure(boxHeight + 14);
    const redBorder = rgb(0.86, 0.15, 0.15);
    const redBg = rgb(0.99, 0.95, 0.95);
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: content,
      height: boxHeight,
      color: redBg,
      borderColor: redBorder,
      borderWidth: 1,
    });
    text("IMPORTANT DELIVERY POLICY NOTICE (BASE MINIMUM FEE)", margin + 12, y - 6, 7.5, true, redBorder);
    lines(noticeLines, margin + 12, y - 20, 8, false, ink);
    y -= boxHeight + 16;
  }
  const thanks = wrap(
    `Thank you for choosing ${storeName}.`,
    content,
    11,
    bold,
  );
  const paymentNote = wrap(receiptPaymentNote(o.payment_status), content, 9);
  ensure(thanks.length * 15 + paymentNote.length * 13 + 20);
  y -= lines(thanks, margin, y, 11, true, blue) + 8;
  lines(paymentNote, margin, y, 9, false, muted);

  const pages = doc.getPages();
  pages.forEach((currentPage, index) => {
    page = currentPage;
    separator(87);
    const contact = [o.store?.support_email, o.store?.whatsapp]
      .filter(Boolean)
      .join("  |  ");
    text(
      "Keep your Order ID for tracking and support.",
      margin,
      73,
      8,
      true,
      muted,
    );
    if (contact)
      lines(wrap(contact, content - 80, 8), margin, 57, 8, false, muted);
    right(
      `Page ${index + 1} of ${pages.length}`,
      width - margin,
      73,
      8,
      false,
      muted,
    );
    right(o.reference, width - margin, 30, 7, false, muted);
    text("COMPUTER-GENERATED ORDER RECEIPT", margin, 30, 7, false, muted);
  });
  return doc.save();
}
