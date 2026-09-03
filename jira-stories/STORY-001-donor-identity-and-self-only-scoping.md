# STORY-001 — Donor identity resolution and the self-only access contract

The first story of the Epic defined in [`epics.md`](epics.md), which also carries the story
roster, the JIRA import reconciliation and the consolidated clarification summary. This document
carries the nine mandated story fields and nothing else — there is no Epic field among them, by
design.

---

## Story ID

STORY-001

---

## Title

Donor identity resolution and the self-only access contract

---

## Description

Establish the identity and authorization foundation that every read in the donor portal depends
on. This story deliberately has **no query surface of its own**: it produces the rules the
querying stories obey, not a screen, a route or a saved search a donor can reach.

Three deliverables:

1. **Resolve the acting donor from the authenticated server-side session, and from no request
   input.** The contact identifier used to scope every subsequent read is derived from the
   session on the server. No request parameter, query string, header, cookie or form field may
   supply, override or influence it — a request that offers one is answered as though it had not.
2. **Identify in the target deployment, or create, a least-privileged donor role.** The role must
   grant portal access without conferring visibility or edit rights over other contacts.
   `view my invoices` is the purpose-built candidate permission; the role must not carry
   `view all contacts`, `edit all contacts` or `access CiviContribute`. Which of "identify" and
   "create" applies cannot be read from source and is `CLR-02`.
3. **Publish the scoping rule as one normative definition** — the four predicates in the table
   below. They are stated once, here. STORY-002 and STORY-003 each *implement* them and neither
   restates them, so a change to the rule cannot leave one path behind.

**The scoping contract.** Every query this Epic introduces — the history list in STORY-002 and
the receipt reads in STORY-003 and STORY-004 — is constrained by all four of these predicates,
applied server-side and not exposed as a filter a caller can relax:

| # | Predicate | What it requires |
|---|---|---|
| 1 | session-derived `contact_id` | the contribution's `contact_id` equals the contact resolved from the authenticated server-side session, never a contact identifier taken from the request |
| 2 | `contribution_recur_id IS NOT NULL` | only contributions tied to a recurring gift qualify, which is the Epic's own boundary on the list and receipt queries it introduces |
| 3 | `is_test = false` | test-mode transactions never reach a donor's list, a donor's receipt view or a donor's download |
| 4 | `receive_date <= now` | "past" is an inclusive comparison against the current time, evaluated in the site's configured timezone, so that nothing dated in the future is presented as a past contribution |

Predicates 2, 3 and 4 constrain **the queries this Epic introduces**. They are not an
instruction to withdraw anything a donor can see today; the existing all-contributions pane on
the donor route is unaffected, as recorded in `epics.md` §1.2.

**Form of delivery.** CiviCRM role and permission configuration, plus the written contract above
as a reviewable artifact. This story delivers **no application code and no saved search** — the
saved search that implements predicates 1 to 4 on the list path belongs to STORY-002, and the
server-side receipt path that re-applies them belongs to STORY-003.

---

## Business Value

Makes donor self-service safe enough to switch on at all.

The business case for the portal is that **donors cannot do simple things themselves outside
business hours**, that **every request currently goes through a staff member** who reads or edits
the record directly, and that this **costs the team several hours a week**. None of that relief
can be delivered until the portal can be trusted to show a donor only their own records — so the
value of this story is that it is what makes the other three shippable rather than merely
demonstrable.

It delivers the **authorization half** of the success criterion that *the portal only exposes a
donor's own contribution history, never another donor's*. STORY-002 delivers the query half, and
STORY-003 the single-record half.

The weight is disproportionate to the point estimate, and deliberately so. Because the
access-control chain leaves a query predicate as the only barrier between a donor and the whole
contribution table (see Technical Notes), **an error in the contract defined here propagates into
every dependent story at once** — it cannot be contained to one screen and cannot be caught by a
layer behind it.

---

## Acceptance Criteria

[ ] Given an authenticated donor session, when the acting donor is resolved, then the contact identifier comes from the server-side session and from no request parameter, query string, header, cookie or form field.

[ ] Given a request that supplies a contact identifier as a parameter, when it is handled, then the supplied value is ignored and the session-derived identifier is used.

[ ] Given two authenticated sessions for different contacts, when each resolves the acting donor, then each receives only its own contact identifier.

[ ] Given an unauthenticated request to any donor portal route, when it is handled, then it is refused or redirected to authentication and no contribution data appears in the response.

[ ] Given the role assigned to donors on the target instance, when its granted permissions are enumerated, then it holds no permission conferring visibility or edit rights over other contacts, and specifically not `view all contacts`, `edit all contacts` or `access CiviContribute`.

[ ] Given the scoping contract, when the dependent stories are reviewed, then all four predicates are stated once in this story and referenced rather than redefined by STORY-002 and STORY-003, so a change to the rule cannot leave one path behind.

---

## Technical Notes

Every claim below is a **reading of source at the stated address**, obtained by static inspection
of this checkout. No runtime was stood up for this run, so nothing here rests on observed
behaviour, and any statement about what a *particular deployment* has configured is raised as a
clarification rather than asserted. The baseline is CiviCRM `6.17.alpha1`
([`xml/version.xml`:3]); a different target version must be re-checked against these addresses
before the story is estimated as it stands.

