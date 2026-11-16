import React from "react";
import { Plus } from "@phosphor-icons/react";

import type { AppCopy } from "../lib/appCopy";
import { safeExternalUrl } from "../lib/appUiHelpers";
import type { ResourceLink } from "../lib/types";

export function TopicResourcesSection({
  copy,
  resources,
  deleteTargetId,
  deleting,
  deleteError,
  onAdd,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  copy: AppCopy;
  resources: ResourceLink[];
  deleteTargetId: string | null;
  deleting: boolean;
  deleteError: string | null;
  onAdd: () => void;
  onEdit: (resource: ResourceLink) => void;
  onRequestDelete: (resource: ResourceLink) => void;
  onConfirmDelete: (resource: ResourceLink) => void;
  onCancelDelete: () => void;
}): React.JSX.Element {
  const visibleResources = resources
    .map((resource) => ({ resource, safeUrl: safeExternalUrl(resource.url) }))
    .filter((item): item is { resource: ResourceLink; safeUrl: string } => Boolean(item.safeUrl));

  return (
    <div className="topicPopoverSection">
      <div className="topicPopoverSectionHeader">
        <div className="topicPopoverLabel">{copy.topic.resources}</div>
        <button className="topicPopoverResourceAddButton" type="button" aria-label={copy.topic.addResource} title={copy.topic.addResource} onClick={onAdd}>
          <Plus size={12} weight="bold" aria-hidden="true" />
          <span>{copy.topic.addResource}</span>
        </button>
      </div>
      {visibleResources.length > 0 ? (
        <div className="topicPopoverList">
          {visibleResources.map(({ resource, safeUrl }) => (
            <div key={resource.id} className="topicPopoverResourceRow">
              <a className="topicPopoverLink" href={safeUrl} rel="noopener noreferrer nofollow" target="_blank">
                <span>{resource.label}</span>
                <span className="topicPopoverLinkKind">{resource.kind}</span>
              </a>
              {deleteTargetId === resource.id ? (
                <div className="topicPopoverResourceConfirm">
                  <span>{copy.topic.confirmDeleteResource(resource.label)}</span>
                  <button className="topicPopoverResourceAction topicPopoverResourceDelete" type="button" disabled={deleting} onClick={() => onConfirmDelete(resource)}>{copy.dialogs.delete}</button>
                  <button className="topicPopoverResourceAction" type="button" disabled={deleting} onClick={onCancelDelete}>{copy.dialogs.cancel}</button>
                </div>
              ) : (
                <div className="topicPopoverResourceActions">
                  <button className="topicPopoverResourceAction" type="button" aria-label={copy.topic.editResource(resource.label)} title={copy.topic.editResource(resource.label)} onClick={() => onEdit(resource)}>{copy.topic.editResourceShort}</button>
                  <button className="topicPopoverResourceAction topicPopoverResourceDelete" type="button" aria-label={copy.topic.deleteResource} title={copy.topic.deleteResource} onClick={() => onRequestDelete(resource)}>{copy.dialogs.delete}</button>
                </div>
              )}
            </div>
          ))}
          {deleteError ? <div className="topicPopoverResourceError">{deleteError}</div> : null}
        </div>
      ) : (
        <div className="topicPopoverEmpty">{copy.topic.noResources}</div>
      )}
    </div>
  );
}
