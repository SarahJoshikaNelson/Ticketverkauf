import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SalesOverview } from "@ticket-system/models";

interface Props {
  sales: SalesOverview;
}

function StudentsVsExtern({ sales }: Props) {
  const chartData = [
    { name: "Schüler Tickets", value: sales.studentTickets },
    { name: "Standart Tickets", value: sales.externalTickets },
  ];

  const COLORS = ["var(--color-students)", "var(--color-externals)"];

  return (
    <div className="w-full max-w-100 h-100 min-w-62.5">
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

export default StudentsVsExtern;
