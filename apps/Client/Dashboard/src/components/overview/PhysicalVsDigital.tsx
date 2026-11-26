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

function PhysicalVsDigital({ sales }: Props) {
  const physicalTickets = sales.physicalStudentTickets + sales.physicalExternalTickets;
  const digitalTickets = (sales.studentTickets - sales.physicalStudentTickets) + (sales.externalTickets - sales.physicalExternalTickets);

  const chartData = [
    { name: "Physische Tickets", value: physicalTickets },
    { name: "Digitale Tickets", value: digitalTickets },
  ];

  const COLORS = ["var(--color-physical)", "var(--color-digital)"];

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

export default PhysicalVsDigital;