## §104. Auth & Access Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "User gets 401 vs 403 and nobody knows why."

- **What's actually going on**: 401 means the request wasn't authenticated at all (missing or
  invalid credentials); 403 means the identity is known but lacks permission for this specific
  action/resource. Code that returns the wrong one for the situation makes debugging genuinely
  harder for whoever hits it next.
- **The fix**: Audit auth middleware to confirm it returns 401 specifically for
  missing/invalid/expired credentials, and 403 specifically for a known identity without
  sufficient permission.
- **What to say**: "401 is 'who are you,' 403 is 'I know who you are and the answer is no' — I'd
  check which one the code is actually returning for this case."
- **See also**: §2, §24, §59.

### "Auth token works in one environment but not another."

- **What's actually going on**: Usually a signing key/secret mismatch between environments, a
  different token issuer/audience configuration, or the token was issued for one environment's
  auth provider and is being validated against another's.
- **The fix**: Verify the signing key, issuer, and audience configuration match between the
  environment that issued the token and the one validating it.
- **What to say**: "I'd check whether the signing key and issuer/audience configuration actually
  match between the two environments before assuming it's an application bug."
- **See also**: §24, §25.

---
