import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { CanonicalAction, PublicComponentId } from "../../data/canonical";
import type { ScreenViewModel } from "../../data/screenViewModel";

export interface ProductionComponentProps {
  model: ScreenViewModel;
  activeRoleId: string;
  setActiveRoleId: Dispatch<SetStateAction<string>>;
  onAction: (action: CanonicalAction) => void;
  actionMessage?: string;
  children?: ReactNode;
}

export interface ComponentFrameProps extends ProductionComponentProps {
  componentId: PublicComponentId;
  className?: string;
}
