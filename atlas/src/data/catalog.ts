export type AtlasSection = {
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  count: string;
  readiness: "live" | "registered" | "evidence";
  items: Array<{ label: string; meta: string }>;
};

export type NavigationGroup = {
  label: string;
  items: Array<{ path: string; label: string }>;
};

export const sections: AtlasSection[] = [
  {
    path: "/about",
    label: "About",
    eyebrow: "Atlas orientation",
    title: "An operating reference, not a gallery",
    summary:
      "The atlas connects vineyard evidence, operational workflows, product decisions, rendered screens, and build-ready specifications.",
    count: "6 principles",
    readiness: "evidence",
    items: [
      { label: "Operational fidelity", meta: "Workflow states stay distinct" },
      { label: "One connected season", meta: "Shared synthetic records" },
      { label: "Structured handoff", meta: "Editable, stable identifiers" },
    ],
  },
  {
    path: "/source-and-confidence",
    label: "Source + confidence",
    eyebrow: "Evidence ledger",
    title: "What is observed, supported, or inferred",
    summary:
      "Source anchors and confidence classifications keep public evidence separate from composite workflow assumptions and field-validation questions.",
    count: "Evidence mapped",
    readiness: "evidence",
    items: [
      { label: "Documented requirement", meta: "Direct public evidence" },
      { label: "Supported composite", meta: "Multiple sources converge" },
      { label: "Field-validation question", meta: "Behavior still to observe" },
    ],
  },
  {
    path: "/operating-model",
    label: "Operating model",
    eyebrow: "Operational truth",
    title: "Five layers coordinate one season",
    summary:
      "Ownership, the operational middle, field execution, office operations, and outside parties exchange decisions and records around stable block identity.",
    count: "5 layers",
    readiness: "registered",
    items: [
      { label: "Ownership + leadership", meta: "Targets, capital, risk" },
      { label: "Operational middle", meta: "Plans become block actions" },
      { label: "Field + external parties", meta: "Execution and constraints" },
    ],
  },
  {
    path: "/seasonal-calendar",
    label: "Seasonal calendar",
    eyebrow: "Time context",
    title: "A year governed by stage and signals",
    summary:
      "The operating calendar layers phenology, recurring work, monitoring cadence, compliance windows, forecast revisions, and harvest commitments.",
    count: "8 seasonal windows",
    readiness: "registered",
    items: [
      { label: "Dormancy → budbreak", meta: "Plan, prune, prepare" },
      { label: "Canopy → véraison", meta: "Monitor, act, forecast" },
      { label: "Harvest → closeout", meta: "Deliver, reconcile, audit" },
    ],
  },
  {
    path: "/roles",
    label: "Roles",
    eyebrow: "Responsibility network",
    title: "Authority is clear on paper and overlapping in practice",
    summary:
      "Role cards trace decisions, inputs, outputs, handoffs, and organization boundaries without assuming clean department lines.",
    count: "Role registry",
    readiness: "registered",
    items: [
      { label: "Vineyard manager", meta: "Plans, resources, closure" },
      { label: "Viticulturist", meta: "Signals to recommendations" },
      { label: "Foreman", meta: "Dispatch to field proof" },
    ],
  },
  {
    path: "/workflows",
    label: "Workflows",
    eyebrow: "Coordination loops",
    title: "Ten priority workflow families",
    summary:
      "Complete workflow packages connect business purpose, sequence, approvals, records, exceptions, product intervention, and review evidence.",
    count: "2 live · 8 registered",
    readiness: "live",
    items: [
      {
        label: "Seasonal planning, dispatch, execution + verification",
        meta: "13-screen production package",
      },
      { label: "Crew, time, payroll + cost", meta: "Live production package" },
      { label: "Scouting → application", meta: "Registered family" },
      { label: "Harvest → reconciliation", meta: "Registered family" },
    ],
  },
  {
    path: "/records",
    label: "Records",
    eyebrow: "Durable operating memory",
    title: "Records retain state, provenance, and correction history",
    summary:
      "Work orders, activity logs, assignments, observations, restrictions, and audit events preserve who knew what and when.",
    count: "Record registry",
    readiness: "registered",
    items: [
      { label: "Work order", meta: "Intent and authorization" },
      { label: "Field activity", meta: "Reported execution" },
      { label: "Verification event", meta: "Accepted operational truth" },
    ],
  },
  {
    path: "/exceptions",
    label: "Exceptions",
    eyebrow: "Non-ideal operations",
    title: "Exceptions are part of the workflow, not side notes",
    summary:
      "Blocked, partial, stale, offline, conflicting, corrected, and superseded states receive explicit resolution paths.",
    count: "8 state classes",
    readiness: "live",
    items: [
      { label: "Blocked", meta: "Restriction prevents dispatch" },
      { label: "Partial", meta: "Completed quantity is explicit" },
      { label: "Corrected", meta: "Original remains inspectable" },
    ],
  },
  {
    path: "/scenarios",
    label: "Scenarios",
    eyebrow: "Operational stories",
    title: "Concrete conditions test the system",
    summary:
      "Scenario cards define trigger, actor, information gaps, decisions, branches, records, device context, and completion conditions.",
    count: "Scenario registry",
    readiness: "registered",
    items: [
      { label: "Routine morning dispatch", meta: "Connected · supervisor" },
      { label: "REI blocks reassignment", meta: "Blocked · urgent" },
      { label: "Offline partial closeout", meta: "Field · delayed sync" },
    ],
  },
  {
    path: "/product-map",
    label: "Product map",
    eyebrow: "Product structure",
    title: "Operational domains organized around action",
    summary:
      "Planning, field execution, agronomy, harvest, compliance, resources, and reporting meet at the block and season context.",
    count: "7 domains",
    readiness: "registered",
    items: [
      { label: "Plan + dispatch", meta: "Intent, capacity, authorization" },
      { label: "Field execution", meta: "Brief, capture, verification" },
      { label: "Records + assurance", meta: "History and reconciliation" },
    ],
  },
  {
    path: "/information-architecture",
    label: "Information architecture",
    eyebrow: "Navigation model",
    title: "Move by operation, not file cabinet",
    summary:
      "The product keeps place and time context persistent while queues, workflows, records, and review surfaces adapt to role and device.",
    count: "Navigation model",
    readiness: "registered",
    items: [
      { label: "Today", meta: "Priority and exceptions" },
      { label: "Work", meta: "Plans through verification" },
      { label: "Blocks", meta: "Identity, history, conditions" },
    ],
  },
  {
    path: "/screens",
    label: "Screens",
    eyebrow: "Screen registry",
    title: "Screens exist to advance or inspect state",
    summary:
      "Each registered composition traces to scenarios, workflows, records, permissions, and consequential actions.",
    count: "13 live screens",
    readiness: "live",
    items: [
      { label: "Daily operations brief", meta: "Responsive · SCR-001" },
      { label: "Crew workboard", meta: "Mobile · SCR-042" },
      { label: "Cost allocation", meta: "Responsive · SCR-045" },
    ],
  },
  {
    path: "/flows",
    label: "Flows",
    eyebrow: "Interaction sequence",
    title: "Product actions follow operational transitions",
    summary:
      "Flow strips show the handoff from planning through assignment, execution, reported completion, verification, and correction.",
    count: "3 live flows",
    readiness: "live",
    items: [
      { label: "Plan → assign", meta: "Desktop manager" },
      { label: "Execute → report", meta: "Mobile crew lead" },
      { label: "Verify → reconcile", meta: "Manager + office" },
    ],
  },
  {
    path: "/wireframes",
    label: "Wireframes",
    eyebrow: "Structure first",
    title: "Task hierarchy before visual finish",
    summary:
      "Low-fidelity compositions define decision priority, information density, responsive responsibility, and exception placement.",
    count: "Review collection",
    readiness: "registered",
    items: [
      { label: "Queue + detail", meta: "Dense desktop pattern" },
      { label: "Brief + closeout", meta: "Focused mobile pattern" },
      { label: "State comparison", meta: "Normal vs non-ideal" },
    ],
  },
  {
    path: "/high-fidelity",
    label: "High fidelity",
    eyebrow: "Rendered product",
    title: "A field-aware operational visual language",
    summary:
      "High-fidelity screens use one semantic token system and retain usable density, contrast, touch targets, and print behavior.",
    count: "13 live compositions",
    readiness: "live",
    items: [
      { label: "Manager dispatch board", meta: "Desktop · 1440" },
      { label: "Responsive work detail", meta: "Tablet · 834" },
      { label: "Crew execution brief", meta: "Mobile · 390" },
    ],
  },
  {
    path: "/prototypes",
    label: "Prototypes",
    eyebrow: "End-to-end behavior",
    title: "Clickable workflow packages",
    summary:
      "Prototype routes demonstrate state transitions and exceptions with connected data rather than disconnected screen jumps.",
    count: "3 live paths",
    readiness: "live",
    items: [
      { label: "Plan → verify", meta: "Walking slice available" },
      { label: "Scout → follow up", meta: "Registered priority" },
      { label: "Harvest → reconcile", meta: "Registered priority" },
    ],
  },
  {
    path: "/design-system",
    label: "Design system",
    eyebrow: "Reusable language",
    title: "Patterns extracted from operational work",
    summary:
      "Foundations and components encode hierarchy, state semantics, outdoor readability, responsive behavior, and durable identity.",
    count: "Token foundation live",
    readiness: "live",
    items: [
      { label: "Tokens", meta: "DTCG + CSS projection" },
      { label: "Components", meta: "Walking-slice families" },
      { label: "Maps + charts", meta: "Registered systems" },
    ],
  },
  {
    path: "/design-system/tokens",
    label: "Tokens",
    eyebrow: "Design system",
    title: "Semantic foundations for field and office",
    summary:
      "Color, type, spacing, radius, shadow, size, and motion tokens use stable DTCG paths with a browser CSS projection.",
    count: "DTCG source live",
    readiness: "live",
    items: [
      { label: "Vine", meta: "Healthy progress and verification" },
      { label: "Sun", meta: "Time-sensitive attention" },
      { label: "Harvest", meta: "Blocked or unsafe work" },
    ],
  },
  {
    path: "/design-system/components",
    label: "Components",
    eyebrow: "Design system",
    title: "Reusable operational component families",
    summary:
      "Status, work order, block identity, queue, metric, exception, audit, and workflow-progress patterns drive the walking slice.",
    count: "27 live contracts",
    readiness: "live",
    items: [
      { label: "Status signal", meta: "Icon + label + semantics" },
      { label: "Work queue row", meta: "Selectable, dense, responsive" },
      { label: "Operational timeline", meta: "State and evidence" },
    ],
  },
  {
    path: "/design-system/icons",
    label: "Icons",
    eyebrow: "Design system",
    title: "Clear symbols reinforce operational meaning",
    summary:
      "A small SVG symbol vocabulary supports navigation, status, synchronization, timing, identity, and attention without becoming decoration.",
    count: "Inline SVG set",
    readiness: "live",
    items: [
      { label: "Status symbols", meta: "Never color alone" },
      { label: "Context symbols", meta: "Block, crew, time" },
      { label: "Action symbols", meta: "Inspect, open, advance" },
    ],
  },
  {
    path: "/design-system/maps",
    label: "Maps",
    eyebrow: "Design system",
    title: "Spatial context for operational decisions",
    summary:
      "Map patterns prioritize stable block identity, boundary confidence, restrictions, route conditions, and useful layers over decorative aerial imagery.",
    count: "Map system registered",
    readiness: "registered",
    items: [
      { label: "Block identity", meta: "Stable ID + aliases" },
      { label: "Restriction layer", meta: "Time-bound access" },
      { label: "Execution progress", meta: "Rows and coverage" },
    ],
  },
  {
    path: "/design-system/charts",
    label: "Charts",
    eyebrow: "Design system",
    title: "Charts answer an operating question",
    summary:
      "Trend, plan-versus-actual, maturity, capacity, and exception visuals preserve units, recency, thresholds, and source context.",
    count: "Chart system registered",
    readiness: "registered",
    items: [
      { label: "Plan vs actual", meta: "Acres, hours, materials" },
      { label: "Recency-aware trend", meta: "Samples and forecasts" },
      { label: "Capacity strip", meta: "Crew and equipment load" },
    ],
  },
  {
    path: "/synthetic-operation",
    label: "Synthetic operation",
    eyebrow: "Connected data",
    title: "Mesa Alta Vineyards, season 2026",
    summary:
      "One estate-and-contract-fruit operation supplies coherent blocks, crews, work, restrictions, corrections, and histories across the atlas.",
    count: "Connected fixture",
    readiness: "live",
    items: [
      { label: "Rancho Arroyo", meta: "Estate · 412 planted acres" },
      { label: "Juniper Draw", meta: "Estate · 286 planted acres" },
      { label: "Solis Family Vineyard", meta: "Contract fruit · 74 acres" },
    ],
  },
  {
    path: "/construction-packets",
    label: "Construction packets",
    eyebrow: "Implementation handoff",
    title: "Buildable slices with no rediscovery required",
    summary:
      "Each packet binds workflows, scenarios, screens, states, permissions, data, copy, assets, acceptance conditions, and exclusions.",
    count: "4 buildable packets",
    readiness: "registered",
    items: [
      { label: "Planning + dispatch", meta: "Walking-slice source" },
      { label: "Field execution", meta: "Responsive counterpart" },
      { label: "Verification + history", meta: "Record closure" },
    ],
  },
  {
    path: "/traceability",
    label: "Traceability",
    eyebrow: "Lineage browser",
    title: "Evidence to implementation, without orphans",
    summary:
      "Stable links join source anchors, workflows, scenarios, requirements, screens, components, and construction packets.",
    count: "Graph registered",
    readiness: "registered",
    items: [
      { label: "SRC → WF", meta: "Evidence supports workflow" },
      { label: "WF → SCN → SCR", meta: "Operations justify screens" },
      { label: "SCR → CMP → PKT", meta: "System enables construction" },
    ],
  },
  {
    path: "/assumptions",
    label: "Assumptions",
    eyebrow: "Decision hygiene",
    title: "Inference stays visible and testable",
    summary:
      "Consequential assumptions record rationale, confidence, impact, validation method, and whether they remain open or accepted.",
    count: "Register connected",
    readiness: "evidence",
    items: [
      { label: "Routine approval", meta: "Often lightweight · composite" },
      { label: "Closure channel", meta: "Varies by operation · open" },
      { label: "Block identity owner", meta: "Product decision · accepted" },
    ],
  },
  {
    path: "/validation",
    label: "Validation",
    eyebrow: "Quality evidence",
    title: "Rendered behavior is the review surface",
    summary:
      "Build, browser, responsive, accessibility, screenshot, link, traceability, and repository checks provide durable evidence.",
    count: "Gate registry",
    readiness: "registered",
    items: [
      { label: "Factory integrity", meta: "Build + render + capture" },
      { label: "Interaction quality", meta: "Normal + non-ideal paths" },
      { label: "Completion audit", meta: "No open P0/P1 findings" },
    ],
  },
  {
    path: "/completion",
    label: "Completion",
    eyebrow: "Definition of done",
    title: "Completion is breadth plus proof",
    summary:
      "The completion view reports machine gates, artifact coverage, review findings, Pages deployment, and field-validation questions separately.",
    count: "Audit pending",
    readiness: "registered",
    items: [
      { label: "Artifact breadth", meta: "Registries + rendered output" },
      { label: "Quality gates", meta: "Automated + independent review" },
      { label: "Public release", meta: "Pages + tagged inventory" },
    ],
  },
];

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Understand",
    items: sections.slice(0, 5).map(({ path, label }) => ({ path, label })),
  },
  {
    label: "Operate",
    items: sections.slice(5, 9).map(({ path, label }) => ({ path, label })),
  },
  {
    label: "Shape the product",
    items: sections.slice(9, 16).map(({ path, label }) => ({ path, label })),
  },
  {
    label: "System",
    items: [
      { path: "/design-system", label: "Design system" },
      { path: "/synthetic-operation", label: "Synthetic operation" },
      { path: "/construction-packets", label: "Construction packets" },
      { path: "/traceability", label: "Traceability" },
    ],
  },
  {
    label: "Assure",
    items: [
      { path: "/assumptions", label: "Assumptions" },
      { path: "/validation", label: "Validation" },
      { path: "/completion", label: "Completion" },
    ],
  },
];

export const findSection = (path: string) =>
  sections.find((section) => section.path === path);
