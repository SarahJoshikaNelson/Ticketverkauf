import AdminList from "@/components/settings/admins/admin-list";
import CreateAdmin from "@/components/settings/admins/create-admin";
import CreateExternAdmin from "@/components/settings/admins/create-extern-admin";

export default function Admin() {
  return (
    <div className="flex flex-col gap-6 p-4 overflow-hidden min-w-0 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Admins</h1>
      <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-2">
        <AdminList />
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <CreateAdmin />
          <CreateExternAdmin />
        </div>
      </div>
    </div>
  );
}