**Where the tenant boundary is actually computed — and therefore the path this story tests.** The
`user_contact_id` token that the dependent predicates use is resolved on the **input** side of
the query, not by an access-control layer wrapped around it. `FormattingUtil::formatInputValue()`
([`Civi/Api4/Utils/FormattingUtil.php`:85-127]) routes a non-numeric operand on a contact-keyed
field through `resolveContactID()` ([`Civi/Api4/Utils/FormattingUtil.php`:532-543]), which
delegates to `_civicrm_api3_resolve_contactID()` ([`api/v3/utils.php`:2175-2205]) and throws a
`CRM_Core_Exception` when the expression cannot be resolved to a contact. For the literal
`user_contact_id`, that function returns `CRM_Core_Session::getLoggedInContactID()`
([`api/v3/utils.php`:2186-2187]) — which is precisely why the identifier is session-derived
rather than request-derived, and it is the seam the first three acceptance criteria exercise.

**Why `access Contact Dashboard` is not sufficient, and what the least-privilege candidate is.**
The dashboard permission's own description reads "View Contact Dashboard (for themselves and
visible contacts)" ([`CRM/Core/Permission.php`:807-810]) — *and visible contacts*, so holding it
does not establish self-only access and it cannot be the mechanism that enforces the Epic's
boundary. `view my invoices` is donor-scoped by design, described as "Allow users to view/
download their own invoices" ([`CRM/Core/Permission.php`:958-961]), which makes it the
least-privilege candidate for the receipt capability the later stories deliver.

**No donor-appropriate role is seeded by default.** The Standalone identity extension's
post-install routine ([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:45]) seeds exactly
three roles — anonymous, administrator and staff
([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:53-100], role identities at
[`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:58,72,80]) — and grants
`access Contact Dashboard` only to `staff`
([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:86]), which in the same grant also
carries `view all contacts` ([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:90]) and
`edit all contacts` ([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:91]). So the only
seeded role that can reach the dashboard is one the fifth acceptance criterion forbids for a
donor. Worth noting for the role design: that same seeded grant does include `view my invoices`
([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:108]) alongside `access CiviContribute`
([`ext/standaloneusers/CRM/Standaloneusers/Upgrader.php`:104]) — the candidate permission is
available, but the role carrying it is far broader than a donor needs. This claim is bounded to
those addresses: it describes what that installer seeds, not what any live deployment now has,
which is not readable from source and must be established against the target instance rather than
assumed. That is `CLR-02`.

**Authentication surfaces, and the alpha caution this story inherits.** Remote and API
authentication is owned by `authx`, which declares `stable` ([`ext/authx/info.xml`:19]), is
flagged `mgmt:required` ([`ext/authx/info.xml`:20-22]) and enables username-password, API key
and/or JWT credentials ([`ext/authx/info.xml`:36]). The Standalone identity layer that would
serve interactive donor logins is a different component with a different maturity: it declares
`alpha` ([`ext/standaloneusers/info.xml`:19]) and its manifest warns "Don't enable this on a
standard CMS-based install!" ([`ext/standaloneusers/info.xml`:38]). Carry that caution rather
than discount it — **the identity layer this story may depend on is not production-grade by its
own declaration, and that risk is inherited by everything downstream of it**, because all three
later stories scope their queries with the identifier it authenticates. The credential mechanism
being stable does not make the user-management layer stable. Which surface actually serves donors
on the target instance is `CLR-01`, and it is the question this story cannot answer from source.

**Routing constraint on anything the later stories expose.** Any donor-facing route must sit
under `civicrm/…`: a Standalone deployment refuses any path whose first segment is not `civicrm`,
returning a 404 and exiting ([`Civi/Standalone/WebEntrypoint.php`:59-63]) before it boots the
container or loads resources ([`Civi/Standalone/WebEntrypoint.php`:65-69]). This story defines no
route, but the constraint belongs to the access contract because it bounds where a compliant one
can live.

**Why this contract carries the weight it does: the boundary is a query predicate, not an ACL.**
On the ACL-bypassing donor display the saved search's own `WHERE` clause is the sole record-level
boundary. The ACL clause returns empty as soon as permission checks are off
([`Civi/Api4/Query/Api4SelectQuery.php`:336-338]), so the generic Contact ACL subquery that a
permission-checked read would otherwise inherit — added for any `contact_id` field keyed to
Contact, before the select-where hook is dispatched ([`CRM/Core/DAO.php`:3186-3207], the
contact-keyed clause at [`CRM/Core/DAO.php`:3191-3195] and the hook at
[`CRM/Core/DAO.php`:3206]) — is never composed at all. Nothing stands behind the predicate to
catch a defect in it. That is the structural reason this story is security-critical rather than
merely functional, why it is prioritised High, and why the contract is published once here
instead of being restated per story.

**Specification anchors.** F-018 (AuthX), F-020 and F-021 (Standalone and Standalone User
Management, the latter alpha-stage in the ingested Technical Specification's own assessment), and
F-029 (ACL), together with §6.4.2 and §6.4.3. Feature identifiers take the form `F-XXX` and
requirement identifiers `F-XXX-RQ-YYY`. These anchors point at the ingested Technical
Specification, not at a file in this repository.

**Open questions.** Both are classified **blocking** for the later implementation run —
authorization cannot be settled without them — and `epics.md` §7 is where that classification is
authoritative:

`[NEEDS CLARIFICATION: CLR-01 — Which authentication surface serves donors: a CMS-embedded CiviCRM, or Standalone via the ext/standaloneusers identity layer, which its own manifest declares alpha and experimental?]`

`[NEEDS CLARIFICATION: CLR-02 — What role will donors hold? No donor-appropriate role is seeded by default, and the only seeded role with dashboard access is staff, which also holds view all contacts and edit all contacts. Does a least-privileged role already exist in the target deployment, or must one be created?]`

---

## Dependencies

None.

---

## Story Points

5

---

## Labels

donor-portal security access-control foundation
