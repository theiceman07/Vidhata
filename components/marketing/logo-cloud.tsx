const PILOT_COMPANIES = [
  "Anaya Textiles",
  "Bharosa Fintech",
  "Trivandrum Cloud Labs",
  "Kavach Robotics",
  "Sundargarh Logistics",
];

export function LogoCloud() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 text-center">
      <p className="mb-4 text-small text-muted-fg">
        Piloting with early-stage teams across India
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {PILOT_COMPANIES.map((name) => (
          <span
            key={name}
            className="font-display text-h3 text-muted-fg/70"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
