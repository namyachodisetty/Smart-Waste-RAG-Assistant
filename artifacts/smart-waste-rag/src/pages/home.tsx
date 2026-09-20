import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  ExternalLink,
  Leaf,
  LoaderCircle,
  Recycle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  getGetWasteExamplesQueryKey,
  useAnalyzeWaste,
  useGetWasteExamples,
} from '@workspace/api-client-react';
import type { WasteAnalysis, WasteEvidence } from '@workspace/api-client-react';

function getScorePercent(score: number) {
  return Math.round(score <= 1 ? score * 100 : score);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

function EvidenceCard({ evidence, index }: { evidence: WasteEvidence; index: number }) {
  const score = getScorePercent(evidence.relevanceScore);

  return (
    <article
      className="lift-card rounded-2xl border border-card-border bg-card p-5 shadow-sm"
      data-testid={`card-evidence-${index}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <BookOpen size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Retrieved source {String(index + 1).padStart(2, '0')}</p>
            <h3 className="mt-1 truncate font-semibold text-card-foreground" data-testid={`text-evidence-item-${index}`}>
              {evidence.wasteItem}
            </h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="eyebrow text-muted-foreground">Match</p>
          <p className="mt-1 font-mono text-sm font-medium text-primary" data-testid={`text-evidence-score-${index}`}>
            {score}%
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground">{evidence.category}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{evidence.disposalMethod}</span>
      </div>

      <dl className="grid gap-4 text-sm">
        <div>
          <dt className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">Why it matters</dt>
          <dd className="leading-relaxed text-card-foreground/80">{evidence.reason}</dd>
        </div>
        <div className="border-t border-border pt-4">
          <dt className="mb-1 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck size={13} /> Safety note
          </dt>
          <dd className="leading-relaxed text-card-foreground/80">{evidence.safetyGuidance}</dd>
        </div>
        <div className="border-t border-border pt-4">
          <dt className="mb-1 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            <Leaf size={13} /> Sustainability
          </dt>
          <dd className="leading-relaxed text-card-foreground/80">{evidence.sustainabilityImpact}</dd>
        </div>
      </dl>
    </article>
  );
}

function ResultView({ analysis }: { analysis: WasteAnalysis }) {
  const isAiGenerated = analysis.aiGenerated;
  const hasEvidence = analysis.evidence.length > 0;

  return (
    <section className="reveal-in mt-16" aria-labelledby="result-heading" data-testid="section-analysis-result">
      <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3 text-primary">Your field note</p>
          <h2 id="result-heading" className="display-heading text-3xl text-foreground sm:text-4xl">
            Guidance for <span className="text-primary">this item.</span>
          </h2>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
            isAiGenerated ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
          }`}
          data-testid="status-analysis-mode"
        >
          {isAiGenerated ? <Sparkles size={14} /> : <BookOpen size={14} />}
          {isAiGenerated ? `Grounded by ${analysis.aiProvider || 'AI'}` : 'Retrieval-only guidance'}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-[0_20px_50px_hsl(var(--primary)/0.16)] sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/75">
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/10">
                <Check size={16} />
              </span>
              Recommended route
            </div>
            <span className="rounded-full border border-primary-foreground/20 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-primary-foreground/70">
              {analysis.category}
            </span>
          </div>
          <p className="max-w-2xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-5xl" data-testid="text-recommended-disposal">
            {analysis.recommendedDisposal}
          </p>
          <div className="mt-9 grid gap-5 border-t border-primary-foreground/15 pt-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-2 text-primary-foreground/55">The short answer</p>
              <p className="text-sm leading-relaxed text-primary-foreground/80" data-testid="text-analysis-why">{analysis.why}</p>
            </div>
            <div>
              <p className="eyebrow mb-2 text-primary-foreground/55">Assistant note</p>
              <p className="text-sm leading-relaxed text-primary-foreground/80" data-testid="text-analysis-response">{analysis.response}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-card-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <ShieldCheck size={18} />
              <h3 className="font-semibold">Handle with care</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-analysis-safety">{analysis.safetyGuidance}</p>
          </div>
          <div className="rounded-3xl border border-card-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Leaf size={18} />
              <h3 className="font-semibold">Why this route helps</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-analysis-impact">{analysis.sustainabilityImpact}</p>
          </div>
        </div>
      </div>

      {!isAiGenerated && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-accent/50 bg-accent/20 p-4 text-sm text-foreground" data-testid="status-retrieval-only-note">
          <CircleHelp className="mt-0.5 shrink-0 text-primary" size={17} />
          <p>
            This answer is based directly on the retrieved knowledge base. The AI writing layer was not available, so the recommendation is shown without generated interpretation.
          </p>
        </div>
      )}

      <div className="mt-14">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2 text-primary">Evidence trail</p>
            <h2 className="display-heading text-3xl text-foreground">What grounded this answer?</h2>
          </div>
          <p className="font-mono text-xs text-muted-foreground" data-testid="text-retrieval-count">
            {analysis.retrievalCount} {analysis.retrievalCount === 1 ? 'source' : 'sources'} retrieved
          </p>
        </div>
        {hasEvidence ? (
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.evidence.map((evidence, index) => (
              <EvidenceCard key={`${evidence.wasteItem}-${index}`} evidence={evidence} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground" data-testid="empty-evidence">
            No matching evidence passages were returned for this question.
          </div>
        )}
      </div>
    </section>
  );
}

function Home() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const analyzeWaste = useAnalyzeWaste();
  const examplesQuery = useGetWasteExamples({
    query: { queryKey: getGetWasteExamplesQueryKey() },
  });
  const examples = useMemo(() => examplesQuery.data?.examples ?? [], [examplesQuery.data?.examples]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 3 || analyzeWaste.isPending) return;
    setSubmittedQuestion(trimmedQuestion);
    analyzeWaste.mutate({ data: { question: trimmedQuestion } });
  };

  const handleRetry = () => {
    if (!submittedQuestion || analyzeWaste.isPending) return;
    analyzeWaste.mutate({ data: { question: submittedQuestion } });
  };

  const handleExampleClick = (example: string) => {
    setQuestion(example);
    window.requestAnimationFrame(() => document.getElementById('question-input')?.focus());
  };

  const questionTooShort = question.trim().length > 0 && question.trim().length < 3;

  return (
    <main className="field-guide-shell min-h-[100dvh]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10" data-testid="site-header">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Recycle size={21} strokeWidth={2.2} />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold leading-none tracking-[-0.02em]">Fieldnote</p>
            <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Waste guidance</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-primary" />
          Evidence before assumption
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:px-10">
        <section className="grid gap-10 pb-12 pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:gap-20 lg:pt-20">
          <div className="reveal-in">
            <p className="eyebrow mb-6 flex items-center gap-2 text-primary">
              <span className="inline-block h-px w-7 bg-primary" />
              A practical answer, not a guess
            </p>
            <h1 className="display-heading max-w-3xl text-5xl text-foreground sm:text-7xl lg:text-[5.8rem]" data-testid="heading-home">
              Where does <span className="text-primary">this</span> go?
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ask about one item. Get a clear disposal route, the reason behind it, and the exact guidance retrieved from our waste knowledge base.
            </p>
          </div>
          <div className="reveal-in-delay border-l-2 border-accent pl-5 lg:mb-2">
            <p className="font-serif text-xl leading-snug text-foreground">
              “Small decisions become systems when we make them easier to repeat.”
            </p>
            <p className="mt-4 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">The Fieldnote principle</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-card-border bg-card p-4 shadow-[0_20px_70px_hsl(var(--primary)/0.07)] sm:p-6" aria-labelledby="question-label">
          <form onSubmit={handleSubmit}>
            <div className="rounded-[1.4rem] border border-border bg-background/60 p-5 transition-colors focus-within:border-primary/50 focus-within:bg-card sm:p-7">
              <div className="mb-4 flex items-center justify-between gap-4">
                <label id="question-label" htmlFor="question-input" className="eyebrow text-muted-foreground">
                  Your waste question
                </label>
                <span className="font-mono text-[0.65rem] text-muted-foreground">{question.length}/500</span>
              </div>
              <textarea
                id="question-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
                placeholder="e.g. Can I recycle a greasy pizza box?"
                rows={3}
                minLength={3}
                maxLength={500}
                className="w-full resize-none bg-transparent font-serif text-2xl leading-snug tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-3xl"
                data-testid="input-waste-question"
              />
              <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Search size={14} />
                  Name the item and include any detail that changes its disposal.
                </p>
                <button
                  type="submit"
                  disabled={question.trim().length < 3 || analyzeWaste.isPending}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  data-testid="button-analyze-waste"
                >
                  {analyzeWaste.isPending ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Checking sources
                    </>
                  ) : (
                    <>
                      Analyze item
                      <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          {questionTooShort && (
            <p className="mt-3 px-2 text-xs text-destructive" data-testid="validation-question">
              Add a few more words so the field guide can find a useful match.
            </p>
          )}
          {analyzeWaste.isPending && (
            <div className="mt-5 grid gap-3 px-2" data-testid="status-analysis-loading" aria-live="polite">
              <div className="skeleton-line h-3 w-40 rounded-full" />
              <div className="skeleton-line h-7 w-4/5 rounded-lg" />
              <div className="skeleton-line h-3 w-3/5 rounded-full" />
            </div>
          )}
          {analyzeWaste.isError && (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="status-analysis-error">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-destructive" size={18} />
                <div>
                  <p className="text-sm font-semibold text-foreground">The field guide could not answer just now.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {getErrorMessage(analyzeWaste.error, 'Please check your connection and try again.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:self-auto"
                data-testid="button-retry-analysis"
              >
                <RotateCcw size={14} />
                Try again
              </button>
            </div>
          )}
        </section>

        <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start" aria-labelledby="examples-heading">
          <div className="flex shrink-0 items-center gap-2 pt-2 text-muted-foreground">
            <Sparkles size={15} className="text-accent-foreground" />
            <h2 id="examples-heading" className="font-mono text-[0.65rem] uppercase tracking-[0.14em]">Try asking</h2>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {examplesQuery.isLoading ? (
              <>
                <div className="skeleton-line h-8 w-44 rounded-full" />
                <div className="skeleton-line h-8 w-52 rounded-full" />
                <div className="skeleton-line h-8 w-36 rounded-full" />
              </>
            ) : examplesQuery.isError ? (
              <button
                type="button"
                onClick={() => examplesQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                data-testid="button-retry-examples"
              >
                Examples unavailable · reload
                <RotateCcw size={12} />
              </button>
            ) : examples.length > 0 ? (
              examples.slice(0, 5).map((example, index) => (
                <button
                  key={`${example}-${index}`}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 text-left text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:text-primary"
                  data-testid={`button-example-${index}`}
                >
                  {example}
                  <ArrowDown size={12} className="rotate-[-45deg] opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Ask about packaging, electronics, textiles, or food scraps.</p>
            )}
          </div>
        </section>

        {analyzeWaste.data && !analyzeWaste.isPending && <ResultView analysis={analyzeWaste.data} />}

        {!analyzeWaste.data && !analyzeWaste.isPending && (
          <section className="mt-20 grid gap-5 border-t border-border pt-8 sm:grid-cols-3" aria-label="How it works">
            <div className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Search size={16} /></div>
              <div><p className="text-sm font-semibold">Ask plainly</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">One item per question keeps the answer specific.</p></div>
            </div>
            <div className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BookOpen size={16} /></div>
              <div><p className="text-sm font-semibold">See the evidence</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Every answer shows the passages that informed it.</p></div>
            </div>
            <div className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck size={16} /></div>
              <div><p className="text-sm font-semibold">Dispose with care</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Safety guidance comes with the recommendation.</p></div>
            </div>
          </section>
        )}

        <section className="mt-16 rounded-3xl border border-border bg-card/60 p-6 sm:p-8" aria-labelledby="responsible-ai-heading">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <p className="eyebrow mb-3 text-primary">Built with care</p>
              <h2 id="responsible-ai-heading" className="display-heading text-3xl text-foreground">
                Responsible AI, in plain sight.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This tool is designed to support a disposal decision, not replace local waste-management guidance.
              </p>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
              {[
                ['Fairness', 'The same retrieval process is used for every question, without profiling people.'],
                ['Transparency', 'The answer shows whether AI generation ran and which evidence was retrieved.'],
                ['Privacy', 'No accounts or personal details are needed. Ask about the item, not yourself.'],
                ['Accuracy', 'Check local council or campus rules when collection systems differ by location.'],
                ['Safety', 'Batteries, medicines, chemicals, sharps, and electronics need cautious handling.'],
              ].map(([title, description]) => (
                <div key={title} className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-16 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.13em]">A student field guide for better waste habits</p>
          <p className="flex items-center gap-1.5"><ExternalLink size={12} /> Always follow your local council’s rules.</p>
        </footer>
      </div>
    </main>
  );
}

export default Home;