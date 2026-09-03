# STORY-002 — Recurring-gift contribution history list scoped to the donor

The second story of the Epic defined in [`epics.md`](epics.md), which also carries the story
roster, the JIRA import reconciliation and the consolidated clarification summary. This document
carries the nine mandated story fields and nothing else — there is no Epic field among them, by
design.

This story **implements** the four-predicate scoping contract published once in
[`STORY-001-donor-identity-and-self-only-scoping.md`](STORY-001-donor-identity-and-self-only-scoping.md);
it does not restate it. Where the predicates are referred to below they are referred to by their
number in that contract, so a change to the rule is made in one place and cannot leave this path
behind.

---

## Story ID

STORY-002

---

## Title

Recurring-gift contribution history list scoped to the donor

---

## Description

Implement the donor-facing recurring-gift history list, and with it **the query predicate that is
the record-level boundary on this path**. This is the story in which the Epic's isolation
requirement stops being a contract and becomes a `WHERE` clause.

Delivered as a **managed SavedSearch and SearchDisplay pair on the `Contribution` entity**,
reading through APIv4 `Contribution.get`, applying **all four predicates from STORY-001's
contract inside the saved search itself** rather than as exposed filters. "Inside the saved
search" is the load-bearing part: a predicate a caller can see is a predicate a caller can try to
relax, and on this display there is nothing behind it (see Technical Notes).

Surfaced by **tagging the saved search `UserDashboard`**, which the existing layout provider
composes into the dashboard form with **no change to layout or provider code** — the pair is
itself declared in a `.mgd.php` configuration file, so this avoids *procedural* change, not all
PHP. Packaged `'update' => 'unmodified'` so later corrections reach installations that have not
locally edited the entity.

The list carries **the row-level link from which STORY-003's receipt is reached**, with the
display's `actions` setting left false — so the affordance a donor gets is one receipt for one
row they own, not a bulk task and not a result-set export.

**What this story does not do.** It does not withdraw anything a donor can see today. The
recurring-only rule (predicate 2) constrains **the queries this Epic introduces**; the existing
all-contributions pane on the donor route is **not removed**, and one-time and non-recurring
donation handling is unaffected, as recorded in `epics.md` §1.1 and §1.2. How the new
recurring-only pane and the existing all-contributions pane are presented together is a
presentation question, raised below as `CLR-04` and deliberately not answered here. It also
defines no receipt rendering: this story supplies the affordance and STORY-003 supplies what the
affordance resolves to.

---

## Business Value

Gives donors a history they can open at any hour instead of asking a staff member to look it up.

The business case names three pains this list addresses at once. **Every request currently goes
through a staff member**, who reads or edits the donor's record directly — there is no route by
which a donor answers "what have I given, and when?" for themselves. **That costs the team
several hours a week**, spread across the people who field the requests. And **donors are
frustrated at being unable to do simple things themselves outside business hours**, because the
queue only moves when the office is open. A self-service list removes the lookup from the queue
rather than making it faster, which is why the relief is structural instead of incremental.

It also relieves the pain the other stories cannot: **in the fourth quarter the volume overwhelms
the team**, and staff can no longer keep up with the requests arriving at the busiest giving time
of the year. A list that answers the most common question without a human in the loop is what
takes load off that peak.

Against the Epic's success criteria, this story delivers the **query half** of *the portal only
exposes a donor's own contribution history, never another donor's* — STORY-001 delivers the
authorization half and STORY-003 the single-record half. It is also the story every later one
stands on: the receipt stories are reached **from this list**, so a donor who cannot see their
recurring gifts cannot receipt them either.

---

## Acceptance Criteria

[ ] Given contributions seeded for two different donors, when donor A's list renders, then every row shown belongs to donor A and none of donor B's appears.

[ ] Given a donor with both recurring and one-time contributions, when the list renders, then only contributions whose `contribution_recur_id` is non-null appear.

[ ] Given test-mode contributions exist for the donor, when the list renders, then none of them appears.

[ ] Given a recurring contribution whose `receive_date` is in the future, when the list renders, then it does not appear, so the list shows only past contributions as the Epic requires.

[ ] Given a recurring-gift record has been deleted and its contributions' links nulled, when the list renders, then those contributions do not appear, consistent with the `contribution_recur_id` boundary.

[ ] Given a donor with no qualifying contributions, when the list renders, then an empty state is shown that a tester can distinguish from an error or a permission failure.

