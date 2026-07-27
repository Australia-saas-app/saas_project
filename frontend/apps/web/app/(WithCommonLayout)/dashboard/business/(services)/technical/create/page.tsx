import CreateTechnicalServiceWizard from "@/src/modules/dashboard/business/components/CreateTechnicalServiceWizard";

export const metadata = {
  title: "Post Technical Service | Business Partner Portal",
  description: "Create a new technical service listing for clients on the marketplace.",
};

export default function BusinessCreateTechnicalProjectPage() {
  return <CreateTechnicalServiceWizard />;
}
