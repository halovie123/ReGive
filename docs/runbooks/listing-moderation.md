# Listing moderation runbook

How ReGive screens new listings, what each outcome means for the donor, and
what an operator can do about it **before the admin tools in Plan 5 exist**.
Companion code: `apps/api/src/modules/listings/listing-risk.ts` (the rules)
and `listing-risk.spec.ts` (the cases they must and must not catch).

## 1. What happens when a donor presses "Đăng tặng"

The API screens the title, description and defects in the same transaction
as the publish, and the listing lands in one of three places:

| Level | New status | Visible in Khám phá? | What happens next |
| --- | --- | --- | --- |
| LOW | `PUBLISHED` | Yes, for 30 days | Nothing. Expires on its own. |
| MEDIUM | `PENDING_REVIEW` | No | The donor can edit it; a clean edit publishes it automatically. Otherwise it waits for an operator. |
| HIGH | `MODERATION_HIDDEN` | No | Only an operator can release it. The donor cannot edit or withdraw it. |

Editing a live listing screens it again. A safe edit keeps the original
publish and expiry dates, so editing cannot bump a listing up the feed.

Every screening is stored in `listing_risk_assessments` (level and reason
codes), including the ones that came back LOW, so you can see the history
of a listing after edits.

Nothing is ever deleted by screening. A false positive costs the donor a
delay, never the listing.

## 2. Reason codes

| Code | Level | Triggered by | Usual right answer |
| --- | --- | --- | --- |
| `BLOCKED_MEDICINE` | HIGH | "thuốc", or unaccented phrases such as "tang thuoc", "thuoc bo" | Keep hidden, unless it is clearly an object (a medicine cabinet slipped through) |
| `BLOCKED_MONEY` | HIGH | "tiền mặt", "tặng tiền", "cho tiền", "lì xì" | Keep hidden |
| `BLOCKED_FOOD` | HIGH | "thực phẩm", "đồ ăn", "thức ăn", "sữa tươi", "thịt", "hải sản", "rau củ", "trái cây", "hoa quả" | Keep hidden, unless the words describe an object (e.g. "hộp đựng thực phẩm" — a food container) |
| `BLOCKED_DANGEROUS` | HIGH | "súng", "đạn", "vũ khí", "thuốc nổ", "pháo", "xăng", "bình gas", "dao găm", "hóa chất" | Keep hidden, unless it is a toy or a description slip |
| `BLOCKED_ILLEGAL` | HIGH | "ma túy", "cần sa", "thuốc lắc", "hàng lậu" | Keep hidden. Consider suspending the account. |
| `CONTACT_PHONE` | MEDIUM | A Vietnamese phone number (`0…` or `+84…`, spaces/dots allowed) | Ask the donor to remove it; the in-app chat (Plan 3) is the contact channel |
| `CONTACT_EMAIL` | MEDIUM | An email address | Same as phone |
| `CONTACT_LINK` | MEDIUM | `http…`, `www.…`, or a bare domain such as `zalo.me/…` | Same as phone |
| `SALE_TERMS` | MEDIUM | A price ("200k", "50.000đ", "1 triệu") or "thanh lý", "giá bán", "bán lại", "cần bán", "pass lại" | ReGive is for giving. Ask the donor to remove the price, or reject if it is a sale. |

The donor is told what the status means in general terms (see
`LISTING_STATUS_HELP` in `apps/web/src/lib/labels.ts`) but never which rule
fired: telling someone exactly what the filter matched is how it gets
evaded.

Known safe phrases the screen lets through on purpose: "tủ thuốc"
(medicine cabinet), "xăng đan" (sandals). Single words are matched with
accents only, because without accents "thuộc" (belongs to) becomes "thuoc".
To add a rule or an exception, change `listing-risk.ts` **and** add the
case to `listing-risk.spec.ts`, including at least one ordinary listing it
must not catch.

## 3. Operator actions until Plan 5

There is no admin screen yet and nobody is notified when a listing is held.
**Check the queue at least once a day.** Run these in the Supabase SQL
editor for the production project. Each statement touches one listing by
id; copy the id from the queue query.

### See the queue

```sql
SELECT l.id, l.status, l.title, l.updated_at,
       a.level, a.reasons
FROM listings l
JOIN LATERAL (
  SELECT level, reasons FROM listing_risk_assessments
  WHERE listing_id = l.id
  ORDER BY created_at DESC LIMIT 1
) a ON true
WHERE l.status IN ('PENDING_REVIEW', 'MODERATION_HIDDEN')
ORDER BY l.updated_at;
```

Read the listing itself before deciding:

```sql
SELECT title, description, defects, category, area_code
FROM listings WHERE id = '<listing id>';
```

### Approve (false positive)

Publishes it for 30 days, or restores its original dates if it had been
published before. The `listings_published_dates_check` constraint refuses
a `PUBLISHED` row without dates, so do not drop the two `COALESCE` lines.

```sql
UPDATE listings
SET status = 'PUBLISHED',
    published_at = COALESCE(published_at, now()),
    expires_at = COALESCE(expires_at, now() + interval '30 days'),
    updated_at = now()
WHERE id = '<listing id>'
  AND status IN ('PENDING_REVIEW', 'MODERATION_HIDDEN');
```

This bypasses the API's transition rules (the API never moves a hidden
listing back to published). That is intended, and it is why only an
operator does it. If the row's `expires_at` is already in the past, the
listing stays out of discovery; it has expired and should not be revived.

### Reject

Leave a `MODERATION_HIDDEN` listing as it is: the row is the evidence a
report or appeal will need in Plan 5. For a `PENDING_REVIEW` listing you
are rejecting, move it to hidden so the donor cannot republish it by
editing:

```sql
UPDATE listings
SET status = 'MODERATION_HIDDEN', updated_at = now()
WHERE id = '<listing id>' AND status = 'PENDING_REVIEW';
```

### Suspend a member

Suspension takes all of their listings out of discovery at once (discovery
only shows listings of `ACTIVE` owners) and blocks every API call they make.

```sql
UPDATE users SET status = 'SUSPENDED', updated_at = now()
WHERE id = (SELECT owner_id FROM listings WHERE id = '<listing id>');
```

## 4. Expiry

There is no background job (no Redis on the free tier). A listing is out of
discovery the moment `expires_at` passes, because every query checks it.
Discovery also rewrites due rows to `EXPIRED` at most every ten minutes;
that is bookkeeping only, and nothing depends on it running.
