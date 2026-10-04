# Specification: <Feature or Hardening Title>

- **Specification ID**: <ID> (e.g., 012)
- **Date**: YYYY-MM-DD
- **Slug**: <slug-identifying-spec>
- **Status**: Not Implemented
- **Owner**: <Context, Module, or Squad Owner>
- **Related Specification**: [0XX — <Related Spec Title>](0XX-YYYY-MM-DD-<slug>.md)

---

## Context & Background

Describe the current baseline, which previous specifications or modules delivered the foundations, and why this work is needed now. Clarify what already exists and what remains untouched.

---

## Problem Statement

Detail the specific technical problems, edge cases, vulnerabilities, or contract mismatches discovered.

### 1. <First Concrete Defect / Missing Invariant>

Explanation of what fails, what is missing, or where the behavior drifts from standard expectations.

### 2. <Second Concrete Defect / Missing Invariant>

Explanation of technical root cause and operational impact.

---

## Solution

Summarize the technical solution, high-level architectural decisions, and boundaries.

1. <Solution item 1>
2. <Solution item 2>
3. <Solution item 3>

---

## Practical Gains & Operational Outcomes

1. **<Gain Category 1 (e.g. Cryptographic Protection / Resource Safety)>**:
   - *Before*: <Current behavior and limitations>
   - *Now*: <New behavior, protection, and invariants enforced>

2. **<Gain Category 2 (e.g. Protocol Determinism / Integration Clarity)>**:
   - *Before*: <Current behavior and limitations>
   - *Now*: <New behavior, protection, and invariants enforced>

3. **<Gain Category 3 (e.g. User Experience / Error Safety)>**:
   - *Before*: <Current behavior and limitations>
   - *Now*: <New behavior, protection, and invariants enforced>

---

## User Stories

- [ ] 1. As a <role>, I want <capability>, so that <outcome/benefit>.
- [ ] 2. As a <role>, I want <behavior>, so that <outcome/benefit>.
- [ ] 3. As a <role>, I want <safeguard>, so that <outcome/benefit>.

---

## Architecture Gate

### 1. Bounded Context & Ubiquitous Language
- **Context**: <Target Bounded Context>
- **Package Ownership**: <Target directories and primary file responsibilities>
- **Ubiquitous Terms**:
  - `<Term>`: <Definition>

### 2. Aggregate Root & State Transitions
- **Entities & State Machine**: <Definition of states, valid transitions, and terminal outcomes>
- **Invariants**: <List of rules that must never be violated>

### 3. Commands, Queries & Domain Ports
```javascript
/** @typedef {{ <method>(input: <InputType>): Promise<<OutputType>> }} <FeaturePort> */
```

### 4. IPC Contract & External Input Validation
- List every IPC channel added or changed (`channel`, payload, result, errors) and the preload function that exposes it.
- Define the main-process validation applied to renderer and external input before it reaches domain models (`unknown` → validation → domain model).

---

## Implementation Decisions

1. <Concrete design decision 1>
2. <Concrete design decision 2>
3. <File responsibility limits: ensure single responsibility, <= 250 lines target>
4. <Inward dependency rule: domain does not import presentation/infrastructure>

---

## Testing Decisions

### Unit & Profile Tests
- <Unit test case 1>
- <Unit test case 2>

### Integration & Contract Tests
- <Integration test case 1>
- <IPC contract test case 2>

### Error Safety & UI Tests
- <Safe error copy mapping test>
- <No raw library / technical exception leaks into user state>

### Regression Tests
- <Verify existing baseline behaviors continue to pass unmodified>

---

## Acceptance Criteria

- [ ] 1. <Acceptance criterion 1>
- [ ] 2. <Acceptance criterion 2>
- [ ] 3. <Acceptance criterion 3>
- [ ] 4. All unit, integration, and regression tests pass.
- [ ] 5. Quality checks (`npm test` on Node 22+, `node --check` on changed files) pass with 0 errors.

---

## Out of Scope

- <Explicitly excluded item 1>
- <Explicitly excluded item 2>
- <Explicitly excluded item 3>

---

## Further Notes

Document architectural boundaries, exceptions approved, and migration/versioning notes.
