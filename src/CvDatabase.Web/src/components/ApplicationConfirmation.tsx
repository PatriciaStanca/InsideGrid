import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

export function DemoNotice() {
  return <div className="public-demo-notice"><strong>Please note: this is a demo — not a real job.</strong><span>Use a sample CV and test contact details. No recruitment or follow-up will take place.</span></div>;
}

export function ApplicationConfirmation({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="application-confirmation" aria-labelledby="application-thanks-title" aria-describedby="application-thanks-description" onClose={onClose}>
    <button className="confirmation-close" aria-label="Close confirmation" onClick={() => dialog.current?.close()}><X size={20} /></button>
    <span className="confirmation-check"><Check size={28} /></span>
    <h2 id="application-thanks-title">Thank you for applying!</h2>
    <p id="application-thanks-description">Your test application has been received successfully.</p>
    <DemoNotice />
    <button className="primary-button wide" autoFocus onClick={() => dialog.current?.close()}>Back to sample job</button>
  </dialog>;
}
