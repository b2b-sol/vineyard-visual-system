# Vineyard Visual Atlas Specification

## Purpose

The atlas is the primary browsable result of the repository. It is simultaneously:

- an operational vineyard workflow reference
- a product-architecture reference
- a wireframe and high-fidelity design gallery
- a clickable prototype collection
- a design-system catalog
- a traceability browser
- a construction handoff library
- a review and completion evidence surface

## Required sections/routes

```text
/
/about
/source-and-confidence
/operating-model
/seasonal-calendar
/roles
/workflows
/workflows/:workflowId
/records
/exceptions
/scenarios
/scenarios/:scenarioId
/product-map
/information-architecture
/screens
/screens/:screenId
/flows
/wireframes
/high-fidelity
/prototypes
/design-system
/design-system/tokens
/design-system/components
/design-system/icons
/design-system/maps
/design-system/charts
/synthetic-operation
/construction-packets
/traceability
/assumptions
/validation
/completion
```

## Workflow page contents

Every priority workflow page should show:

- business purpose
- source confidence and evidence classification
- seasonality and frequency
- roles and organizations
- inputs and preconditions
- normal sequence
- swimlane
- decisions and approvals
- records created/read
- state machine
- handoffs
- exceptions and workarounds
- product intervention map
- related scenarios
- related screens/components
- open field-validation questions

## Screen page contents

- rendered screen at appropriate dimensions
- desktop/mobile variants
- all consequential states
- workflow/scenario references
- primary decision or job
- data and record references
- interaction notes
- permission behavior
- offline/stale/conflict behavior
- components used
- implementation specification
- accessibility notes

## Review experience

Provide contact-sheet views and comparison tools for:

- alternative visual directions
- low-fidelity versus high-fidelity
- mobile versus desktop
- normal versus exception states
- approved design versus rendered implementation

## Data realism

All screens must use one connected synthetic vineyard operation. Names, blocks, tasks, crews, observations, applications, estimates, samples, harvest loads, weigh tickets, costs, and audit records must form coherent histories.

## Rendering and export

- Responsive browser rendering
- Stable screenshot URLs or test fixtures
- SVG exports for diagrams and icons
- PDF or print-friendly review sheets
- PNG contact sheets at standardized dimensions
- Static Pages-compatible build

## Visual quality bar

The atlas should feel like a serious operational product and design reference, with coherent information density, exact status semantics, strong spatial/time context, and a distinctive vineyard-specific visual system. It must not resemble a template gallery populated with wine imagery.
