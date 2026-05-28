import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus, Retailer, Staff } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";

interface OrdersListProps {
  orders: Order[];
  isAdmin?: boolean;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  highlightNew?: boolean;
  retailers:Retailer[];
  staff:Staff[];
}

type OrderLineItem = Order["items"][number];

interface GroupedSizeLine {
  size: string;
  qty: number;
  rate: number;
  mrp: number;
}

interface GroupedOrderItem {
  key: string;
  srNo: number;
  bookingType: string;
  description: string;
  designNo: string;
  setPcs: number;
  color?: string;
  sizes: GroupedSizeLine[];
  totalQty: number;
  totalRateAmount: number;
  totalMrpAmount: number;
}

interface LinePricing {
  rate: number;
  mrp: number;
}

const SIZE_PRIORITY = [
  "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL",
  "28", "30", "32", "34", "36", "38", "40", "42", "44", "46",
];

const sizeRank = new Map(SIZE_PRIORITY.map((size, index) => [size, index]));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sortSizes = (sizes: string[]) =>
  [...sizes].sort((left, right) => {
    const leftRank = sizeRank.get(left.toUpperCase());
    const rightRank = sizeRank.get(right.toUpperCase());
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  });

const resolveLinePricing = (item: OrderLineItem, preferLowerPriceAsRate: boolean): LinePricing => {
  console.log("resolveLinePricing:", item);
  const snapshot = item.attributes_snapshot ?? {};
  const snapshotRate = Number(snapshot.rate ?? snapshot.dealer_rate ?? snapshot.wholesale_rate ?? 0);
  const snapshotMrp = Number(snapshot.mrp ?? 0);
  const orderPrice = Number(item.price ?? 0);
  const productPrice = Number(item.product?.price ?? 0);
  const productMrp = Number(item.product?.mrp ?? 0);

  if (snapshotRate > 0 || snapshotMrp > 0) {
    return {
      rate: snapshotRate > 0 ? snapshotRate : orderPrice || productPrice || snapshotMrp,
      mrp: snapshotMrp > 0 ? snapshotMrp : Math.max(snapshotRate || 0, orderPrice || 0, productMrp || 0, productPrice || 0),
    };
  }

  if (productMrp > 0) {
    return {
      rate: orderPrice || Math.min(productPrice || productMrp, productMrp),
      mrp: Math.max(productMrp, orderPrice || 0, productPrice || 0),
    };
  }

  if (preferLowerPriceAsRate && orderPrice > 0 && productPrice > 0 && orderPrice !== productPrice) {
    return {
      rate: Math.min(orderPrice, productPrice),
      mrp: Math.max(orderPrice, productPrice),
    };
  }

  return {
    rate: orderPrice || productPrice || 0,
    mrp: productPrice || orderPrice || 0,
  };
};

const getItemMeta = (item: OrderLineItem, preferLowerPriceAsRate: boolean) => {
  const snapshot = item.attributes_snapshot ?? {};
  const garmentMeta = snapshot.garment_meta ?? {};
  const pricing = resolveLinePricing(item, preferLowerPriceAsRate);
  return {
    bookingType: snapshot.booking_type ?? garmentMeta.booking_type ?? "Current",
    designNo: snapshot.design_number ?? garmentMeta.design_number ?? garmentMeta.designNumber ?? "-",
    mrp: Number(snapshot.mrp ?? garmentMeta.mrp ?? pricing.mrp),
    rate: pricing.rate,
    setQuantity: Number(snapshot.set_quantity ?? 0),
    color: item.color ?? garmentMeta.selectedColor ?? snapshot.color ?? "",
  };
};

