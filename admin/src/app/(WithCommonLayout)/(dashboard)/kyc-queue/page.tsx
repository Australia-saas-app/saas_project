import { Protect } from "@/src/core/authentication/utils/Protect";
import KycQueuePage from "@/src/business/dashboard/kyc-queue/components/KycQueuePage";

export default function KycQueueRoute() {
  return (
    <Protect permissions={["approve_kyc"]} fallback={<div className="p-8 text-slate-500">You do not have permission to view this page.</div>}>
      <KycQueuePage />
    </Protect>
  );
}
