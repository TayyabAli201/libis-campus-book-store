import { all, one } from "./db";
import { scope } from "./security";
import type { User } from "../contracts";
export async function reports(u: User, from: string, to: string) {
  const s = scope(u);
  const filter = `${s.sql} AND o.created_at>=? AND o.created_at<=?`;
  const args = [...s.args, from, to + "T23:59:59.999Z"];
  const stats = await one<any>(
    `SELECT COUNT(*) total_orders,COALESCE(SUM(o.status='PAYMENT_PENDING'),0) pending_orders,COALESCE(SUM(o.status='CONFIRMED'),0) confirmed_orders,COALESCE(SUM(o.status='DELIVERED'),0) delivered_orders,COALESCE(SUM(CASE WHEN p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') THEN o.total ELSE 0 END),0) total_sales,COALESCE(SUM(p.status IN ('PENDING','MANUAL_REVIEW','NEW_SLIP_REQUESTED')),0) pending_payments FROM orders o JOIN payments p ON o.id=p.order_id WHERE ${filter}`,
    ...args,
  );
  const bscope =
    u.role === "SUPER_ADMIN" ? "1=1" : "(b.campus_id=? OR b.campus_id IS NULL)";
  const inv = await one<any>(
    `SELECT COUNT(*) total_books FROM books b WHERE b.deleted_at IS NULL AND ${bscope}`,
    ...(u.role === "SUPER_ADMIN" ? [] : [u.campus_id]),
  );
  const campuses =
    u.role === "SUPER_ADMIN"
      ? await one<any>("SELECT COUNT(*) n FROM campuses")
      : { n: 1 };
  const daily = await all(
    `SELECT substr(o.created_at,1,10) label,COUNT(*) orders,SUM(CASE WHEN p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') THEN o.total ELSE 0 END) sales FROM orders o JOIN payments p ON p.order_id=o.id WHERE ${filter} GROUP BY label ORDER BY label`,
    ...args,
  );
  const best = await all(
    `SELECT i.code label,SUM(i.quantity) value FROM order_items i JOIN orders o ON o.id=i.order_id JOIN payments p ON p.order_id=o.id WHERE ${filter} AND p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') GROUP BY i.code ORDER BY value DESC LIMIT 8`,
    ...args,
  );
  const category = await all(
    `SELECT CASE WHEN i.category='D' THEN 'Student category' ELSE 'Category ' || i.category END label,SUM(i.quantity*i.unit_price) value FROM order_items i JOIN orders o ON o.id=i.order_id JOIN payments p ON p.order_id=o.id WHERE ${filter} AND p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') GROUP BY i.category`,
    ...args,
  );
  const campus = await all(
    `SELECT COALESCE(c.name,'Independent students') label,COUNT(*) value FROM orders o LEFT JOIN campuses c ON c.id=o.campus_id WHERE ${filter} GROUP BY o.campus_id`,
    ...args,
  );
  const payment = await all(
    `SELECT p.status label,COUNT(*) value FROM orders o JOIN payments p ON p.order_id=o.id WHERE ${filter} GROUP BY p.status`,
    ...args,
  );
  return {
    stats: { ...stats, ...inv, total_campuses: campuses.n },
    daily,
    best,
    category,
    campus,
    payment,
  };
}