const groupOrderItems = (order: Order, preferLowerPriceAsRate = false) => {
  const groups = new Map<string, GroupedOrderItem>();

  order.items.forEach((item) => {
    const meta = getItemMeta(item, preferLowerPriceAsRate);
    const size = String(item.size || "Single");
    const rate = Number(meta.rate || item.price || item.product?.price || 0);
    const mrp = Number(meta.mrp || rate);
    const description = item.product?.name || "Product";
    const groupKey = [
      item.productId,
      description,
      meta.designNo,
      meta.bookingType,
      meta.color,
    ].join("__");

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        srNo: groups.size + 1,
        bookingType: meta.bookingType,
        description,
        designNo: meta.designNo,
        setPcs: meta.setQuantity > 0 ? 1 : 0,
        color: meta.color,
        sizes: [],
        totalQty: 0,
        totalRateAmount: 0,
        totalMrpAmount: 0,
      });
    }

    const group = groups.get(groupKey)!;
    const existingSize = group.sizes.find((entry) => entry.size === size);

    if (existingSize) {
      existingSize.qty += Number(item.quantity || 0);
      existingSize.rate = rate;
      existingSize.mrp = mrp;
    } else {
      group.sizes.push({
        size,
        qty: Number(item.quantity || 0),
        rate,
        mrp,
      });
    }

    group.totalQty += Number(item.quantity || 0);
    group.totalRateAmount += rate * Number(item.quantity || 0);
    group.totalMrpAmount += mrp * Number(item.quantity || 0);
    if (meta.setQuantity > 0) {
      group.setPcs = 1;
    }
  });

  const groupedItems = Array.from(groups.values()).map((group) => ({
    ...group,
    sizes: sortSizes(group.sizes.map((entry) => entry.size)).map(
      (size) => group.sizes.find((entry) => entry.size === size)!
    ),
  }));

  const allSizes = sortSizes(
    Array.from(new Set(groupedItems.flatMap((group) => group.sizes.map((entry) => entry.size))))
  );

  const totals = groupedItems.reduce(
    (accumulator, group) => ({
      totalQty: accumulator.totalQty + group.totalQty,
      totalRateAmount: accumulator.totalRateAmount + group.totalRateAmount,
      totalMrpAmount: accumulator.totalMrpAmount + group.totalMrpAmount,
    }),
    { totalQty: 0, totalRateAmount: 0, totalMrpAmount: 0 }
  );

  return { groupedItems, allSizes, totals };
};

