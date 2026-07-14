import type { PublicComponentId } from "../../data/canonical";
import { publicComponentExports } from "./componentRegistry";
import type { ProductionComponentProps } from "./types";

export function PublicComponent({
  componentId,
  ...props
}: ProductionComponentProps & { componentId: PublicComponentId }) {
  if (componentId === "CMP-002") return null;
  const Component = publicComponentExports[componentId];
  return <Component {...props} />;
}
