import {
  MAX_AREAS as CONTRACT_MAX_AREAS,
  MIN_AREAS as CONTRACT_MIN_AREAS,
  UpdateAreasSchema,
} from '@buy-nothing/contracts';
import {
  MAX_AREAS as SERVICE_MAX_AREAS,
  MIN_AREAS as SERVICE_MIN_AREAS,
} from './../src/modules/profiles/profiles.service';

/**
 * ProfilesService re-declares the area limits because its unit tests cannot
 * load a value import from contracts (see the comment above the constants).
 * Lives in the e2e suite because only this jest config can load both sides.
 * Without it, raising the limit in one place silently leaves the other
 * rejecting — or accepting — what the form allows.
 */
describe('area limits', () => {
  it('match between the contract and the service backstop', () => {
    expect(SERVICE_MIN_AREAS).toBe(CONTRACT_MIN_AREAS);
    expect(SERVICE_MAX_AREAS).toBe(CONTRACT_MAX_AREAS);
  });

  it('are what the contract schema actually enforces', () => {
    const areas = (count: number) => ({
      areas: ['QUAN_1', 'QUAN_3', 'QUAN_4', 'QUAN_5', 'QUAN_6'].slice(0, count),
    });

    expect(UpdateAreasSchema.safeParse(areas(CONTRACT_MAX_AREAS)).success).toBe(
      true,
    );
    expect(
      UpdateAreasSchema.safeParse(areas(CONTRACT_MAX_AREAS + 1)).success,
    ).toBe(false);
    expect(
      UpdateAreasSchema.safeParse(areas(CONTRACT_MIN_AREAS - 1)).success,
    ).toBe(false);
  });
});