const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  isAdmin = false,
  onStatusChange,
  highlightNew = false,
  retailers,
  staff
}) => {
  const { user } = useAuth();
  const preferLowerPriceAsRate = Number(user?.business_type_id) === 2;

  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(orders);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportRetailerId, setReportRetailerId] = useState<string>("all");
  const [reportStaffId, setReportStaffId] = useState<string>("all");
  const [activeTabForOrder, setActiveTabForOrder] = useState<string>("all");

  const selectedOrderGroups = useMemo(
    () => (selectedOrder ? groupOrderItems(selectedOrder, preferLowerPriceAsRate) : null),
    [preferLowerPriceAsRate, selectedOrder]
  );
  console.log("Selected Order Groups:", selectedOrder);
  const handlePrintInvoice = (order: Order) => {
    const invoiceWindow = window.open("", "_blank", "width=1200,height=900");
    if (!invoiceWindow) return;

    const orderDate = new Date(order.createdAt);
    const { groupedItems, allSizes, totals } = groupOrderItems(order, preferLowerPriceAsRate);
    const sizeColumns = allSizes
      .map((size) => `<th>${escapeHtml(size)}</th>`)
      .join("");
    const rows = groupedItems
      .map((group) => {
        const sizeCells = allSizes
          .map((size) => {
            const line = group.sizes.find((entry) => entry.size === size);
            if (!line) {
              return `<td class="size-cell empty"></td>`;
            }

            return `
              <td class="size-cell">
                <div class="metric qty-label">Qty</div>
                <div class="metric qty-value">${line.qty}</div>
                <div class="metric rate-label">Rate</div>
                <div class="metric rate-value">${formatMoney(line.rate)}</div>
                <div class="metric mrp-label">MRP</div>
                <div class="metric mrp-value">${formatMoney(line.mrp)}</div>
              </td>
            `;
          })
          .join("");

        return `
          <tr>
            <td>${group.srNo}</td>
            <td>${escapeHtml(group.bookingType)}</td>
            <td>
              <div class="desc-name">${escapeHtml(group.description)}</div>
              ${group.color ? `<div class="desc-sub">${escapeHtml(group.color)}</div>` : ""}
            </td>
            <td>${group.setPcs || ""}</td>
            <td>${escapeHtml(group.designNo)}</td>
            <td class="metric-head">
              <div class="metric qty-label">Qty</div>
              <div class="metric rate-label">Rate</div>
              <div class="metric mrp-label">MRP</div>
            </td>
            ${sizeCells}
            <td>${group.totalQty}</td>
            <td>Rs.${formatMoney(group.totalRateAmount)}</td>
            <td>Rs.${formatMoney(group.totalMrpAmount)}</td>
          </tr>
        `;
      })
      .join("");

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${order.id}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 12px; }
            .sheet { border: 2px solid #111827; padding: 12px; }
            .brand { text-align: center; margin-bottom: 16px; }
            .brand h1 { margin: 0; font-size: 28px; letter-spacing: 0.08em; }
            .brand p { margin: 4px 0 0; font-size: 13px; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr; border: 2px solid #111827; border-bottom: 0; }
            .meta-card { min-height: 120px; border-right: 2px solid #111827; }
            .meta-card:last-child { border-right: 0; }
            .meta-title { background: #111827; color: white; padding: 8px 10px; font-weight: 700; font-size: 18px; }
            .meta-body { padding: 10px; font-size: 14px; line-height: 1.6; }
            .remark { border: 2px solid #111827; border-top: 0; padding: 10px; font-size: 14px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td { border: 1px solid #111827; padding: 6px; font-size: 12px; vertical-align: top; text-align: center; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.04em; }
            .left { text-align: left; }
            .desc-name { font-weight: 700; text-align: left; }
            .desc-sub { margin-top: 4px; font-size: 11px; color: #475569; text-align: left; }
            .metric-head { min-width: 48px; }
            .metric { line-height: 1.35; }
            .qty-label, .qty-value { color: #dc2626; }
            .rate-label, .rate-value { color: #16a34a; }
            .mrp-label, .mrp-value { color: #1d4ed8; }
            .size-cell { min-width: 64px; }
            .empty { background: #fff; }
            .total-row td { font-weight: 700; background: #f8fafc; }
            .summary { display: grid; grid-template-columns: 1.3fr 1fr; border: 2px solid #111827; }
            .terms { padding: 12px; border-right: 2px solid #111827; min-height: 160px; }
            .totals { padding: 12px; }
            .totals p { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
            .small { font-size: 12px; color: #475569; line-height: 1.5; }
            .table-wrap { overflow: visible; }
            @media print {
              body { padding: 0; }
              .sheet { border-width: 1px; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              <h1>INVOICE</h1>
              <p>Garments Wholesale Order Summary</p>
            </div>

            <div class="meta-grid">
              <div class="meta-card">
                <div class="meta-title">Consignee Details</div>
                <div class="meta-body">
                  <div><strong>To:</strong> ${order.retailerName || order.storeName || "-"}</div>
                  <div><strong>Retailer ID:</strong> ${order.retailerId || "-"}</div>
                  <div><strong>Dealer ID:</strong> ${order.dealerId || "-"}</div>
                </div>
              </div>
              <div class="meta-card">
                <div class="meta-title">Party Details</div>
                <div class="meta-body">
                  <div><strong>Sales By:</strong> ${order.order_by || "-"}</div>
                  <div><strong>Salesman ID:</strong> ${order.order_by_id ?? "-"}</div>
                  <div><strong>Status:</strong> ${order.status}</div>
                </div>
              </div>
              <div class="meta-card">
                <div class="meta-title">Order Details</div>
                <div class="meta-body">
                  <div><strong>Order No:</strong> ${String(order.id).slice(0, 8)}</div>
                  <div><strong>Order Date:</strong> ${orderDate.toLocaleDateString("en-IN")}</div>
                  <div><strong>Order Time:</strong> ${orderDate.toLocaleTimeString("en-IN")}</div>
                </div>
              </div>
            </div>

            <div class="remark"><strong>Remark:</strong> ${order.notes || "No notes added"}</div>

            <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Booking Type</th>
                  <th>Description</th>
                  <th>Set pcs</th>
                  <th>Design No</th>
                  <th>#</th>
                  ${sizeColumns}
                  <th>Qty</th>
                  <th>Rate Total</th>
                  <th>MRP Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr class="total-row">
                  <td colspan="${6 + allSizes.length}" class="left">Total</td>
                  <td>${totals.totalQty}</td>
                  <td>Rs.${formatMoney(totals.totalRateAmount)}</td>
                  <td>Rs.${formatMoney(totals.totalMrpAmount)}</td>
                </tr>
              </tbody>
            </table>
            </div>

            <div class="summary">
              <div class="terms">
                <div style="font-weight:700; margin-bottom:8px;">Terms & Conditions</div>
                <div class="small">
                  Goods once sold are subject to dealer order approval and billing rules. Please verify sizes,
                  rates, and dispatch notes before accepting delivery. Payment and transport disputes are handled
                  according to the seller's booking policy.
                </div>
              </div>
              <div class="totals">
                <p>Total Order QTY: ${totals.totalQty}</p>
                <p>Total Rate: Rs.${formatMoney(totals.totalRateAmount)}</p>
                <p>Total MRP: Rs.${formatMoney(totals.totalMrpAmount)}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.print();
  };

  // Update local orders when prop changes
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Filtering logic
  useEffect(() => {
    let filtered = [...localOrders];

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 7);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const endOfLastWeek = new Date(endOfWeek);
    endOfLastWeek.setDate(endOfWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    filtered = filtered.filter((order: Order) => {
      const orderDate = new Date(order.createdAt);

      switch (dateFilter) {
        case "today":
          return orderDate.toDateString() === today.toDateString();
        case "yesterday":
          return orderDate.toDateString() === yesterday.toDateString();
        case "this_week":
          return orderDate >= startOfWeek && orderDate <= endOfWeek;
        case "last_week":
          return orderDate >= startOfLastWeek && orderDate <= endOfLastWeek;
        case "this_month":
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        case "last_month":
          return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
        case "period":
          if (!fromDate || !toDate) return true;
          const from = new Date(fromDate);
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          return orderDate >= from && orderDate <= to;
        default:
          return true;
      }
    });

    if (reportRetailerId !== "all") {
      filtered = filtered.filter((o) => String(o.retailerId) === reportRetailerId);
    }

    if (reportStaffId !== "all") {
      filtered = filtered.filter(
        (o) => String(o.order_by_id) === reportStaffId
      );
    }


    if (activeTabForOrder !== "all") {
      filtered = filtered.filter((o) => o.status === activeTabForOrder);
    }

    setFilteredOrders(filtered);
    setPage(1);
  }, [localOrders, dateFilter, fromDate, toDate, reportRetailerId, reportStaffId, activeTabForOrder]);


  // Sorting + Pagination
  const sortedFiltered = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    if (entriesPerPage === "all") return sorted;
    const start = (page - 1) * limit;
    return sorted.slice(start, start + limit);
  }, [filteredOrders, sortOrder, page, limit, entriesPerPage]);

  const totalPages =
    entriesPerPage === "all" ? 1 : Math.ceil(filteredOrders.length / limit);

  // Helpers
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "dispatched":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isRecentOrder = (order: Order) => {
    const orderTime = new Date(order.createdAt).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return orderTime > oneHourAgo;
  };

  const handleExport = (type: "xlsx" | "csv") => {
    const data = filteredOrders.map((o) => ({
      "Order ID": o.id,
      Retailer: o.retailerName,
      "Store Name": o.storeName,
      Total: o.total,
      Status: o.status,
      Date: new Date(o.createdAt).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders.${type}`);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (onStatusChange) onStatusChange(orderId, newStatus);
  };

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white mb-8">
        {/* Date Filter */}
        <div>
          <label className="text-gray-700 font-semibold mb-1">Date Filter</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select Date Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aa">View All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="period">Custom Period</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateFilter === "period" && (
          <div>
            <label className="text-gray-700 font-semibold mb-1">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <label className="text-gray-700 font-semibold mb-1 mt-2">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        )}

        {/* Retailer Filter */}
        {user?.role !== "retailer" && (
          <div>
            <label className="text-gray-700 font-semibold mb-1">Customers</label>
            <Select
              value={reportRetailerId}
              onValueChange={(value) => setReportRetailerId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Retailer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {retailers.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {user?.role == "dealer" && (
          <div>
              <label className="text-gray-700 font-semibold mb-1">Sales Executive</label>
              <Select
                value={reportStaffId}
                onValueChange={(value) => setReportStaffId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Retailer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        )}

      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        {/* Controls */}
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select
              value={entriesPerPage}
              onValueChange={(value) => {
                setEntriesPerPage(value);
                if (value === "all") setLimit(filteredOrders.length);
                else setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Entries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">entries</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              Sort {sortOrder === "asc" ? "↑" : "↓"}
            </Button>

            {user?.role === "dealer" && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
                  <Download className="w-4 h-4 mr-1" /> Excel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                {isAdmin && <TableHead>Retailer</TableHead>}
                <TableHead>Store Name</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
                {isAdmin && <TableHead>Order By</TableHead>}
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.length > 0 ? (
                sortedFiltered.map((order) => {
                  const isNew =
                    highlightNew &&
                    order.status === "pending" &&
                    isRecentOrder(order);

                  return (
                    <TableRow key={order.id} className={isNew ? "bg-yellow-50" : ""}>
                      <TableCell className="flex items-center gap-1">
                        {String(order.id).slice(0, 8)}
                        {isNew && <AlertTriangle size={16} className="text-yellow-600" />}
                      </TableCell>

                      {isAdmin && <TableCell>{order.retailerName}</TableCell>}
                      <TableCell>{order.storeName}</TableCell>
                      <TableCell>
                        ₹{Number(order.total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={order.status}
                            onValueChange={(value: OrderStatus) =>
                              handleStatusChange(order.id, value)
                            }
                          >
                            <SelectTrigger className={`w-[140px] ${getStatusColor(order.status)}`}>
                              <SelectValue placeholder={order.status} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.notes}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                          
                          <span className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      {isAdmin && <TableCell>
                        {order.order_by}
                      </TableCell>}
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl p-2">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                            </DialogHeader>
                            {selectedOrder && selectedOrder.id === order.id && selectedOrderGroups && (
                              <div className="mt-4 space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Order #{String(selectedOrder.id).slice(0, 8)} -{" "}
                                  {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                                <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
                                  <div className="min-w-[980px]">
                                    <div
                                      className="grid gap-px bg-slate-200 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                                      style={{ gridTemplateColumns: `56px 110px minmax(220px,1fr) 70px 110px 58px repeat(${selectedOrderGroups.allSizes.length}, minmax(66px, 1fr)) 88px 112px 112px` }}
                                    >
                                      <div className="bg-slate-50 px-3 py-3 text-center">Sr</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">Booking Type</div>
                                      <div className="bg-slate-50 px-3 py-3">Description</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">Set pcs</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">Design No</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">#</div>
                                      {selectedOrderGroups.allSizes.map((size) => (
                                        <div key={size} className="bg-slate-50 px-2 py-3 text-center">{size}</div>
                                      ))}
                                      <div className="bg-slate-50 px-3 py-3 text-center">Qty</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">Rate Total</div>
                                      <div className="bg-slate-50 px-3 py-3 text-center">MRP Total</div>
                                    </div>

                                    <div className="divide-y divide-slate-200">
                                      {selectedOrderGroups.groupedItems.map((group) => (
                                        <div
                                          key={group.key}
                                          className="grid gap-px bg-slate-200 text-sm"
                                          style={{ gridTemplateColumns: `56px 110px minmax(220px,1fr) 70px 110px 58px repeat(${selectedOrderGroups.allSizes.length}, minmax(66px, 1fr)) 88px 112px 112px` }}
                                        >
                                          <div className="bg-white px-3 py-4 text-center font-medium">{group.srNo}</div>
                                          <div className="bg-white px-3 py-4 text-center">{group.bookingType}</div>
                                          <div className="bg-white px-3 py-4">
                                            <div className="font-semibold text-slate-900">{group.description}</div>
                                            {group.color ? <div className="mt-1 text-xs text-slate-500">{group.color}</div> : null}
                                          </div>
                                          <div className="bg-white px-3 py-4 text-center">{group.setPcs || "-"}</div>
                                          <div className="bg-white px-3 py-4 text-center">{group.designNo}</div>
                                          <div className="bg-white px-2 py-4 text-[11px] font-semibold leading-6">
                                            <div className="text-red-500">Qty</div>
                                            <div className="text-emerald-600">Rate</div>
                                            <div className="text-blue-600">MRP</div>
                                          </div>
                                          {selectedOrderGroups.allSizes.map((size) => {
                                            const line = group.sizes.find((entry) => entry.size === size);
                                            return (
                                              <div key={`${group.key}-${size}`} className="bg-white px-2 py-4 text-center text-[11px] leading-6">
                                                {line ? (
                                                  <>
                                                    <div className="font-semibold text-red-500">{line.qty}</div>
                                                    <div className="font-medium text-emerald-600">{formatMoney(line.rate)}</div>
                                                    <div className="font-medium text-blue-600">{formatMoney(line.mrp)}</div>
                                                  </>
                                                ) : (
                                                  <div className="text-slate-300">-</div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          <div className="bg-white px-3 py-4 text-center font-semibold">{group.totalQty}</div>
                                          <div className="bg-white px-3 py-4 text-center font-semibold">{formatMoney(group.totalRateAmount)}</div>
                                          <div className="bg-white px-3 py-4 text-center font-semibold">{formatMoney(group.totalMrpAmount)}</div>
                                        </div>
                                      ))}

                                      <div
                                        className="grid gap-px bg-slate-200 text-sm font-semibold"
                                        style={{ gridTemplateColumns: `56px 110px minmax(220px,1fr) 70px 110px 58px repeat(${selectedOrderGroups.allSizes.length}, minmax(66px, 1fr)) 88px 112px 112px` }}
                                      >
                                        <div className="bg-slate-50 px-3 py-4 text-left" style={{ gridColumn: `1 / span ${6 + selectedOrderGroups.allSizes.length}` }}>
                                          Total
                                        </div>
                                        <div className="bg-slate-50 px-3 py-4 text-center">{selectedOrderGroups.totals.totalQty}</div>
                                        <div className="bg-slate-50 px-3 py-4 text-center">{formatMoney(selectedOrderGroups.totals.totalRateAmount)}</div>
                                        <div className="bg-slate-50 px-3 py-4 text-center">{formatMoney(selectedOrderGroups.totals.totalMrpAmount)}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                  <div className="space-y-1">
                                    <div>Total Qty: <span className="font-semibold text-slate-900">{selectedOrderGroups.totals.totalQty}</span></div>
                                    <div>Total Rate Amount: <span className="font-semibold text-slate-900">Rs.{formatMoney(selectedOrderGroups.totals.totalRateAmount)}</span></div>
                                    <div>Total MRP Amount: <span className="font-semibold text-slate-900">Rs.{formatMoney(selectedOrderGroups.totals.totalMrpAmount)}</span></div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() => handlePrintInvoice(selectedOrder)}
                                  >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Invoice
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center text-gray-500 py-4"
                  >
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-3 text-sm text-gray-600 flex-wrap gap-2">
          <div>
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, filteredOrders.length)} of{" "}
            {filteredOrders.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="font-semibold">
              {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersList;
