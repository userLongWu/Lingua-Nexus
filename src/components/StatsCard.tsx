interface StatsCardProps {
  label: string;
  value: number;
  detail: string;
}

export function StatsCard({ label, value, detail }: StatsCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </section>
  );
}
