import type { PropsWithChildren, ReactNode } from "react";
import { Check, CircleUserRound, LoaderCircle, X } from "lucide-react";
import type { Candidate } from "../types";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function CandidateAvatar({
  candidate,
  large = false,
}: {
  candidate: Candidate;
  large?: boolean;
}) {
  return (
    <span className={`avatar soft ${large ? "large" : ""}`}>
      {candidate.photo_url ? (
        <img src={candidate.photo_url} alt="" />
      ) : (
        initials(candidate.full_name)
      )}
    </span>
  );
}

export function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  onClose: () => void;
}>) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">INSIDEGRID</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function FormActions({
  busy,
  onClose,
  label,
}: {
  busy: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="form-actions">
      <button className="secondary-button" type="button" onClick={onClose}>
        Cancel
      </button>
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Check size={17} />
        )}{" "}
        {label}
      </button>
    </div>
  );
}

export interface RequirementResult {
  requirement: string;
  status: "supported" | "partial" | "not_evidenced" | "not_met";
  evidence: string;
  source: string;
}

export function RequirementEvidence({
  title,
  results,
}: {
  title: string;
  results: RequirementResult[];
}) {
  return (
    <div className="evidence-group">
      <h4>{title}</h4>
      <div className="requirement-results">
        {results.map((result) => (
          <div className={result.status} key={result.requirement}>
            <span>
              {result.status === "supported" ? (
                <Check size={14} />
              ) : result.status === "partial" ? (
                "½"
              ) : result.status === "not_met" ? (
                "×"
              ) : (
                "?"
              )}
            </span>
            <div>
              <strong>{result.requirement}</strong>
              <small>
                {result.status === "supported"
                  ? "Supported"
                  : result.status === "partial"
                    ? "Partially supported"
                    : result.status === "not_met"
                      ? "Explicitly not met"
                      : "Not found in profile"}{" "}
                · {result.evidence}
              </small>
              <small>Source: {result.source}</small>
            </div>
          </div>
        ))}
      </div>
      {!results.length && <p className="muted-copy">No criteria specified.</p>}
    </div>
  );
}

export function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className={`insight-list ${tone}`}>
      <strong>{title}</strong>
      {items.map((item) => (
        <p key={item}>
          <span />
          {item}
        </p>
      ))}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <CircleUserRound />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  overview = false,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  overview?: boolean;
}) {
  return (
    <section
      className={`page-heading${actions ? " split" : ""}${overview ? " overview-heading" : ""}`}
    >
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions}
    </section>
  );
}

export function Toolbar({ children }: PropsWithChildren) {
  return <section className="filter-bar">{children}</section>;
}
