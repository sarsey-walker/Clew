import React from "react";

import type { AppCopy } from "../lib/appCopy";
import { renderDisplayText } from "../lib/appUiHelpers";
import type { TopicReviewPrompt } from "../lib/types";
import { Modal } from "./ui/Modal";

export function TopicConnectionDialog({
  prompt,
  topicTitles,
  modalRef,
  copy,
  answer,
  setAnswer,
  revealed,
  reveal,
  close,
}: {
  prompt: TopicReviewPrompt | null;
  topicTitles: [string, string] | null;
  modalRef: React.RefObject<HTMLDivElement | null>;
  copy: AppCopy;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  revealed: boolean;
  reveal: () => void;
  close: () => void;
}): React.JSX.Element | null {
  if (!prompt || !topicTitles) return null;
  return (
    <Modal
      id="topic-connection-dialog"
      modalRef={modalRef}
      title={copy.topic.connectionPractice}
      description={`${topicTitles[0]} ↔ ${topicTitles[1]}`}
      closeLabel={copy.dialogs.cancel}
      onClose={close}
      footer={revealed
        ? <button className="uiButton uiButtonPrimary" type="button" onClick={close}>{copy.topic.connectionDone}</button>
        : <button className="uiButton uiButtonPrimary" type="button" disabled={!answer.trim()} onClick={reveal}>{copy.topic.reviewReveal}</button>}
    >
      <p className="uiModalText">{prompt.question}</p>
      <label className="uiField">
        <span className="uiLabel">{copy.topic.reviewAnswer}</span>
        <textarea className="uiTextarea" value={answer} onChange={(event) => setAnswer(event.target.value)} readOnly={revealed} />
      </label>
      {revealed ? <div className="uiField"><span className="uiLabel">{copy.topic.connectionReference}</span><div className="topicPopoverCopy">{renderDisplayText(prompt.reference)}</div></div> : null}
    </Modal>
  );
}
