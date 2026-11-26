import SalesCharts from "@/components/overview/SalesCharts";

function Home() {
  return (
    <div className="flex flex-col gap-4 overflow-x-hidden items-center">
      <h1 className="text-xl font-bold m-5">Statistiken</h1>
      <SalesCharts />
    </div>
  );
}

export default Home;
