## §91. Locale, Currency, and Internationalization Basics

### 1. The Vocabulary

- **Locale** — a combination of language and regional formatting conventions (date format,
  number format, currency symbol placement).
- **i18n (internationalization)** — designing a system so it *can* be adapted to different
  languages/regions, without hardcoding assumptions.
- **l10n (localization)** — the actual process of adapting content/formatting for a specific
  locale, building on top of i18n-ready design.
- **Currency precision** — the specific, real problem of representing money accurately (never as
  a floating-point number, due to rounding error) and knowing that not all currencies have the
  same number of decimal places (yen has none, most have two, some have three).

### 2. Where It Sits, and Why Teams Use It

Even a product with no current international plans benefits from not hardcoding
locale-specific assumptions, since retrofitting i18n after the fact into a system that assumed
one language/format everywhere is a much larger effort than designing for it from the start.

### 3. What Actually Breaks

- **Storing money as a floating-point number** — floating-point arithmetic has real, well-known
  rounding error; money should be stored as an integer count of the smallest currency unit (cents)
  or a proper fixed-point/decimal type, never a `float`.
- **Hardcoded date/number formats** — assuming `MM/DD/YYYY` or a specific decimal separator breaks
  immediately for users in locales that format dates or numbers differently, and can silently
  misparse data rather than obviously failing.
- **Assuming every currency has two decimal places** — Japanese yen has zero; some currencies have
  three; a hardcoded "always divide by 100" assumption produces wrong amounts for those
  currencies specifically.
- **String concatenation for translated text** — building a sentence by concatenating translated
  fragments around a variable often produces grammatically broken results in languages with
  different word order or grammatical rules than the original; real i18n libraries use full
  parameterized message templates instead.
- **Sorting or comparing text with a naive, locale-unaware string comparison** — different
  locales sort characters (especially accented ones) in different orders; a naive comparison can
  produce a sort order that looks wrong to users in a specific locale.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I never store money as a float — it's an integer of the smallest unit, or a proper decimal
  type, specifically to avoid rounding error."
- "I don't hardcode date/number formats or assume every currency has two decimal places."
- "I build translated strings with full parameterized templates, not by concatenating fragments
  around a variable, since that breaks for languages with different grammar."

### 5. Interview-Ready Answer

> "The two rules I follow regardless of whether internationalization is an immediate requirement:
> money is never a float — it's an integer of the smallest currency unit or a real decimal type,
> to avoid rounding error — and I don't hardcode date, number, or currency formatting assumptions,
> since retrofitting that later into a system that assumed one locale everywhere is a much bigger
> job than designing for it from the start, even if there's no international launch planned yet."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §38 (Structured Data Formats: CSV, Excel, JSON,
XML & ZIP) chapter (currency/decimal handling patterns).

---
