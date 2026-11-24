export const PANEL_NOTICE_TEXT = 'Panel open · Click here or press Enter to resume';
export const PANEL_NOTICE_PASSIVE_TEXT = 'Panel open · The view resumes when the panel closes';

export interface PanelOpenNoticeProps {
  /** True when the user can resume by click/Enter (inputEnabled prop absent). */
  canResume?: boolean;
}

export function PanelOpenNotice({ canResume = true }: PanelOpenNoticeProps) {
  return (
    <div className="world-panel-notice">
      <span className="world-chip">{canResume ? PANEL_NOTICE_TEXT : PANEL_NOTICE_PASSIVE_TEXT}</span>
    </div>
  );
}
