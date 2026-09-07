import type { OnixSourcePath } from '../../types';

/**
 * Where a source fact came from, said the same way everywhere.
 *
 * A leaf on purpose. Both the release contract and the normalised-source layer need to name a
 * position in the message, and neither should have to import the other to do it.
 */

/** The root of every source path. */
export const ONIX_MESSAGE_PATH: OnixSourcePath = 'ONIXMessage';

/**
 * The path of a child element.
 *
 * `occurrence` is given for a repeatable element and numbers it from one in source order. It is
 * given even when the element occurs once, so that a singleton and a one-element array — which
 * the runtime distinguishes and the standard does not — produce the same path.
 */
export const childPath = (parent: OnixSourcePath, element: string, occurrence?: number): OnixSourcePath =>
  occurrence === undefined ? `${parent}/${element}` : `${parent}/${element}[${occurrence}]`;