[ ] Given the list renders, then each row exposes the contribution's amount, contribution status, receive date, and the date a receipt was sent where `receipt_date` holds one — labelled as the date a receipt was sent, not as an assertion that a receipt document exists.

[ ] Given the list renders, when every receipt affordance shown is followed, then each one produces either receipt content or the defined no-receipt state, and no affordance is presented that cannot resolve to either.

---

## Technical Notes

Every claim below is a **reading of source at the stated address**, obtained by static inspection
of this checkout. No runtime was stood up for this run, so nothing here rests on observed
behaviour, and any statement about what a *particular deployment* has configured is raised as a
clarification rather than asserted. The baseline is CiviCRM `6.17.alpha1`
([`xml/version.xml`:3]); a different target version must be re-checked against these addresses
before the story is estimated as it stands. Where the same file is cited repeatedly, its path is
given in full once in that passage and the later citations in the passage are line numbers alone —
a citation of the form ([`:68`]) always means that line of the file named in full immediately
before it.

**The specification documents this surface, so this is an extension of a supported concept rather
than an invention.** §7.3.4 of the ingested Technical Specification records constituent
self-service through `ext/user_dashboard`, presenting a constituent's own contributions and other
records, built from SearchKit saved searches under the
`managed/SavedSearch_UserDashboard_*.mgd.php` pattern. This story follows that pattern; it does
not propose a new one.

**Follow the shipped pair, and add exactly three predicates to it.** The model to copy is
[`ext/user_dashboard/managed/SavedSearch_UserDashboard_Contributions.mgd.php`:1-110] — a
110-line file, referred to below by line number alone. It declares a SavedSearch on `api_entity`
`Contribution` ([`:19`]) paired with a `table` SearchDisplay, both under
`'update' => 'unmodified'` ([`:13`,`:47`]) with match keys `['name']` ([`:38-40`]) and
`['name', 'saved_search_id']` ([`:104-107`]), the whole file guarded on the CiviContribute
component being enabled ([`:4-6`]). Its `where` clause is
`['contact_id', '=', 'user_contact_id']` **and nothing else** ([`:30-32`]) — which is predicate 1
of STORY-001's contract on its own. So **predicates 2, 3 and 4 — recurring-only, non-test and the
`receive_date` upper bound — are the delta this story adds**, and criteria 2, 3 and 4 are the
tests for exactly those three. The display sets `'acl_bypass' => TRUE` ([`:55`]) and
`'actions' => FALSE` ([`:97`]); both settings are discussed below, and both should be carried over
deliberately rather than by copy-paste.

**Criterion 7's column set is already demonstrated by that pane, including the labelling nuance.**
In [`ext/user_dashboard/managed/SavedSearch_UserDashboard_Contributions.mgd.php`] the display
carries `total_amount` ([`:68`]), `receive_date` ([`:80`]), `contribution_status_id:label`
([`:92`]) and `receipt_date` — and it labels that last column **"Receipt Sent"** ([`:86-88`]).
Preserve that label or an equivalent. The column records when a receipt was *sent*; it does not
record that a receipt document exists, and a label such as "Receipt" would assert the second while
displaying the first.

**What the `'update' => 'unmodified'` policy actually does — state the conditional, not the
blanket claim.** Managed-entity reconciliation **updates** an entity that has not been locally
modified and **preserves** one that has. The decision is made in `updateExistingEntity()`
([`CRM/Core/ManagedEntities.php`:302-350]): under the `unmodified` policy
([`CRM/Core/ManagedEntities.php`:312]) it reduces to
`$doUpdate = empty($item['entity_modified_date'])`
([`CRM/Core/ManagedEntities.php`:317]). The practical consequence for planning: **a shipped
correction to this pane's predicates does reach installations that have not touched it**, while an
installation where an administrator has edited the search or display keeps the local edit and
needs manual attention. Both halves matter — the first is why shipping a fix is worthwhile, the
second is why a security-relevant predicate change cannot be assumed to have landed everywhere.

**Afform already renders a read-only donor history view, so no custom component is needed for the
list.** [`ext/user_dashboard/ang/afsearchUserDashboard.aff.php`:4-9] is a `search`-type Afform
published on `server_route` `civicrm/user` and gated on the permission
`access Contact Dashboard`. That answers the "must we build a component?" question for this story
in the negative; the receipt stories are a different matter and STORY-003 owns it.

