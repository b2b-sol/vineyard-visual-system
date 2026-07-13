import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";

export function NotFoundPage() {
  return (
    <div className="not-found page-frame">
      <p className="eyebrow">Atlas route not found</p>
      <h1>This row ends here.</h1>
      <p className="lede">
        The requested atlas artifact is not registered at this stable route.
      </p>
      <Link className="button button-primary" to="/">
        Return to atlas home <Icon name="chevron" />
      </Link>
    </div>
  );
}
