import StudentList from "@/components/settings/students/student-list";
import UploadModal from "@/components/settings/students/upload-modal";
import AddMaturantModal from "@/components/settings/students/add-maturant-modal";
import ClearAllAlert from "@/components/settings/students/clear-all-alert";
import { useState } from "react";

export default function Students() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-hidden min-w-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Maturantenliste</h1>
        <div className="flex gap-2">
          <ClearAllAlert onSuccess={handleSuccess} />
          <AddMaturantModal onSuccess={handleSuccess} />
          <UploadModal onSuccess={handleSuccess} />
        </div>
      </div>
      <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-2">
        <StudentList key={refreshKey} />
      </div>
    </div>
  );
}

