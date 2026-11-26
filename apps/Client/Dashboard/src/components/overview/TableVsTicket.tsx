import { SalesOverview } from "@ticket-system/models";
import {
  Cell,
  Legend,
  Pie,
  Tooltip,
  ResponsiveContainer,
  PieChart,
} from "recharts";

interface Props {
  sales: SalesOverview;
}

function TableVsTicket({ sales }: Props) {
  const chartData = [
    { name: "Tisch", value: sales.tableProfit },
    { name: "Ticket", value: sales.studentProfit + sales.externalProfit },
  ];

  const COLORS = ["var(--color-table)", "var(--color-ticket)"];

  return (
    <div className="w-full max-w-[400px] h-[400px] min-w-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TableVsTicket;
