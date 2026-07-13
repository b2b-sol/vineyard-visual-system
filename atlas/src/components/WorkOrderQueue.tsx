import type { WorkOrder } from "../data/planningDispatch";
import { Icon } from "./Icon";
import { StatusSignal } from "./StatusSignal";

export type WorkOrderQueueProps = {
  orders: WorkOrder[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function WorkOrderQueue({
  orders,
  selectedId,
  onSelect,
}: WorkOrderQueueProps) {
  const reviewCount = orders.filter((order) =>
    ["blocked", "offline", "stale", "partial"].includes(order.status),
  ).length;

  return (
    <section aria-labelledby="work-queue-title" className="work-queue panel">
      <header className="panel-heading queue-heading">
        <div>
          <p className="kicker">Live schedule</p>
          <h2 id="work-queue-title">Today’s work</h2>
        </div>
        <div className="queue-legend" aria-label="Queue summary">
          <span>
            <strong>{orders.length}</strong> shown
          </span>
          <span>
            <strong>{reviewCount}</strong> need review
          </span>
        </div>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Work + block</th>
              <th scope="col">Window</th>
              <th scope="col">Crew</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                className={selectedId === order.id ? "selected-row" : undefined}
                key={order.id}
              >
                <td>
                  <button
                    aria-label={`Select ${order.id}, ${order.title}, ${order.block}`}
                    aria-pressed={selectedId === order.id}
                    className="work-select"
                    onClick={() => onSelect(order.id)}
                    type="button"
                  >
                    <span className="work-title">{order.title}</span>
                    <span>
                      {order.block} · {order.acres} ac
                    </span>
                    <span className="mono">{order.id}</span>
                  </button>
                </td>
                <td>
                  <span className="cell-primary">{order.window}</span>
                  <span className="cell-secondary">{order.priority}</span>
                </td>
                <td>
                  <span className="cell-primary">{order.crew}</span>
                  <span className="cell-secondary">Lead · {order.lead}</span>
                </td>
                <td>
                  <StatusSignal compact status={order.status} />
                  <span className="cell-secondary">{order.update}</span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="queue-empty" colSpan={4}>
                  No work orders match this filter. Choose another queue view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="work-card-list">
        {orders.map((order) => (
          <button
            aria-label={`Select ${order.id}, ${order.title}, ${order.block}`}
            aria-pressed={selectedId === order.id}
            className={`work-card${selectedId === order.id ? " work-card-selected" : ""}`}
            key={order.id}
            onClick={() => onSelect(order.id)}
            type="button"
          >
            <span className="work-card-top">
              <span className="mono">{order.id}</span>
              <StatusSignal compact status={order.status} />
            </span>
            <strong>{order.title}</strong>
            <span>
              {order.block} · {order.acres} ac
            </span>
            <span className="work-card-meta">
              <span>
                <Icon name="clock" />
                {order.window}
              </span>
              <span>
                <Icon name="crew" />
                {order.crew}
              </span>
            </span>
          </button>
        ))}
        {orders.length === 0 && (
          <p className="queue-empty" role="status">
            No work orders match this filter. Choose another queue view.
          </p>
        )}
      </div>
    </section>
  );
}