**Surfacing the new pane needs no procedural change.** The layout provider builds one
`af-fieldset` pane per tagged display, querying `SearchDisplay.get` for displays whose saved
search carries the `UserDashboard` tag and appending the markup for each
([`ext/user_dashboard/Civi/UserDashboard/DashboardAfformLayoutProvider.php`:26-55]). The tag
itself is applied by a `post` hook that fires on creation of **any** SavedSearch whose name begins
`UserDashboard_`, irrespective of which extension declared it
([`ext/user_dashboard/user_dashboard.php`:60-70]). Two consequences: packaging the pair in a new
extension does not by itself require a dedicated route, and hosting is therefore a separate
decision, taken under `CLR-03` below.

**Three further readings that bear directly on how this pane is declared.**

1. **The legacy pane-enablement gate does not apply to a new pane.** The tagging hook consults
   the legacy `user_dashboard_options` setting, but only through a map of the **eight enumerated
   core pane names** ([`ext/user_dashboard/user_dashboard.php`:77-86]). A name absent from that
   map resolves to `NULL` ([`ext/user_dashboard/user_dashboard.php`:88]) and takes the
   `!$settingName` branch of the condition
   ([`ext/user_dashboard/user_dashboard.php`:90]) — so **a new recurring-gift pane is tagged
   unconditionally**, with no setting to switch it on. If the pane needs to be optional, that
   mechanism has to be designed; it is not inherited.
2. **The tag must not be declared in the new pane's own `.mgd.php`.** The hook's docblock states
   the reason: were the tag part of the `.mgd.php`, it would "stick", and an administrator's
   untagging would revert on every managed reconcile
   ([`ext/user_dashboard/user_dashboard.php`:51-56]). Declaring the tag declaratively would
   therefore trade an administrator's control for apparent tidiness. Let the hook do it.
3. **Pane order is alphabetical by display `name`, and only current searches are composed.** The
   provider's query filters on `saved_search_id.is_current = TRUE` and orders by `name` ascending
   ([`ext/user_dashboard/Civi/UserDashboard/DashboardAfformLayoutProvider.php`:38-41]). This is
   concrete input to `CLR-04` rather than a detail: **the name chosen for the new display fixes
   its position relative to the shipped `UserDashboard_Contributions` pane**, so the presentation
   question has a naming consequence and should not be settled after the name is fixed.

One note for whoever writes the tests, since this story adds a `UserDashboard_*` SavedSearch and
so fires that hook: the condition passes `$legacySetting['value']` to `in_array()` as the haystack
with no null guard ([`ext/user_dashboard/user_dashboard.php`:90]), so a context in which the
setting resolves to `NULL` reaches `in_array()` with a non-array second argument. Plan the fixture
setup with that in view.

**Read through APIv4 `Contribution.get`, which is inherited rather than overridden.** The
contribution entity is supplied by an extension and extends the generic DAO entity
([`ext/civi_contribute/Civi/Api4/Contribution.php`:21]), overriding only write actions — `create`,
`save` and `update`
([`ext/civi_contribute/Civi/Api4/Contribution.php`:27,36,45]). `get` is therefore the inherited
generic action and a where-clause read is the supported path. Per the instruction governing this
Epic, the portal reads through the API layer; **no BAO or DAO call is introduced on this path**.

**Keep `actions` false and carry the receipt affordance as a column `link` — and set it
explicitly.** A column's `link` and `links` configuration is preprocessed
([`ext/search_kit/Civi/Api4/Action/SearchDisplay/AbstractRunAction.php`:903-908]) and rendered
([`ext/search_kit/Civi/Api4/Action/SearchDisplay/AbstractRunAction.php`:576-588]) on a path
independent of the `actions` setting, so **a row link to a receipt works with `actions` left
false**. What `actions` governs instead is which bulk tasks are enabled for the display
([`ext/search_kit/Civi/Api4/Event/Subscriber/SearchDisplayTasksSubscriber.php`:48-59]) and
whether a result-set export is permitted at all — the download action refuses a display without
actions enabled ([`ext/search_kit/Civi/Api4/Action/SearchDisplay/Download.php`:31-34]). Keeping it
false is what keeps bulk tasks and whole-list export out of a donor's reach, which matters because
list-level export is a capability this Epic does not grant. Note that the default-display
subscriber turns `actions` **on** for `table`-type displays
([`ext/search_kit/Civi/Api4/Event/Subscriber/DefaultDisplaySubscriber.php`:152-165], the
assignment itself at [`:154`]), so **the new display must set it to false explicitly** rather than
relying on an absent setting; the shipped pane does exactly that
([`ext/user_dashboard/managed/SavedSearch_UserDashboard_Contributions.mgd.php`:97]).

