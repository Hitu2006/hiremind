import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
          AI-powered interview preparation
        </p>

        <h1 className="max-w-3xl text-5xl font-bold leading-tight md:text-6xl">
          HireMind helps candidates prepare for their next interview.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Upload your résumé, choose a job role, complete an adaptive AI
          interview, and receive clear feedback on your strengths and skill gaps.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/setup"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Practice Interview
          </Link>

          <button className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300">
            Learn How It Works
          </button>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          <Feature
            number="01"
            title="Upload résumé"
            description="We extract your skills, projects, and experience."
          />
          <Feature
            number="02"
            title="Practice interview"
            description="Receive role-specific questions that adapt to your answers."
          />
          <Feature
            number="03"
            title="Get feedback"
            description="Review scores, strengths, improvement areas, and next steps."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900 p-6">
      <p className="text-sm font-bold text-cyan-400">{number}</p>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-slate-300">{description}</p>
    </article>
  );
}