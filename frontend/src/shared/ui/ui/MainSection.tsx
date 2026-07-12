interface MainSectionProps {
  children: React.ReactNode;
}

export default function MainSection({ children }: MainSectionProps) {
  return (
    <main className="min-h-screen p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-20  xl:px-30">{children}</div>
    </main>
  );
}
