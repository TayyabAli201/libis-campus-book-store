import { all, one } from "./db";
import { scope } from "./security";
import type { User } from "../contracts";

export async function reports(u: User, from: string, to: string, vendorId?: string) {
  const s = scope(u);
  let filter = `${s.sql} AND o.created_at>=? AND o.created_at<=?`;
  const args = [...s.args, from, to + "T23:59:59.999Z"];
  if (vendorId && vendorId !== "all") {
    filter += " AND o.vendor_id = ?";
    args.push(vendorId);
  }

  const stats = await one<any>(
    `SELECT 
      COUNT(*) total_orders,
      COALESCE(SUM(o.status='PAYMENT_PENDING'),0) pending_orders,
      COALESCE(SUM(o.status='CONFIRMED'),0) confirmed_orders,
      COALESCE(SUM(o.status='DELIVERED'),0) delivered_orders,
      COALESCE(SUM(CASE WHEN p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') THEN o.total ELSE 0 END),0) total_sales,
      COALESCE(SUM(p.status IN ('PENDING','MANUAL_REVIEW','NEW_SLIP_REQUESTED')),0) pending_payments 
    FROM orders o 
    JOIN payments p ON o.id=p.order_id 
    WHERE ${filter}`,
    ...args,
  );

  const verifiedFilter = `${filter} AND p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED')`;

  // Item-level volumes and vendor printing costs for verified orders
  const itemStats = await one<any>(
    `SELECT 
      COALESCE(SUM(CASE WHEN i.is_unavailable = 1 THEN 0 ELSE i.quantity END), 0) AS total_books_ordered,
      COALESCE(SUM(CASE WHEN i.is_unavailable = 1 OR i.in_office_stock = 1 THEN 0 ELSE i.quantity END), 0) AS total_print_books,
      COALESCE(SUM(CASE WHEN i.in_office_stock = 1 THEN i.quantity ELSE 0 END), 0) AS total_office_stock_books,
      COALESCE(SUM(CASE WHEN i.is_unavailable = 1 OR i.in_office_stock = 1 THEN 0 ELSE (COALESCE(i.pages, 0) * i.quantity) END), 0) AS total_pages_printed,
      COALESCE(SUM(CASE WHEN o.status IN ('SHIPPED', 'DELIVERED') AND (i.is_unavailable = 1 OR i.in_office_stock = 1) THEN 0 WHEN o.status IN ('SHIPPED', 'DELIVERED') THEN (COALESCE(i.pages, 0) * i.quantity * COALESCE(v.per_page_rate, 1.60)) + (i.quantity * COALESCE(v.binding_rate, 30.00)) ELSE 0 END), 0) AS vendor_printing_cost,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (i.is_unavailable = 1 OR i.in_office_stock = 1) THEN 0 WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') THEN (COALESCE(i.pages, 0) * i.quantity * COALESCE(v.per_page_rate, 1.60)) + (i.quantity * COALESCE(v.binding_rate, 30.00)) ELSE 0 END), 0) AS vendor_queue_cost,
      COALESCE(COUNT(DISTINCT CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (i.is_unavailable = 0 AND i.in_office_stock = 0) THEN o.id ELSE NULL END), 0) AS queue_orders,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (i.is_unavailable = 1 OR i.in_office_stock = 1) THEN 0 WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') THEN i.quantity ELSE 0 END), 0) AS queue_books,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (i.is_unavailable = 1 OR i.in_office_stock = 1) THEN 0 WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') THEN (COALESCE(i.pages, 0) * i.quantity) ELSE 0 END), 0) AS queue_pages,
      COALESCE(SUM(CASE WHEN i.in_office_stock = 1 THEN (COALESCE(i.pages, 0) * i.quantity * COALESCE(v.per_page_rate, 1.60)) + (i.quantity * COALESCE(v.binding_rate, 30.00)) ELSE 0 END), 0) AS office_stock_savings
     FROM order_items i
     JOIN orders o ON o.id = i.order_id
     JOIN payments p ON p.order_id = o.id
     LEFT JOIN vendors v ON v.id = o.vendor_id
     WHERE ${verifiedFilter}`,
    ...args,
  );

  const courierStats = await one<any>(
    `SELECT COALESCE(SUM(o.actual_courier_charges), 0) AS vendor_courier_cost
     FROM orders o
     JOIN payments p ON p.order_id = o.id
     WHERE ${verifiedFilter} AND o.status IN ('SHIPPED', 'DELIVERED')`,
    ...args,
  );

  const grossRevenue = Number(stats?.total_sales || 0);
  const vendorPrintCostRupees = Math.round(Number(itemStats?.vendor_printing_cost || 0));
  const vendorCourierCostRupees = Math.round(Number(courierStats?.vendor_courier_cost || 0));
  const totalVendorCostRupees = vendorPrintCostRupees + vendorCourierCostRupees;
  const vendorQueueCostRupees = Math.round(Number(itemStats?.vendor_queue_cost || 0));

  // Convert to paisas (x 100) to match database currency units and money() formatting
  const vendorPrintCost = vendorPrintCostRupees * 100;
  const vendorCourierCost = vendorCourierCostRupees * 100;
  const totalVendorCost = totalVendorCostRupees * 100; // Shipped / Billed vendor cost
  const vendorQueueCost = vendorQueueCostRupees * 100; // Committed In-Printing Queue cost
  const totalVendorLiability = totalVendorCost + vendorQueueCost;

  // Real Net Profit = Total Sales minus (Shipped Vendor Cost + In Printing Queue Cost)
  const netProfit = grossRevenue - totalVendorLiability;
  const profitMarginPct = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;
  const officeSavings = Math.round(Number(itemStats?.office_stock_savings || 0)) * 100;

  const vendorPaymentsRow = await one<any>(
    "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM vendor_payments",
  );
  const vendorTotalPaidRupees = Number(vendorPaymentsRow?.total_paid || 0);
  const vendorTotalPaid = vendorTotalPaidRupees * 100;
  const vendorRemainingBalance = totalVendorCost - vendorTotalPaid;

  const bscope =
    u.role === "SUPER_ADMIN" ? "1=1" : "(b.campus_id=? OR b.campus_id IS NULL)";
  const inv = await one<any>(
    `SELECT COUNT(*) total_books FROM books b WHERE b.deleted_at IS NULL AND ${bscope}`,
    ...(u.role === "SUPER_ADMIN" ? [] : [u.campus_id]),
  );

  const daily = await all(
    `SELECT 
      substr(o.created_at,1,10) label,
      COUNT(*) orders,
      SUM(CASE WHEN p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') THEN o.total ELSE 0 END) sales
     FROM orders o 
     JOIN payments p ON p.order_id=o.id 
     WHERE ${filter} 
     GROUP BY label 
     ORDER BY label`,
    ...args,
  );

  const best = await all(
    `SELECT i.code label,SUM(i.quantity) value 
     FROM order_items i 
     JOIN orders o ON o.id=i.order_id 
     JOIN payments p ON p.order_id=o.id 
     WHERE ${filter} AND p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') 
     GROUP BY i.code 
     ORDER BY value DESC 
     LIMIT 8`,
    ...args,
  );

  const category = await all(
    `SELECT 
      CASE WHEN i.category='D' THEN 'Student category' ELSE 'Category ' || i.category END label,
      SUM(i.quantity*i.unit_price) value 
     FROM order_items i 
     JOIN orders o ON o.id=i.order_id 
     JOIN payments p ON p.order_id=o.id 
     WHERE ${filter} AND p.status='VERIFIED' AND o.status NOT IN ('CANCELLED','REFUND_REQUESTED') 
     GROUP BY i.category`,
    ...args,
  );

  const payment = await all(
    `SELECT p.status label,COUNT(*) value 
     FROM orders o 
     JOIN payments p ON p.order_id=o.id 
     WHERE ${filter} 
     GROUP BY p.status`,
    ...args,
  );

  const delivery = await all(
    `SELECT 
      CASE 
        WHEN o.delivery_type = 'campus' THEN 'Qanchi Campus'
        WHEN o.delivery_type IN ('lahore', 'lahore_home') THEN 'Lahore Route'
        WHEN o.delivery_type = 'other' THEN 'Other Cities'
        ELSE 'Direct / Other'
      END label,
      COUNT(*) value 
     FROM orders o 
     WHERE ${filter} 
     GROUP BY label`,
    ...args,
  );

  return {
    stats: {
      ...stats,
      ...inv,
      gross_revenue: grossRevenue,
      vendor_printing_cost: vendorPrintCost,
      vendor_courier_cost: vendorCourierCost,
      total_vendor_cost: totalVendorCost,
      vendor_queue_cost: vendorQueueCost,
      queue_orders: Number(itemStats?.queue_orders || 0),
      queue_books: Number(itemStats?.queue_books || 0),
      queue_pages: Number(itemStats?.queue_pages || 0),
      vendor_total_liability: totalVendorLiability,
      vendor_total_paid: vendorTotalPaid,
      vendor_remaining_balance: vendorRemainingBalance,
      net_profit: netProfit,
      profit_margin_pct: profitMarginPct,
      office_stock_savings: officeSavings,
      total_books_ordered: Number(itemStats?.total_books_ordered || 0),
      total_print_books: Number(itemStats?.total_print_books || 0),
      total_office_stock_books: Number(itemStats?.total_office_stock_books || 0),
      total_pages_printed: Number(itemStats?.total_pages_printed || 0),
    },
    daily,
    best,
    category,
    payment,
    delivery,
    campus: delivery,
  };
}