**The predicate is the whole boundary. This is the single most important fact in the story.**
Because the display sets `acl_bypass`, the display runner **disables permission checks on the
underlying query** with one assignment
([`ext/search_kit/Civi/Api4/Action/SearchDisplay/AbstractRunAction.php`:135]). Once checks are
off, the ACL clause returns empty immediately
([`Civi/Api4/Query/Api4SelectQuery.php`:336-338]), so neither the generic Contact ACL subquery
that a permission-checked read would inherit for a `contact_id` field keyed to Contact
([`CRM/Core/DAO.php`:3186-3207], the contact-keyed clause at [`CRM/Core/DAO.php`:3191-3195]) nor
the `financialacls` select-where hook
([`ext/financialacls/financialacls.php`:87], dispatched from
[`CRM/Core/DAO.php`:3206]) is composed at all. **Nothing stands behind the saved search's `WHERE`
clause to catch a defect in it**, which is why criterion 1 is a cross-donor test rather than a
smoke test and why this story is prioritised High in `epics.md` §4.3.

What does protect the display is a gate one level up, and it is worth knowing so it is not
mistaken for record-level protection: a display with `acl_bypass` is reachable only when embedded
in an Afform the caller may view, enforced with an unauthorized exception
([`ext/search_kit/Civi/Api4/Action/SearchDisplay/AbstractRunAction.php`:127-133]) and satisfied by
loading that form with permission checks enabled and confirming the display appears in its layout
([`ext/search_kit/Civi/Api4/Action/SearchDisplay/AbstractRunAction.php`:1795-1830]). That gate
decides **whether the caller may run the display at all**; it says nothing about **which rows**
come back. Two design constraints follow, and they are settled rather than open:

- **The self-only predicate stays in the SavedSearch itself.** Not in the display, not in the
  Afform, not in a filter.
- **No contact identifier is exposed as a filter.** Predicate 1 is satisfied by the
  `user_contact_id` token, whose resolution STORY-001 documents; a request-supplied contact
  identifier must have nowhere to go.

Supporting fact for the change-control conversation: setting `acl_bypass` is restricted to
super-administrators, non-super-admins may not create or update a display with it set, and a
SavedSearch linked to such a display cannot be updated by anyone else
([`ext/search_kit/CRM/Search/BAO/SearchDisplay.php`:59-87]). The pane is therefore hard for a
site administrator to weaken by accident — and equally hard for them to fix in place.

**Performance: the recurring filter is unindexed.** The entity's complete index block runs
[`schema/Contribute/Contribution.entityType.php`:21-79], and `contribution_recur_id` occurs
exactly once in that file, at
[`schema/Contribute/Contribution.entityType.php`:411] — the column declaration itself. **No index
declared for this entity covers the recurring filter.** The claim is bounded to those two
addresses: it is what this schema file declares, not a statement about indexes a particular
database may have acquired by other means. Size the query work accordingly, on a table that in
production holds every contribution the organisation has ever recorded. This is recorded as a
**consideration, not proposed as schema work** — adding an index is outside this Epic's scope.

Supporting column declarations. Every line number in the table below is a line in
[`schema/Contribute/Contribution.entityType.php`]:

| Column | Declaration | Why it matters here |
|---|---|---|
| `contact_id` | required, FK to Contact, `on_delete CASCADE` ([`:97-117`]) | the column predicate 1 filters on |
| `contribution_recur_id` | `int unsigned`, `readonly`, FK to `ContributionRecur.id`, `on_delete SET NULL` ([`:411-429`]) | predicate 2's column; the `SET NULL` is why criterion 5 holds |
| `receive_date` | `datetime` ([`:189`]) | predicate 4's column, and a displayed field |
| `receipt_date` | nullable, described as "when (if) receipt was sent" ([`:356-370`]) | criterion 7's labelling nuance, and why criterion 8 admits a no-receipt state |
| `is_test` | required, default `FALSE` ([`:430`]) | predicate 3's column |

