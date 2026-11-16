import React from "react";

import type { AppCopy } from "../lib/appCopy";
import { renderDisplayText } from "../lib/appUiHelpers";
import type { Topic } from "../lib/types";
import { Modal } from "./ui/Modal";

export type ReviewRating = "again" | "hard" | "remembered";

export function TopicReviewDialog({
  topic,
  open,
  modalRef,
  copy,
  answer,
  setAnswer,
  revealed,
  reveal,
  saving,
  error,
  close,
  rate,
}: {
  topic: Topic | null;
  open: boolean;
  modalRef: React.RefObject<HTMLDivElement | null>;
  copy: AppCopy;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  revealed: boolean;
  reveal: () => void;
  saving: boolean;
  error: string | null;
  close: () => void;
  rate: (rating: ReviewRating) => void;
}): React.JSX.Element | null {
  if (!open || !topic) return null;
  return (
    <Modal
      id="topic-review-dialog"
      modalRef={modalRef}
      title={copy.topic.review}
      description={topic.title}
      closeLabel={copy.dialogs.cancel}
      onClose={close}
      footer={revealed ? <div className="topicReviewActions">
        <button className="uiButton uiButtonQuiet" type="button" disabled={saving} onClick={() => rate("again")}>{copy.topic.reviewAgain}</button>
        <button className="uiButton uiButtonQuiet" type="button" disabled={saving} onClick={() => rate("hard")}>{copy.topic.reviewHard}</button>
        <button className="uiButton uiButtonPrimary" type="button" disabled={saving} onClick={() => rate("remembered")}>{copy.topic.reviewRemembered}</button>
      </div> : <button className="uiButton uiButtonPrimary" type="button" disabled={!answer.trim()} onClick={reveal}>{copy.topic.reviewReveal}</button>}
    >
      <p className="uiModalText">{copy.topic.reviewQuestion(topic.title)}</p>
      <label className="uiField">
        <span className="uiLabel">{copy.topic.reviewAnswer}</span>
        <textarea className="uiTextarea" value={answer} onChange={(event) => setAnswer(event.target.value)} readOnly={revealed} />
      </label>
      {revealed ? <div className="uiField"><span className="uiLabel">{copy.topic.reviewReference}</span><div className="topicPopoverCopy">{renderDisplayText(topic.description)}</div></div> : null}
      {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}
    </Modal>
  );
}
