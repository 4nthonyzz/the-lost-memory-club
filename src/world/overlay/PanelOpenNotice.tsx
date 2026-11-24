export const PANEL_NOTICE_TEXT =
  'Station request sent. Click the view or press Enter to continue exploring. Messages appear below the scene.';
export const PANEL_NOTICE_PASSIVE_TEXT =
  'Station request sent. The view resumes when the panel closes. Messages appear below the scene.';

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