Two of those declarations answer criteria directly. **`on_delete SET NULL` on
`contribution_recur_id` is why criterion 5 is a consequence rather than a design choice**: when a
recurring-gift record is deleted, the link on its contributions is nulled, and those contributions
then fail predicate 2 — they leave the list by the Epic's own criterion, with no additional logic.
And `is_test` defaulting to `FALSE` with no filter on the shipped pane is why predicate 3 must be
written explicitly: the default keeps ordinary records visible, it does not exclude the test ones.
The recurring entity the foreign key targets is declared at
[`schema/Contribute/ContributionRecur.entityType.php`:3-12], cited for identity only — recurring
mutation is outside this run's investigation boundary and nothing about it was examined.

**Risk context — carried as risk, not converted into work.** Three items belong in the estimate
conversation and none of them becomes a story here:

- **The candidate host extension is alpha.** `ext/user_dashboard` declares
  `<develStage>alpha</develStage>` ([`ext/user_dashboard/info.xml`:19]) and its manifest says in
  as many words that the extension "is still experimental"
  ([`ext/user_dashboard/info.xml`:33]). Building a security-critical pane on it is a decision, not
  a default — see `CLR-03`.
- **AngularJS is end-of-life.** The estate pins AngularJS at `1.8.2`
  ([`composer.json`:145-146]), a release unsupported since January 2022. Any donor pane inherits
  that constraint. It is a reason to prefer declarative configuration where configuration
  demonstrably suffices — as it does for this list — and to keep any new surface small. It is not
  remediation work in this Epic.
- **The host extension has no automated coverage.** `ext/user_dashboard` ships fifteen files, none
  of them a test, and the three declared PHPUnit suites cover `./tests/phpunit/api`,
  `./tests/phpunit/CRM` and `./tests/phpunit/Civi` ([`phpunit.xml.dist`:17-27]) — none of which
  reaches an extension directory. Bounded to those addresses, that is a **confidence gap**: the
  eight criteria above are the first assertions this surface will have, so budget for building the
  fixtures as well as the pane.

**On `CLR-03`, the three hosting options are genuine and the story should not pre-empt the
choice.** `civicrm/user` is a **core** route whose default page callback is the legacy Smarty
dashboard ([`CRM/Core/xml/Menu/Contact.xml`:207-213]), which the extension's Afform route
displaces when the extension is enabled. So: extending the legacy dashboard means Smarty template
code, but on a core surface that already has PHPUnit coverage — six test methods including
donor-dashboard contribution content
([`tests/phpunit/CRM/Contact/Page/View/UserDashBoardTest.php`:21-289], the contribution cases at
[`:79`,`:144`]) — which the alpha Afform dashboard does not have; adopting that Afform dashboard is
the lowest-code option but inherits the maturity and coverage risks above; and packaging the
managed entities in a
new extension keeps ownership and upgrade control with the new work while still surfacing through
the existing tag mechanism ([`ext/user_dashboard/user_dashboard.php`:60-70]). All three are
compatible with the criteria above, which is precisely why the decision has to be taken
explicitly rather than absorbed.

**Specification anchors.** F-004 (CiviContribute), F-012 (APIv4), F-016 (Afform), F-017
(SearchKit) and F-023 (Financial Access Controls), together with §6.2.2 and §7.3.4. Feature
identifiers take the form `F-XXX` and requirement identifiers `F-XXX-RQ-YYY`. These anchors point
at the ingested Technical Specification, not at a file in this repository.

**Open questions.** Three, none of them answered here. `CLR-03` is classified **blocking** —
architecture cannot be settled without it — and `CLR-04` and `CLR-11` are **informational**,
meaning implementation may proceed while the answer is confirmed rather than that the answer can
be skipped. `epics.md` §7 is where that classification is authoritative:

`[NEEDS CLARIFICATION: CLR-03 — Where is the pane hosted: extend the legacy Smarty dashboard, add it to the alpha Afform dashboard in ext/user_dashboard, or package the managed entities in a new extension and surface them through the existing tag mechanism? 0.5.5 compares the three.]`

`[NEEDS CLARIFICATION: CLR-04 — How are the new recurring-only pane and the existing all-contributions pane presented together on the donor route, so a donor is not confused about which list they are reading? Both may coexist; this is a presentation decision, not a decision to remove existing content.]`

`[NEEDS CLARIFICATION: CLR-11 — Should Failed and Cancelled recurring contributions appear in the donor's history list? Showing them tells a donor a payment did not succeed, which is a transparency and support question; hiding them keeps the list to successful giving. Remediating a failed payment is out of scope, so this decides visibility only.]`

---

## Dependencies

STORY-001

---

## Story Points

8

---

## Labels

donor-portal searchkit afform civicontribute
