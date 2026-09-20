import { useState } from "react";
import { useT } from "../i18n";
import type { Tortoise } from "../types";
import BatchEntryModal from "./BatchEntryModal";

export default function BatchEntryButton({
  tortoises,
  onSaved,
}: {
  tortoises: Tortoise[];
  onSaved: () => Promise<void>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="batch-entry-button"
        onClick={() => setOpen(true)}
        title={t("controls.batchEntry")}
        aria-label={t("controls.batchEntry")}
      >
        +
      </button>
      {open && (
        <BatchEntryModal tortoises={tortoises} onClose={() => setOpen(false)} onSaved={onSaved} />
      )}
    </>
  );
}
