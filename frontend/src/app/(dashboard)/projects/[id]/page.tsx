import { ProjectDetails } from "@/business/marketplace/ui/ProjectDetails";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="max-w-6xl mx-auto h-full">
      <ProjectDetails projectId={resolvedParams.id} />
    </div>
  );
}
