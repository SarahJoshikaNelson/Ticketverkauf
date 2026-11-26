import { SalesOverview } from "@ticket-system/models";
import {
  Area,
  YAxis,
  CartesianGrid,
  Tooltip,
  XAxis,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

function WeekOverview({ salesOverview }: { salesOverview: SalesOverview }) {
  const getDayName = (dayIndex: number) => {
    const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const today = new Date().getDay();
    const targetDay = (today - 6 + dayIndex) % 7;
    return days[targetDay < 0 ? targetDay + 7 : targetDay];
  };

  const data = [];

  const pastWeekProfit = [...salesOverview.pastWeekProfit].reverse();
  const pastWeekOrderCount = [...salesOverview.pastWeekOrderCount].reverse();
  const pastWeekExternalProfit = [
    ...salesOverview.pastWeekExternalProfit,
  ].reverse();
  const pastWeekStudentProfit = [
    ...salesOverview.pastWeekStudentProfit,
  ].reverse();
  const pastWeekTableProfit = [...salesOverview.pastWeekTableProfit].reverse();
  const pastWeekPhysicalTickets = [
    ...salesOverview.pastWeekPhysicalTickets,
  ].reverse();

  for (let i = 0; i < 7; i++) {
    data.push({
      name: getDayName(i),
      profit: pastWeekProfit[i] || 0,
      orders: pastWeekOrderCount[i] || 0,
      externalProfit: pastWeekExternalProfit[i] || 0,
      studentProfit: pastWeekStudentProfit[i] || 0,
      tableProfit: pastWeekTableProfit[i] || 0,
      physicalTickets: pastWeekPhysicalTickets[i] || 0,
    });
  }

  return (
    <div className="w-full flex flex-col justify-center items-center mt-10">
      <h1 className="sm:text-2xl font-bold text-center mb-5 max-sm:text-xl max-sm:hidden">
        Wochenübersicht
      </h1>
      <h1 className="text-2xl font-bold text-center mb-5 sm:hidden">Wochen-</h1>
      <h1 className="text-2xl font-bold text-center mb-5 sm:hidden">
        Übersicht
      </h1>
      <div className="w-full max-w-125 h-62.5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotalProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="colorExternalProfit"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="colorStudentProfit"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTableProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#3b82f6"
              fillOpacity={0.8}
              fill="url(#colorTotalProfit)"
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#10b981"
              fillOpacity={0.8}
              fill="url(#colorOrders)"
            />
            <Area
              type="monotone"
              dataKey="externalProfit"
              stroke="#f59e0b"
              fillOpacity={0.8}
              fill="url(#colorExternalProfit)"
            />
            <Area
              type="monotone"
              dataKey="studentProfit"
              stroke="#8b5cf6"
              fillOpacity={0.8}
              fill="url(#colorStudentProfit)"
            />
            <Area
              type="monotone"
              dataKey="tableProfit"
              stroke="#ef4444"
              fillOpacity={0.8}
              fill="url(#colorTableProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default WeekOverview;
